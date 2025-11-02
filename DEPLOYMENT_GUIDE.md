# Deployment Guide for Guardian Flow Client Roles

**Date:** November 1, 2025  
**Purpose:** Deploy 3 new database migrations to enable client roles and vendor management

---

## ✅ Prerequisites

Before deploying these migrations, ensure you have:

1. ✅ **Supabase Project Access**
   - Project ID: `blvrfzymeerefsdwqhoh`
   - Supabase dashboard access
   - Or Supabase CLI installed and authenticated

2. ✅ **Migrations Created**
   - `supabase/migrations/20251101130000_add_client_roles.sql`
   - `supabase/migrations/20251101140000_client_vendor_system.sql`
   - `supabase/migrations/20251101150000_client_permissions.sql`

3. ✅ **Backup** (recommended)
   - Backup your production database before deploying

---

## 🚀 Deployment Options

### Option 1: Supabase Dashboard (Easiest)

**Steps:**

1. **Navigate to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/blvrfzymeerefsdwqhoh
   - Login with your Supabase account

2. **Go to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Run Each Migration**
   
   **Migration 1: Client Roles**
   ```sql
   -- Copy contents of: supabase/migrations/20251101130000_add_client_roles.sql
   ```
   - Paste into SQL editor
   - Click "Run"
   - Verify success ✅

   **Migration 2: Client-Vendor System**
   ```sql
   -- Copy contents of: supabase/migrations/20251101140000_client_vendor_system.sql
   ```
   - Paste into SQL editor
   - Click "Run"
   - Verify success ✅

   **Migration 3: Client Permissions**
   ```sql
   -- Copy contents of: supabase/migrations/20251101150000_client_permissions.sql
   ```
   - Paste into SQL editor
   - Click "Run"
   - Verify success ✅

4. **Verify Migration Success**
   
   Run this verification query:
   ```sql
   -- Check client roles exist
   SELECT enumlabel FROM pg_enum 
   WHERE enumtypid = 'app_role'::regtype 
   AND enumlabel LIKE 'client_%'
   ORDER BY enumlabel;
   
   -- Should return 7 rows:
   -- client_admin
   -- client_compliance_officer
   -- client_executive
   -- client_finance_manager
   -- client_fraud_manager
   -- client_operations_manager
   -- client_procurement_manager
   ```

   ```sql
   -- Check tables created
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('vendors', 'client_vendor_contracts', 'vendor_scorecards', 'rfp_proposals')
   ORDER BY table_name;
   
   -- Should return 4 rows
   ```

   ```sql
   -- Check permissions exist
   SELECT name, category 
   FROM public.permissions 
   WHERE category IN ('vendor', 'contract', 'sla', 'rfp')
   ORDER BY category, name;
   
   -- Should return 25+ rows
   ```

   ```sql
   -- Check role mappings
   SELECT r.role, COUNT(*) as permission_count 
   FROM role_permissions r 
   WHERE r.role::text LIKE 'client_%' 
   GROUP BY r.role
   ORDER BY r.role;
   
   -- Should return 7 rows with permission counts
   ```

---

### Option 2: Supabase CLI (Advanced)

**Steps:**

1. **Install Supabase CLI** (if not installed)
   ```bash
   # Windows (PowerShell)
   winget install Supabase.CLI
   
   # Or use npm
   npm install -g supabase
   ```

2. **Authenticate**
   ```bash
   supabase login
   ```

3. **Link Project**
   ```bash
   supabase link --project-ref blvrfzymeerefsdwqhoh
   ```

4. **Push Migrations**
   ```bash
   supabase db push
   ```

5. **Verify** (same queries as Option 1)

---

### Option 3: Direct SQL via pgAdmin or psql

If you have direct database access:

1. **Connect to PostgreSQL**
   ```
   Host: db.blvrfzymeerefsdwqhoh.supabase.co
   Database: postgres
   Username: [your-admin-user]
   Password: [your-admin-password]
   ```

2. **Run each migration file** in order

3. **Verify** (same queries as above)

---

## 🧪 Testing After Deployment

### Step 1: Run Seed Test Accounts

After migrations are deployed, seed your test accounts:

