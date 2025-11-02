# Migration Deployment Checklist

**Quick Reference for Deploying 3 Migrations**

---

## ⚡ Instructions

### Open SQL Editor
👉 https://supabase.com/dashboard/project/blvrfzymeerefsdwqhoh/sql/new

### Run Each Migration

**1️⃣ Migration: Client Roles**
```sql
-- Copy-paste from: supabase/migrations/20251101130000_add_client_roles.sql
-- Click "Run"
-- Wait for: ✅ Success
```

**2️⃣ Migration: Client-Vendor System**
```sql
-- Copy-paste from: supabase/migrations/20251101140000_client_vendor_system.sql
-- Click "Run"
-- Wait for: ✅ Success
```

**3️⃣ Migration: Client Permissions**
```sql
-- Copy-paste from: supabase/migrations/20251101150000_client_permissions.sql
-- Click "Run"
-- Wait for: ✅ Success
```

---

## ✅ Verify Success

Run this query:
```sql
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype 
AND enumlabel LIKE 'client_%'
ORDER BY enumlabel;
```

**Expected:** 7 rows (client_admin, client_compliance_officer, etc.)

---

## 🧪 Test

Seed test accounts:
```sql
SELECT supabase.functions.invoke('seed-test-accounts');
```

Then test login at: `/auth`

---

**All migrations are in:** `supabase/migrations/`  
**Full guide:** `QUICK_START_DEPLOYMENT.md`

