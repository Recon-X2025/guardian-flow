/**
 * @file server/services/taxEngine.js
 * @description Tax Engine — Avalara AvaTax and TaxJar integration with local fallback.
 *
 * Provider selection (via TAX_PROVIDER env var)
 * ─────────────────────────────────────────────
 *  avalara  — Avalara AvaTax REST API (requires AVALARA_ACCOUNT_ID + AVALARA_LICENSE_KEY)
 *  taxjar   — TaxJar REST API (requires TAXJAR_API_KEY)
 *  local    — Heuristic flat-rate fallback based on jurisdiction country/state
 *
 * When TAX_PROVIDER is not set or credentials are missing the service falls back
 * to the 'local' provider automatically.
 *
 * Exported functions
 * ──────────────────
 *  calculateTax(params)   — returns { tax_amount, tax_rate, breakdown }
 *  validateAddress(addr)  — returns { valid, normalised }
 */

import logger from '../utils/logger.js';

// ── Local heuristic rates (state/country codes → approximate rate) ─────────────

const LOCAL_RATES = {
  // US states (approximate combined state+local average)
  US: {
    CA: 0.0879, NY: 0.0877, TX: 0.0819, FL: 0.0701, IL: 0.0873, WA: 0.0922,
    OR: 0.0000, MT: 0.0000, NH: 0.0000, DE: 0.0000,
    DEFAULT: 0.0650,
  },
  // Country-level VAT fallbacks
  GB: 0.20, AU: 0.10, CA: 0.05, DE: 0.19, FR: 0.20, SG: 0.09,
  NZ: 0.15, IN: 0.18, JP: 0.10, DEFAULT: 0.10,
};

function getLocalRate(country, state) {
  if (country === 'US') {
    const stateRates = LOCAL_RATES.US;
    return stateRates[state?.toUpperCase()] ?? stateRates.DEFAULT;
  }
  return LOCAL_RATES[country?.toUpperCase()] ?? LOCAL_RATES.DEFAULT;
}

// ── Provider: Avalara AvaTax ──────────────────────────────────────────────────

