# ReconX Guardian Flow — Complete Test Guide

## Quick Test (5 Minutes)

1. **Login**: Use "Use Test Accounts" → Select "Partner Admin"
2. **Create Ticket**: Serial `PC-2024-10001`, symptom "PC won't boot"
3. **Create WO**: Assign technician
4. **Run Precheck**: Verify inventory, warranty, photo checks
5. **View Modules**: Navigate to Invoicing, Payments, Analytics, Observability
6. **Verify**: All modules load with data (no "Coming soon" placeholders)

## Full E2E Test (15 Minutes)

### Workflow: Ticket → Invoice
1. Login as Partner Admin
2. Create Ticket → Create WO → Run Precheck
3. Upload 4 photos (all required roles)
4. Release WO → Generate SaPOS Offers
5. Accept Offer → Generate SO
6. Complete WO → View Invoice
7. Check Audit Logs with correlation IDs

## Acceptance Criteria ✅

- ✅ All "Coming soon" placeholders replaced with functional pages
- ✅ HVAC references removed (changed to PC & Print)
- ✅ Edge functions return structured errors with correlation IDs
- ✅ Add Item and Add Penalty Rule dialogs work
- ✅ Invoicing and Payments pages display real data
- ✅ Analytics and Observability show metrics
- ✅ KB and Assistant have functional UI (RAG = external)
- ✅ Tenant isolation enforced via RLS
- ✅ RBAC controls module visibility

## Test Accounts
Use the "Use Test Accounts" button on `/auth` to load pre-configured credentials for different roles.
