# ⚠️ HOW TO CREATE TEST ACCOUNTS MANUALLY

The edge function is not deployed. Here's how to create accounts manually in Supabase:

## OPTION 1: Use Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/auth/users
2. Click "Add user" → "Create new user"
3. For each account below, create the user with:
   - Email
   - Password
   - **Auto Confirm: YES** (important!)

### Quick Reference - Most Important Accounts First

Copy these into Supabase Dashboard:

**Platform Admin (Critical for RBAC testing):**
- Email: `ops@techcorp.com` / Password: `Ops123!` / Role: `ops_manager`
- Email: `finance@techcorp.com` / Password: `Finance123!` / Role: `finance_manager`
- Email: `fraud@techcorp.com` / Password: `Fraud123!` / Role: `fraud_investigator`
- Email: `auditor@techcorp.com` / Password: `Auditor123!` / Role: `auditor`

**Partner Admin (For multi-tenant testing):**
- Email: `admin@servicepro.com` / Password: `Partner123!` / Role: `partner_admin`
- Email: `admin@techfield.com` / Password: `Partner123!` / Role: `partner_admin`

**Technicians (For field work testing):**
- Email: `tech1@servicepro.com` / Password: `Tech123!` / Role: `technician`
- Email: `tech2@servicepro.com` / Password: `Tech123!` / Role: `technician`
- Email: `tech1@techfield.com` / Password: `Tech123!` / Role: `technician`

## OPTION 2: Use SQL Script to Assign Roles After Creating Users

After creating users via Dashboard, run this in **SQL Editor**:

```sql
-- Assign ops_manager role
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'ops_manager'::app_role, NULL
FROM public.profiles
WHERE email = 'ops@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign finance_manager role
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'finance_manager'::app_role, NULL
FROM public.profiles
WHERE email = 'finance@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign fraud_investigator role
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'fraud_investigator'::app_role, NULL
FROM public.profiles
WHERE email = 'fraud@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign auditor role
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT id, 'auditor'::app_role, NULL
FROM public.profiles
WHERE email = 'auditor@techcorp.com'
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign partner_admin roles
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT p.id, 'partner_admin'::app_role, t.id
FROM public.profiles p
CROSS JOIN public.tenants t
WHERE p.email IN ('admin@servicepro.com', 'admin@techfield.com')
  AND t.slug IN ('servicepro', 'techfield')
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Assign technician roles
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT p.id, 'technician'::app_role, t.id
FROM public.profiles p
CROSS JOIN public.tenants t
WHERE p.email IN ('tech1@servicepro.com', 'tech2@servicepro.com', 'tech1@techfield.com')
  AND t.slug IN ('servicepro', 'techfield')
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Verify roles were assigned
SELECT 
  p.email,
  ur.role,
  t.slug as tenant
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
LEFT JOIN public.tenants t ON t.id = ur.tenant_id
WHERE p.email IN (
  'ops@techcorp.com',
  'finance@techcorp.com',
  'fraud@techcorp.com',
  'auditor@techcorp.com',
  'admin@servicepro.com',
  'admin@techfield.com',
  'tech1@servicepro.com',
  'tech2@servicepro.com',
  'tech1@techfield.com'
)
ORDER BY p.email, ur.role;
```

## What's Happening?

The `seed-test-accounts` Edge Function exists in the code but is **not deployed to Supabase**. This is why:
- The "Create All Accounts" button on `/auth` doesn't work
- The HTML page gets "Failed to fetch"
- The Node.js scripts fail

**Root Cause:** Edge Functions must be explicitly deployed via `supabase functions deploy` or through Supabase CLI.

**Temporary Solution:** Manual creation via Dashboard (as above).

**Permanent Fix:** Deploy the function properly (requires development setup).

---

**START WITH THESE 4 ACCOUNTS FIRST** to test RBAC:
1. `ops@techcorp.com` / `Ops123!`
2. `finance@techcorp.com` / `Finance123!`
3. `fraud@techcorp.com` / `Fraud123!`
4. `auditor@techcorp.com` / `Auditor123!`

This will let you verify that the RBAC fix is working before creating more accounts.