async function calculateWithAvalara(params) {
  const { AVALARA_ACCOUNT_ID, AVALARA_LICENSE_KEY, AVALARA_ENV = 'sandbox' } = process.env;
  const base = AVALARA_ENV === 'production'
    ? 'https://rest.avatax.com'
    : 'https://sandbox-rest.avatax.com';

  const auth = Buffer.from(`${AVALARA_ACCOUNT_ID}:${AVALARA_LICENSE_KEY}`).toString('base64');

  const body = {
    type: 'SalesInvoice',
    companyCode: params.company_code ?? 'DEFAULT',
    date: params.date ?? new Date().toISOString().slice(0, 10),
    customerCode: params.customer_code ?? 'CUST',
    addresses: {
      shipTo: {
        line1: params.destination?.line1 ?? '',
        city: params.destination?.city ?? '',
        region: params.destination?.state ?? '',
        country: params.destination?.country ?? 'US',
        postalCode: params.destination?.zip ?? '',
      },
    },
    lines: (params.line_items ?? []).map((li, i) => ({
      number: String(i + 1),
      quantity: li.quantity ?? 1,
      amount: li.amount,
      itemCode: li.item_code ?? 'ITEM',
      description: li.description ?? '',
      taxCode: li.tax_code ?? 'P0000000',
    })),
    commit: false,
    currencyCode: params.currency ?? 'USD',
  };

  const response = await fetch(`${base}/api/v2/transactions/create`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Avalara HTTP ${response.status}: ${errText.slice(0, 200)}`);
  }
  const json = await response.json();
  const taxAmount = json.totalTax ?? 0;
  const subtotal = json.totalAmount ?? params.subtotal ?? 0;
  return {
    tax_amount: Math.round(taxAmount * 100) / 100,
    tax_rate: subtotal > 0 ? Math.round((taxAmount / subtotal) * 10000) / 10000 : 0,
    provider: 'avalara',
    transaction_id: json.id,
    breakdown: (json.lines ?? []).flatMap(l => (l.details ?? []).map(d => ({
      jurisdiction: d.jurisdictionType,
      name: d.jurisdictionDisplayName ?? d.taxName,
      rate: d.rate ?? 0,
      tax: d.tax ?? 0,
    }))),
  };
}

// ── Provider: TaxJar ──────────────────────────────────────────────────────────

async function calculateWithTaxJar(params) {
  const { TAXJAR_API_KEY, TAXJAR_ENV = 'sandbox' } = process.env;
  const base = TAXJAR_ENV === 'production'
    ? 'https://api.taxjar.com/v2'
    : 'https://api.sandbox.taxjar.com/v2';

  const body = {
    to_country: params.destination?.country ?? 'US',
    to_state: params.destination?.state ?? '',
    to_city: params.destination?.city ?? '',
    to_zip: params.destination?.zip ?? '',
    amount: params.subtotal ?? 0,
    shipping: params.shipping ?? 0,
    line_items: (params.line_items ?? []).map((li, i) => ({
      id: String(i + 1),
      quantity: li.quantity ?? 1,
      unit_price: li.unit_price ?? li.amount,
      product_identifier: li.item_code ?? 'ITEM',
      description: li.description ?? '',
      product_tax_code: li.tax_code ?? '',
    })),
  };

  const response = await fetch(`${base}/taxes`, {
    method: 'POST',
    headers: { Authorization: `Token token="${TAXJAR_API_KEY}"`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`TaxJar HTTP ${response.status}: ${errText.slice(0, 200)}`);
  }
  const json = await response.json();
  const td = json.tax ?? {};
  return {
    tax_amount: Math.round((td.amount_to_collect ?? 0) * 100) / 100,
    tax_rate: td.rate ?? 0,
    provider: 'taxjar',
    breakdown: {
      country_rate: td.breakdown?.country_tax_rate ?? 0,
      state_rate: td.breakdown?.state_tax_rate ?? 0,
      county_rate: td.breakdown?.county_tax_rate ?? 0,
      city_rate: td.breakdown?.city_tax_rate ?? 0,
      special_rate: td.breakdown?.special_district_tax_rate ?? 0,
    },
  };
}

// ── Provider: Local heuristic ─────────────────────────────────────────────────

function calculateWithLocal(params) {
  const rate = getLocalRate(
    params.destination?.country ?? 'US',
    params.destination?.state,
  );
  const subtotal = params.subtotal ?? (params.line_items ?? []).reduce((s, li) => s + (li.amount ?? 0), 0);
  const taxAmount = Math.round(subtotal * rate * 100) / 100;
  return {
    tax_amount: taxAmount,
    tax_rate: rate,
    provider: 'local',
    breakdown: [{
      jurisdiction: 'Local Heuristic',
      name: `${params.destination?.country ?? 'US'}${params.destination?.state ? '-' + params.destination.state : ''}`,
      rate,
      tax: taxAmount,
    }],
  };
}

// ── Main exported function ────────────────────────────────────────────────────

/**
 * Calculate tax for a transaction.
 *
 * @param {object} params
 * @param {number} params.subtotal          — taxable subtotal (required)
 * @param {string} [params.currency]        — ISO 4217 currency code
 * @param {object} [params.destination]     — { line1, city, state, country, zip }
 * @param {object} [params.origin]          — { line1, city, state, country, zip }
 * @param {Array}  [params.line_items]      — [{ amount, quantity, item_code, description, tax_code }]
 * @param {number} [params.shipping]        — shipping amount
 * @param {string} [params.customer_code]   — external customer identifier
 * @param {string} [params.company_code]    — Avalara company code
 * @param {string} [params.date]            — transaction date YYYY-MM-DD
 * @returns {Promise<{ tax_amount, tax_rate, provider, breakdown }>}
 */
export async function calculateTax(params) {
  const provider = (process.env.TAX_PROVIDER ?? 'local').toLowerCase();

  try {
    if (provider === 'avalara' && process.env.AVALARA_ACCOUNT_ID && process.env.AVALARA_LICENSE_KEY) {
      return await calculateWithAvalara(params);
    }
    if (provider === 'taxjar' && process.env.TAXJAR_API_KEY) {
      return await calculateWithTaxJar(params);
    }
  } catch (err) {
    logger.warn('taxEngine: provider error, falling back to local', { provider, error: err.message });
  }

  // Always fall back to local heuristic
  return calculateWithLocal(params);
}

/**
 * Validate and normalise a shipping address using Avalara.
 * Falls back to returning the address as-is when Avalara is not configured.
 *
 * @param {object} address — { line1, city, state, country, zip }
 * @returns {Promise<{ valid: boolean, normalised: object, messages: string[] }>}
 */
export async function validateAddress(address) {
  if (process.env.AVALARA_ACCOUNT_ID && process.env.AVALARA_LICENSE_KEY) {
    try {
      const env = process.env.AVALARA_ENV ?? 'sandbox';
      const base = env === 'production' ? 'https://rest.avatax.com' : 'https://sandbox-rest.avatax.com';
      const auth = Buffer.from(`${process.env.AVALARA_ACCOUNT_ID}:${process.env.AVALARA_LICENSE_KEY}`).toString('base64');
      const qs = new URLSearchParams({
        line1: address.line1 ?? '',
        city: address.city ?? '',
        region: address.state ?? '',
        country: address.country ?? 'US',
        postalCode: address.zip ?? '',
      });
      const response = await fetch(`${base}/api/v2/addresses/resolve?${qs}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (response.ok) {
        const json = await response.json();
        return {
          valid: (json.messages ?? []).every(m => m.severity !== 'Error'),
          normalised: json.validatedAddresses?.[0] ?? address,
          messages: (json.messages ?? []).map(m => m.details),
        };
      }
    } catch (err) {
      logger.warn('taxEngine: address validation error', { error: err.message });
    }
  }
  return { valid: true, normalised: address, messages: [] };
}
