// Comprehensive Invoice Types for GST-compliant invoicing

export type InvoiceType = 'TAX_INVOICE' | 'BILL_OF_SUPPLY' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
export type CustomerType = 'B2B' | 'B2C';
export type TaxType = 'INTRA_STATE' | 'INTER_STATE';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
export type PaymentMethod = 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CASH' | 'CARD' | 'ONLINE';
export type AttachmentType = 'PDF' | 'IMAGE' | 'OTHER';
export type PaymentTerms = 'NET15' | 'NET30' | 'NET45' | 'NET60' | 'DUE_ON_RECEIPT' | 'CUSTOM';

export interface SupplierContact {
  email: string;
  phone: string;
}

export interface SupplierBankDetails {
  bank_name: string;
  account_number: string;
  ifsc: string;
  upi_id: string;
}

export interface Supplier {
  business_name: string;
  trade_name: string;
  logo_url: string;
  address: string;
  gstin: string;
  pan: string;
  cin: string;
  msme_registration_number: string;
  state: string;
  state_code: string;
  contact: SupplierContact;
  bank_details: SupplierBankDetails;
}

export interface CustomerContact {
  email: string;
  phone: string;
}

export interface Customer {
  name: string;
  billing_address: string;
  shipping_address: string;
  gstin: string;
  state: string;
  state_code: string;
  contact: CustomerContact;
  customer_type: CustomerType;
  customer_reference: string;
}

export interface ExportDetails {
  destination_country: string;
  currency: string;
  lutr_or_bond_number: string;
  shipping_bill_number: string;
}

export interface InvoiceDetails {
  type: InvoiceType;
  number: string;
  date: string;
  version: number;
  original_invoice_number?: string;
  po_number: string;
  job_card_number: string;
  project_code: string;
  department: string;
  reverse_charge: boolean;
  is_export: boolean;
  export?: ExportDetails;
  due_date: string;
  payment_terms: PaymentTerms;
  notes: string;
  terms_and_conditions: string;
  currency: string;
  exchange_rate: number;
  eway_bill_required: boolean;
}

export interface ItemTax {
  tax_type: TaxType;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cess_rate: number;
}

export interface InvoiceItem {
  line_number: number;
  name: string;
  description: string;
  hsn_sac: string;
  sac_is_service: boolean;
  quantity: number;
  unit: string;
  rate: number;
  discount_amount: number;
  discount_percent: number;
  taxable_value: number;
  tax: ItemTax;
  warranty_months: number;
  supply_start_date: string;
  supply_end_date: string;
  attachments: string[];
}

export interface TaxSummary {
  total_taxable_value: number;
  total_discount: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  cess_total: number;
  adjustments: number;
  round_off: number;
  total_invoice_value: number;
  amount_in_words: string;
}

export interface PaymentMethodDetails {
  bank_name: string;
  account_number: string;
  ifsc: string;
  upi_id: string;
  upi_qr_url: string;
  payment_link: string;
}

export interface PaymentTransaction {
  transaction_id: string;
  date: string;
  amount: number;
  method: string;
  reference: string;
}

export interface TDSDetails {
  applicable: boolean;
  tds_rate: number;
  tds_amount: number;
}

export interface Payment {
  status: PaymentStatus;
  method: PaymentMethod;
  method_details: PaymentMethodDetails;
  transactions: PaymentTransaction[];
  tds: TDSDetails;
}

export interface Transport {
  eway_bill: string;
  vehicle_number: string;
  shipping_partner: string;
  dispatch_through: string;
  delivery_date: string;
}

export interface Signatory {
  name: string;
  designation: string;
  digital_signature: string;
  signed_at: string;
}

export interface InvoiceAttachment {
  id: string;
  type: AttachmentType;
  filename: string;
  url: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface StatusHistoryEntry {
  status: string;
  changed_by: string;
  changed_at: string;
}

export interface InvoiceMetadata {
  status_history: StatusHistoryEntry[];
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

export interface InvoiceCustomFields {
  [key: string]: string;
}

export interface Invoice {
  id?: string;
  tenant_id?: string;
  supplier: Supplier;
  customer: Customer;
  invoice: InvoiceDetails;
  items: InvoiceItem[];
  tax_summary: TaxSummary;
  payment: Payment;
  transport?: Transport;
  signatory?: Signatory;
  attachments: InvoiceAttachment[];
  custom_fields?: InvoiceCustomFields;
  metadata: InvoiceMetadata;
}

// Helper types for database storage (JSONB columns)
export interface InvoiceDocument extends Omit<Invoice, 'id' | 'tenant_id' | 'metadata'> {
  // This represents the full invoice document stored in JSONB
}

// Database row type (what gets stored in the invoices table)
export interface InvoiceRow {
  id: string;
  tenant_id: string;
  invoice_number: string;
  invoice_data: InvoiceDocument; // JSONB column with full invoice data
  status: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

