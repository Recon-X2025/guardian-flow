# Partner Admin Setup Guide

**Version:** 7.0 | **Date:** April 2026

> **Security note:** Previous versions of this document contained hardcoded demo credentials. All credentials have been removed. Use your organisation's identity management process to provision accounts.

---

## Overview

Partner organisations access Guardian Flow as multi-tenant entities. A **partner admin** (`partner_admin` role) can view and manage data scoped to their partner organisation — including work orders, tickets, invoices, and quotes for engineers assigned to their organisation.

---

## 1. What a Partner Admin Can Access

| Module | Access |
|--------|--------|
| Tickets | View all tickets for their tenant |
| Work Orders | View work orders for their engineers |
| Invoices | View invoices linked to their organisation |
| Quotes | View quotes linked to their organisation |
| Customer Portal | Submit and track service requests |
| Developer Portal | API access, webhook management |
| Marketplace | Browse and install extensions |

**Cannot access:** Finance management, Fraud investigation, Analytics, Admin Console, ML Studio, Org Management Console.

---

## 2. Creating a Partner Organisation (sys_admin / tenant_admin)

### Via API

```bash
POST /api/org/tenants
Authorization: Bearer <sys_admin_token>
Content-Type: application/json

{
  "name": "Acme Field Services",
  "slug": "acme-field",
  "region": "west",
  "contract_type": "standard",
  "contact_email": "admin@acme.example.com"
}
```

Response includes the generated `tenant_id`.

### Via Org Management Console

1. Navigate to `/org-console` (requires `sys_admin` or `tenant_admin` role)
2. Click **+ New Organisation**
3. Fill in organisation details
4. Click **Create**

---

## 3. Creating a Partner Admin User

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "admin@partner.example.com",
  "password": "<strong-password>",
  "full_name": "Partner Admin Name",
  "tenant_id": "<tenant_id_from_step_2>"
}
```

Then assign the `partner_admin` role:

```bash
POST /api/org/users/<user_id>/roles
Authorization: Bearer <sys_admin_token>
Content-Type: application/json

{
  "role": "partner_admin",
  "tenant_id": "<tenant_id>"
}
```

---

## 4. Assigning Engineers to a Partner Organisation

Engineers (technicians) must be associated with a partner organisation so the partner admin can see their work:

```bash
POST /api/org/assignments
Authorization: Bearer <sys_admin_token>
Content-Type: application/json

{
  "user_id": "<technician_user_id>",
  "partner_tenant_id": "<partner_tenant_id>",
  "role": "technician"
}
```

---

## 5. Tenant Isolation

All partner admin queries are automatically scoped:

```
tenant_id = <partner_tenant_id>
```

A partner admin **cannot** see:
- Data from other partner organisations
- Data from the platform operator's own tenant
- Any data without their `tenant_id`

This is enforced at the backend route level — not just the frontend. See `docs/RBAC_TENANT_ISOLATION.md`.

---

## 6. Partner API Access

Partner admins can generate API keys for programmatic access via the Developer Portal (`/developer`):

1. Navigate to **Developer Portal → API Keys**
2. Click **Generate New Key**
3. Scope the key to the required permissions
4. All API calls using this key are rate-limited via the Partner API Gateway (`/api/partner`)

Rate limits (configurable per tenant):
- Default: 1,000 requests / hour
- Burst: 100 requests / minute

---

## 7. Webhooks for Partners

Partners can register webhooks to receive real-time event notifications:

```bash
POST /api/webhooks
Authorization: Bearer <partner_token>
Content-Type: application/json

{
  "url": "https://partner.example.com/hook",
  "events": ["work_order.completed", "invoice.created"],
  "secret": "<hmac-signing-secret>"
}
```

All webhook payloads are signed with HMAC-SHA256. Retry logic: 3 retries with exponential backoff.

---

## 8. Removing a Partner Organisation

```bash
DELETE /api/org/tenants/<tenant_id>
Authorization: Bearer <sys_admin_token>
```

This archives the tenant (soft delete). All data is retained for the audit retention period (7 years). Provide `?hard=true` for permanent deletion (irreversible).

---

## 9. Troubleshooting

| Issue | Check |
|-------|-------|
| Partner admin sees no data | Verify engineers are assigned to the correct `tenant_id` |
| Login fails | Confirm `tenant_id` was set on the user profile at registration |
| API key returning 403 | Check key is not expired; verify scope includes the requested endpoint |
| Webhook not firing | Check webhook URL is reachable; verify events include the desired event type |
| Missing tickets/WOs | Ensure `tenant_id` on the resource matches the partner's tenant |
