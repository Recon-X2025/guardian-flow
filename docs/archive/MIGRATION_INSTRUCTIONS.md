# Invoice Template Migration Instructions

## Step 1: Run the Database Migration

The migration file has been created at:
```
server/scripts/migrations/comprehensive_invoice_template.js
```

### Option A: Using Node.js Migration Runner (Recommended)

```bash
# Navigate to your project root
cd /Users/kathikiyer/Documents/GitHub/GuardianFlow

# Apply the migration
cd server && npm run migrate
```

### Option B: MongoDB Atlas UI

1. Go to MongoDB Atlas UI → Database → Collections
2. Apply the migration script manually

### Option C: Using mongosh

If you have direct database access:

```bash
mongosh guardianflow --file server/scripts/migrations/comprehensive_invoice_template.js
```

## Step 2: Verify Migration

After running the migration, verify that the new tables were created:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'invoice_line_items',
  'invoice_attachments',
  'invoice_status_history',
  'invoice_payment_transactions'
);

-- Check if new columns were added to invoices table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN (
  'invoice_data',
  'supplier_data',
  'customer_data',
  'tax_summary_data',
  'payment_data'
);
```

## Step 3: Test the Implementation

### 3.1 Create a New Invoice

1. Navigate to the Invoicing page in your application
2. Click "Create Invoice" button
3. Fill in the invoice form:
   - **Basic Info**: Invoice number, date, type, PO number
   - **Supplier**: Business name, GSTIN, address, contact details
   - **Customer**: Customer name, billing address, GSTIN
   - **Items**: Add line items with HSN/SAC codes, quantities, rates, tax rates
   - **Payment**: Payment status and method
4. Click "Create Invoice"

### 3.2 View an Invoice

1. Click "View Details" on any invoice
2. The system will automatically use `ComprehensiveInvoiceDetailDialog` if the invoice has comprehensive data
3. Explore the different tabs:
   - **Overview**: Supplier and customer information
   - **Items**: Line items with HSN/SAC codes
   - **Tax Summary**: Complete tax breakdown
   - **Payment**: Payment status and transactions
   - **Details**: Additional invoice details

### 3.3 Test PDF Generation

1. Open any invoice in the detail dialog
2. Click "Download Invoice PDF"
3. Verify the PDF contains all invoice information

## Step 4: Integration Points

### Using the Invoice Type

```typescript
import { Invoice } from '@/types/invoice';

const invoice: Invoice = {
  supplier: { /* ... */ },
  customer: { /* ... */ },
  invoice: { /* ... */ },
  items: [ /* ... */ ],
  tax_summary: { /* ... */ },
  payment: { /* ... */ },
  // ...
};
```

### Using Utility Functions

```typescript
import { 
  convertInvoiceRowToInvoice, 
  convertInvoiceToRow,
  numberToWords,
  calculateItemTax 
} from '@/lib/invoiceUtils';

// Convert database row to Invoice type
const invoice = convertInvoiceRowToInvoice(dbRow);

// Convert Invoice to database format
const dbRow = convertInvoiceToRow(invoice);

// Convert amount to words
const words = numberToWords(1234.56); // "One Thousand Two Hundred Thirty Four Rupees and Fifty Six Paise Only"

// Calculate tax for an item
const tax = calculateItemTax(
  1000,           // taxable value
  'INTRA_STATE',  // tax type
  9,              // CGST rate
  9,              // SGST rate
  0,              // IGST rate
  0               // CESS rate
);
```

## Troubleshooting

### Migration Fails

If the migration fails, check:

1. **Duplicate Types**: Some enum types might already exist. The migration uses `DO $$ BEGIN ... EXCEPTION` blocks to handle this gracefully.

2. **Missing Dependencies**: Ensure the `tenants` collection exists if you're using tenant isolation.

3. **Permissions**: Ensure the database user has CREATE TABLE and ALTER TABLE permissions.

### Component Not Loading

1. Check browser console for errors
2. Verify all imports are correct
3. Ensure all UI components exist in `src/components/ui/`

### Invoice Not Saving

1. Check browser console for API errors
2. Verify tenant isolation allows the current user to insert/update
3. Check that required fields are filled (supplier name, customer name, at least one line item)

## Next Steps

After successful migration:

1. **Backfill Existing Invoices**: Optionally migrate existing invoices to the new format
2. **Configure Default Supplier**: Set up default supplier information in settings
3. **Tax Rate Configuration**: Create a tax rate configuration system
4. **E-Way Bill Integration**: Integrate with e-way bill generation APIs
5. **GST Reporting**: Build GST report generation features

## Support

For issues or questions:
- Check the implementation documentation: `INVOICE_TEMPLATE_IMPLEMENTATION.md`
- Review the TypeScript types: `src/types/invoice.ts`
- Examine the utility functions: `src/lib/invoiceUtils.ts`