**Via Supabase Dashboard:**
1. Go to SQL Editor
2. Run the seed function:
   ```sql
   SELECT supabase.functions.invoke('seed-test-accounts');
   ```

**Via API:**
```bash
curl -X POST https://blvrfzymeerefsdwqhoh.supabase.co/functions/v1/seed-test-accounts \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Verify:**
```sql
SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@client.com';
-- Should return 21 rows
```

### Step 2: Test Client Login

1. **Open Guardian Flow app**
   - Go to: `/auth` or `/auth/platform`

2. **Use Test Account Selector**
   - Click "Dev: Test Accounts" dropdown
   - Click "OEM Client 1 Admin" → Should log in as `oem1.admin@client.com`

3. **Verify Redirect**
   - Should redirect to `/dashboard` (temporary until client pages created)
   - Check console: No errors

4. **Check RBAC Context**
   - Open browser DevTools
   - Console should show roles loaded: `['client_admin']`
   - No permission errors

### Step 3: Test Other Client Roles

Repeat for:
- `oem1.ops@client.com` → Operations Manager
- `oem2.executive@client.com` → Executive
- `insurance1.fraud@client.com` → Fraud Manager
- `healthcare1.compliance@client.com` → Compliance Officer

---

## ⚠️ Troubleshooting

### Error: "enum value already exists"

**Cause:** Client roles migration already applied  
**Fix:** Safe to ignore - migration uses `IF NOT EXISTS` checks

### Error: "table already exists"

**Cause:** Client-vendor tables already created  
**Fix:** Migration uses `CREATE TABLE IF NOT EXISTS` - safe to re-run

### Error: "permission denied"

**Cause:** Insufficient database privileges  
**Fix:** Need PostgreSQL superuser or role with CREATEROLE

### TypeScript Errors Still Appear

**Cause:** Types not regenerated yet  
**Fix:** Run:
```bash
npx supabase gen types typescript --project-id blvrfzymeerefsdwqhoh > src/integrations/supabase/types.ts
```

---

## 📊 Post-Deployment Checklist

- [ ] All 3 migrations applied successfully
- [ ] 7 client roles visible in enum
- [ ] 4 client-vendor tables created
- [ ] 25+ client permissions added
- [ ] Client roles mapped to permissions
- [ ] Seed test accounts successful
- [ ] 21 client accounts created
- [ ] Quick-login working
- [ ] Client redirects working
- [ ] TypeScript types regenerated
- [ ] No console errors on login

---

## 🔄 Rollback Plan

If something goes wrong:

### Rollback Migration 3
```sql
-- Remove client permission mappings
DELETE FROM role_permissions WHERE role::text LIKE 'client_%';
DELETE FROM permissions WHERE category IN ('vendor', 'contract', 'sla', 'rfp');
```

### Rollback Migration 2
```sql
-- Drop tables
DROP TABLE IF EXISTS rfp_proposals;
DROP TABLE IF EXISTS vendor_scorecards;
DROP TABLE IF EXISTS client_vendor_contracts;
DROP TABLE IF EXISTS vendors;
```

### Rollback Migration 1
**Note:** Can't easily remove ENUM values in PostgreSQL without recreating type

**Safer approach:** Just don't use the client roles until fixed

---

## 📞 Next Steps After Deployment

1. ✅ **Deploy Client Dashboard Pages** (Week 1)
   - Create 5 client pages
   - Add to routes
   - Update redirects

2. ✅ **Build Vendor Management APIs** (Week 1)
   - Create edge functions
   - Implement RLS policies
   - Test cross-tenant isolation

3. ✅ **Integration Testing** (Week 2)
   - End-to-end client workflows
   - Permission enforcement
   - Security validation

---

## 📚 Reference

- **Migrations:** `supabase/migrations/`
- **Test Accounts:** `docs/TEST_ACCOUNTS_USER_STORIES.md`
- **Client Roles:** `docs/CLIENT_ROLES_AND_PERSONAS.md`
- **Implementation Plan:** `PRODUCTION_READINESS_IMPLEMENTATION_PLAN.md`

---

**Last Updated:** November 1, 2025  
**Status:** Ready for deployment

