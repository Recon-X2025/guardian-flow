/**
 * @file server/routes/e-invoice.js
 * @description Global e-Invoicing — Sprint 38.
 *
 * NOTE: The XML/CFDI/FatturaPA outputs are simplified skeleton formats for
 * integration scaffolding. They are NOT fully validated against official
 * government schemas and must not be submitted to tax authorities as-is.
 *
 * Routes
 * ------
 * POST /api/finance/invoices/:id/e-invoice — generate e-invoice document
 */

import express from 'express';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

function generatePEPPOL(invoice) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- PEPPOL BIS Billing 3.0 / UBL 2.1 skeleton (not fully validated) -->
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ID>${invoice.invoiceNo || invoice.id}</cbc:ID>
  <cbc:IssueDate>${(invoice.invoiceDate || new Date().toISOString()).slice(0, 10)}</cbc:IssueDate>
  <cbc:DueDate>${(invoice.dueDate || '').slice(0, 10)}</cbc:DueDate>
  <cbc:DocumentCurrencyCode>${invoice.currency || 'USD'}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party><cbc:Name>${invoice.supplierName || 'Supplier'}</cbc:Name></cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party><cbc:Name>${invoice.customerName || 'Customer'}</cbc:Name></cac:Party>
  </cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency || 'USD'}">${invoice.subtotal || invoice.amount || 0}</cbc:TaxExclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency || 'USD'}">${invoice.amount || invoice.totalAmount || 0}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
}

function generateCFDI(invoice) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Mexico CFDI 4.0 skeleton (not fully validated) -->
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  Version="4.0"
  Folio="${invoice.invoiceNo || invoice.id}"
  Fecha="${(invoice.invoiceDate || new Date().toISOString()).replace('Z', '')}"
  Moneda="${invoice.currency || 'MXN'}"
  Total="${invoice.amount || invoice.totalAmount || 0}"
  TipoDeComprobante="I">
  <cfdi:Emisor Nombre="${invoice.supplierName || 'Emisor'}" RegimenFiscal="601"/>
  <cfdi:Receptor Nombre="${invoice.customerName || 'Receptor'}" UsoCFDI="G03"/>
  <cfdi:Conceptos>
    <cfdi:Concepto Descripcion="${invoice.description || 'Servicios'}"
      Importe="${invoice.subtotal || invoice.amount || 0}"
      ValorUnitario="${invoice.subtotal || invoice.amount || 0}"
      Cantidad="1"/>
  </cfdi:Conceptos>
</cfdi:Comprobante>`;
}

function generateFatturaPA(invoice) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Italy FatturaPA 1.3 skeleton (not fully validated) -->
<FatturaElettronica versione="FPR12"
  xmlns="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.3">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>00000000000</IdCodice></IdTrasmittente>
      <ProgressivoInvio>1</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>0000000</CodiceDestinatario>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <Denominazione>${invoice.supplierName || 'Fornitore'}</Denominazione>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <Denominazione>${invoice.customerName || 'Cliente'}</Denominazione>
      </DatiAnagrafici>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>${invoice.currency || 'EUR'}</Divisa>
        <Data>${(invoice.invoiceDate || new Date().toISOString()).slice(0, 10)}</Data>
        <Numero>${invoice.invoiceNo || invoice.id}</Numero>
        <ImportoTotaleDocumento>${invoice.amount || invoice.totalAmount || 0}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
  </FatturaElettronicaBody>
</FatturaElettronica>`;
}

function generateJSONLD(invoice, countryCode) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Invoice',
    identifier: invoice.invoiceNo || invoice.id,
    issuedDate: (invoice.invoiceDate || new Date().toISOString()).slice(0, 10),
    paymentDueDate: (invoice.dueDate || '').slice(0, 10),
    totalPaymentDue: { '@type': 'PriceSpecification', price: invoice.amount || invoice.totalAmount || 0, priceCurrency: invoice.currency || 'USD' },
    provider: { '@type': 'Organization', name: invoice.supplierName || 'Supplier' },
    customer: { '@type': 'Organization', name: invoice.customerName || 'Customer' },
    countryCode,
  }, null, 2);
}

// ── POST /invoices/:id/e-invoice ──────────────────────────────────────────────

router.post('/invoices/:id/e-invoice', authenticateToken, async (req, res) => {
  try {
    const { countryCode = 'US' } = req.body;
    const tenantId = await resolveTenantId(req.user.id);
    const adapter  = await getAdapter();

    // Try to find invoice in invoices or ap_invoices collection
    let invoice = await adapter.findOne('invoices', { id: req.params.id, tenantId });
    if (!invoice) invoice = await adapter.findOne('ap_invoices', { id: req.params.id, tenantId });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const code = (countryCode || 'US').toUpperCase();
    let format, document;

    if (code === 'MX') {
      format   = 'CFDI';
      document = generateCFDI(invoice);
    } else if (code === 'IT') {
      format   = 'FatturaPA';
      document = generateFatturaPA(invoice);
    } else if (['US', 'CA', 'AU', 'NZ', 'SG', 'MY'].includes(code) || true) {
      // Default to PEPPOL for most countries; JSON-LD for unrecognised
      const peppolCountries = ['DE', 'FR', 'GB', 'NL', 'SE', 'NO', 'DK', 'FI', 'AU', 'NZ', 'SG', 'MY', 'US', 'CA', 'BE', 'AT', 'CH'];
      if (peppolCountries.includes(code) || code.length === 2) {
        format   = 'PEPPOL';
        document = generatePEPPOL(invoice);
      } else {
        format   = 'JSONLD';
        document = generateJSONLD(invoice, code);
      }
    }

    // Store on the invoice record
    const collection = invoice.vendorName ? 'ap_invoices' : 'invoices';
    await adapter.updateOne(collection, { id: req.params.id, tenantId }, {
      $set: {
        e_invoice_xml:    document,
        e_invoice_status: 'generated',
        e_invoice_format: format,
        updatedAt:        new Date().toISOString(),
      },
    });

    res.json({ format, document, invoiceId: req.params.id });
  } catch (err) {
    logger.error('eInvoice: generate error', { error: err.message });
    res.status(500).json({ error: 'Failed to generate e-invoice' });
  }
});

export default router;
