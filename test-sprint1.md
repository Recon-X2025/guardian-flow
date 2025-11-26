# Sprint 1 Testing Guide

## ✅ Database Migration Complete
- Payment status migration applied successfully
- `payment_status` enum created
- `payment_history` table created
- Database triggers configured

## Testing Checklist

### 1. Photo Validation Flow

**Test Steps:**
1. Navigate to Photo Capture page
2. Select a work order
3. Capture 4 photos (context_wide, pre_closeup, serial, replacement_part)
4. Verify:
   - ✅ Photos show validation status (loading → success/error)
   - ✅ Error messages display for invalid photos
   - ✅ Retry button appears for failed validations
   - ✅ Submit button enables when all 4 photos are captured
   - ✅ Validation results displayed after submission

**API Endpoint to Test:**
- `POST /api/functions/validate-photos`
- Request body:
  ```json
  {
    "woId": "work-order-id",
    "stage": "replacement",
    "images": [
      {
        "id": "photo_1",
        "role": "context_wide",
        "hash": "sha256-hash",
        "gps": {"lat": 37.7749, "lon": -122.4194},
        "captured_at": "2025-11-25T10:00:00Z",
        "filename": "photo1.jpg"
      },
      // ... 3 more photos
    ]
  }
  ```

**Expected Response:**
```json
{
  "photos_validated": true,
  "validation_id": "uuid",
  "woId": "work-order-id",
  "stage": "replacement",
  "images_count": 4,
  "validated_at": "2025-11-25T10:00:00Z",
  "validated_by": "user-id"
}
```

---

### 2. Payment Status Updates

**Test Steps:**

#### A. Update Payment Status via API
1. Create or select an invoice
2. Call payment status update endpoint:
   ```bash
   POST /api/payments/update-status
   Authorization: Bearer <token>
   {
     "invoiceId": "invoice-id",
     "paymentAmount": 100.00,
     "paymentMethod": "stripe",
     "paymentReference": "ch_1234567890",
     "paymentStatus": "paid",
     "notes": "Payment received via Stripe"
   }
   ```
3. Verify:
   - ✅ Payment history entry created
   - ✅ Invoice payment_status updated to "paid"
   - ✅ payment_amount updated
   - ✅ payment_received_at set

#### B. View Payment History
1. Navigate to Invoicing page
2. Click "View Details" on an invoice
3. Click "Payment History" tab
4. Verify:
   - ✅ Payment history entries displayed
   - ✅ Payment amounts, methods, and dates shown
   - ✅ Payment status badges displayed correctly

#### C. Payment Status Badges
1. Navigate to Invoicing page
2. Verify invoice list shows:
   - ✅ Payment status badge (pending/paid/partial/failed)
   - ✅ Payment amount displayed
   - ✅ Payment date displayed (if paid)

**API Endpoints to Test:**
- `POST /api/payments/update-status` - Update payment status
- `GET /api/payments/history/:invoiceId` - Get payment history
- `POST /api/payments/webhook` - Webhook handler (for future payment gateway)

---

## Manual Testing Commands

### Test Photo Validation API
```bash
curl -X POST http://localhost:3001/api/functions/validate-photos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "woId": "test-wo-id",
    "stage": "replacement",
    "images": [
      {
        "id": "photo_1",
        "role": "context_wide",
        "hash": "abc123",
        "gps": null,
        "captured_at": "2025-11-25T10:00:00Z",
        "filename": "photo1.jpg"
      },
      {
        "id": "photo_2",
        "role": "pre_closeup",
        "hash": "def456",
        "gps": null,
        "captured_at": "2025-11-25T10:00:00Z",
        "filename": "photo2.jpg"
      },
      {
        "id": "photo_3",
        "role": "serial",
        "hash": "ghi789",
        "gps": null,
        "captured_at": "2025-11-25T10:00:00Z",
        "filename": "photo3.jpg"
      },
      {
        "id": "photo_4",
        "role": "replacement_part",
        "hash": "jkl012",
        "gps": null,
        "captured_at": "2025-11-25T10:00:00Z",
        "filename": "photo4.jpg"
      }
    ]
  }'
```

### Test Payment Status Update
```bash
curl -X POST http://localhost:3001/api/payments/update-status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "invoiceId": "invoice-id",
    "paymentAmount": 100.00,
    "paymentMethod": "stripe",
    "paymentReference": "ch_1234567890",
    "paymentStatus": "paid",
    "notes": "Test payment"
  }'
```

### Test Payment History
```bash
curl -X GET http://localhost:3001/api/payments/history/<invoice-id> \
  -H "Authorization: Bearer <token>"
```

---

## Database Verification

### Check Migration Applied
```sql
-- Check payment_status enum
SELECT typname FROM pg_type WHERE typname = 'payment_status';

-- Check payment_history table
SELECT * FROM information_schema.tables WHERE table_name = 'payment_history';

-- Check invoice columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('payment_status', 'payment_received_at', 'payment_amount', 'payment_method');
```

### Verify Trigger Function
```sql
-- Check trigger function exists
SELECT proname FROM pg_proc WHERE proname = 'update_invoice_payment_status';

-- Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_update_invoice_payment_status';
```

---

## Success Criteria

### Photo Validation
- ✅ All 4 photos validated successfully
- ✅ Validation status displayed in real-time
- ✅ Error messages shown for invalid photos
- ✅ Retry functionality works
- ✅ Validation records created in database

### Payment Status
- ✅ Payment status updated correctly
- ✅ Payment history logged
- ✅ Invoice payment_status auto-updated via trigger
- ✅ Payment history displayed in UI
- ✅ Payment status badges shown correctly

---

## Known Issues
None - All Sprint 1 features implemented and ready for testing.

---

**Testing Date:** November 25, 2025  
**Tester:** Development Team  
**Status:** Ready for Testing

