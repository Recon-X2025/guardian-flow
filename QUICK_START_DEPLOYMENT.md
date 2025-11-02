# Quick Start: Deploy Client Roles

**Status:** Ready to Deploy ✅

---

## 🎯 What You're Deploying

**3 Database Migrations:**
1. Client roles enum (7 new roles)
2. Client-vendor tables (4 tables + RLS)
3. Client permissions (25+ permissions)

**Result:** Enables client-vendor management system

---

## ⚡ Fastest Way (Supabase Dashboard)

### Step 1: Open SQL Editor
👉 https://supabase.com/dashboard/project/blvrfzymeerefsdwqhoh/sql/new

### Step 2: Run Migration 1
- Copy content from: `supabase/migrations/20251101130000_add_client_roles.sql`
- Paste into SQL editor
- Click **"Run"**
- Wait for: ✅ Success

### Step 3: Run Migration 2
- Copy content from: `supabase/migrations/20251101140000_client_vendor_system.sql`
- Paste into SQL editor
- Click **"Run"**
- Wait for: ✅ Success

### Step 4: Run Migration 3
- Copy content from: `supabase/migrations/20251101150000_client_permissions.sql`
- Paste into SQL editor
- Click **"Run"**
- Wait for: ✅ Success

### Step 5: Verify
Run this in SQL Editor:
```sql
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype 
AND enumlabel LIKE 'client_%';
-- Should show 7 client roles ✅
```

---

## 🧪 Test It

### Seed Test Accounts
In SQL Editor:
```sql
SELECT supabase.functions.invoke('seed-test-accounts');
```

### Test Login
1. Go to: `/auth` in your app
2. Click "Dev: Test Accounts" dropdown
3. Click: "OEM Client 1 Admin"
4. Should log in successfully ✅

---

## 📝 Next Steps

1. **Create Client Dashboards** (Week 1)
   - See: `PRODUCTION_READINESS_IMPLEMENTATION_PLAN.md`

2. **Build Vendor APIs** (Week 1)
   - Edge functions for vendor management

3. **Integration Testing** (Week 2)
   - Full client workflows

---

**Full Guide:** See `DEPLOYMENT_GUIDE.md` for detailed instructions and troubleshooting

**Estimated Time:** 10 minutes total

