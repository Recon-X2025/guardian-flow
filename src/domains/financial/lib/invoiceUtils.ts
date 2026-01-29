// Utility functions for invoice data handling

import { Invoice, InvoiceDocument, InvoiceRow } from '@/domains/financial/types/invoice';

/**
 * Converts a database invoice row to the comprehensive Invoice type
 */
export function convertInvoiceRowToInvoice(row: any): Invoice {
  // If invoice_data exists, use it as the base
  if (row.invoice_data && typeof row.invoice_data === 'object') {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      ...row.invoice_data,
      metadata: {
        status_history: row.status_history || [],
        created_by: row.created_by || '',
        created_at: row.created_at || new Date().toISOString(),
        updated_by: row.updated_by || '',
        updated_at: row.updated_at || new Date().toISOString(),
      },
    };
  }

  // Otherwise, construct from legacy fields
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    supplier: row.supplier_data || {
      business_name: '',
      trade_name: '',
      logo_url: '',
      address: '',
      gstin: '',
      pan: '',
      cin: '',
      msme_registration_number: '',
      state: '',
      state_code: '',
      contact: { email: '', phone: '' },
      bank_details: {
        bank_name: '',
        account_number: '',
        ifsc: '',
        upi_id: '',
      },
    },
    customer: row.customer_data || {
      name: '',
      billing_address: '',
      shipping_address: '',
      gstin: '',
      state: '',
      state_code: '',
      contact: { email: '', phone: '' },
      customer_type: 'B2C',
      customer_reference: '',
    },
    invoice: {
      type: row.invoice_type || 'TAX_INVOICE',
      number: row.invoice_number || '',
      date: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
      version: 1,
      po_number: row.po_number || '',
      job_card_number: row.job_card_number || '',
      project_code: row.project_code || '',
      department: row.department || '',
      reverse_charge: row.reverse_charge || false,
      is_export: row.is_export || false,
      due_date: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : '',
      payment_terms: (row.payment_terms as any) || 'NET30',
      notes: row.notes || '',
      terms_and_conditions: row.terms_and_conditions || '',
      currency: row.currency || 'INR',
      exchange_rate: Number(row.exchange_rate) || 1.0,
      eway_bill_required: row.eway_bill_required || false,
    },
    items: row.line_items || [],
    tax_summary: row.tax_summary_data || {
      total_taxable_value: Number(row.subtotal) || 0,
      total_discount: 0,
      cgst_total: 0,
      sgst_total: 0,
      igst_total: 0,
      cess_total: 0,
      adjustments: Number(row.penalties) || 0,
      round_off: 0,
      total_invoice_value: Number(row.total_amount) || 0,
      amount_in_words: '',
    },
    payment: row.payment_data || {
      status: row.payment_status === 'paid' ? 'PAID' : 
              row.payment_status === 'partial' ? 'PARTIALLY_PAID' :
              row.payment_status === 'overdue' ? 'OVERDUE' : 'UNPAID',
      method: 'BANK_TRANSFER',
      method_details: {
        bank_name: '',
        account_number: '',
        ifsc: '',
        upi_id: '',
        upi_qr_url: '',
        payment_link: '',
      },
      transactions: [],
      tds: {
        applicable: false,
        tds_rate: 0,
        tds_amount: 0,
      },
    },
    transport: row.transport_data,
    signatory: row.signatory_data,
    attachments: row.attachments || [],
    custom_fields: row.custom_fields || {},
    metadata: {
      status_history: row.status_history || [],
      created_by: row.created_by || '',
      created_at: row.created_at || new Date().toISOString(),
      updated_by: row.updated_by || '',
      updated_at: row.updated_at || new Date().toISOString(),
    },
  };
}

/**
 * Converts an Invoice type to database row format
 */
export function convertInvoiceToRow(invoice: Invoice): Partial<InvoiceRow> {
  const { id, tenant_id, metadata, ...invoiceData } = invoice;
  
  return {
    id: id || '',
    tenant_id: tenant_id || '',
    invoice_number: invoice.invoice.number,
    invoice_data: invoiceData as InvoiceDocument,
    status: invoice.payment.status.toLowerCase(),
    created_at: metadata.created_at,
    updated_at: metadata.updated_at,
    created_by: metadata.created_by,
    updated_by: metadata.updated_by,
  };
}

/**
 * Formats amount in words (Indian numbering system)
 */
export function numberToWords(amount: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];
  
  const scales = ['', 'Thousand', 'Lakh', 'Crore'];
  
  function convertHundreds(num: number): string {
    let result = '';
    
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    
    if (num > 0) {
      result += ones[num] + ' ';
    }
    
    return result.trim();
  }
  
  if (amount === 0) return 'Zero Rupees Only';
  
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  let words = '';
  
  if (rupees > 0) {
    // Convert rupees
    let num = rupees;
    let scaleIndex = 0;
    const parts: string[] = [];
    
    while (num > 0) {
      const part = num % 1000;
      if (part > 0) {
        parts.unshift(convertHundreds(part) + (scaleIndex > 0 ? ' ' + scales[scaleIndex] : ''));
      }
      num = Math.floor(num / 1000);
      scaleIndex++;
    }
    
    words = parts.join(' ') + ' Rupees';
  }
  
  if (paise > 0) {
    words += (words ? ' and ' : '') + convertHundreds(paise) + ' Paise';
  }
  
  return words + ' Only';
}

/**
 * Calculates tax breakdown for an item
 */
export function calculateItemTax(
  taxableValue: number,
  taxType: 'INTRA_STATE' | 'INTER_STATE',
  cgstRate: number,
  sgstRate: number,
  igstRate: number,
  cessRate: number
) {
  if (taxType === 'INTRA_STATE') {
    const cgst = (taxableValue * cgstRate) / 100;
    const sgst = (taxableValue * sgstRate) / 100;
    const cess = (taxableValue * cessRate) / 100;
    return {
      cgst,
      sgst,
      igst: 0,
      cess,
      total: cgst + sgst + cess,
    };
  } else {
    const igst = (taxableValue * igstRate) / 100;
    const cess = (taxableValue * cessRate) / 100;
    return {
      cgst: 0,
      sgst: 0,
      igst,
      cess,
      total: igst + cess,
    };
  }
}

/**
 * Validates GSTIN format
 */
export function validateGSTIN(gstin: string): boolean {
  if (!gstin) return false;
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
}

/**
 * Validates PAN format
 */
export function validatePAN(pan: string): boolean {
  if (!pan) return false;
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
}

