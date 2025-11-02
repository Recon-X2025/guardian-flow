# Deploy Migrations - Quick Instructions

**Your Project:** `srbvopyexztcoxcayydn`  
**Status:** Ready to Deploy ✅

---

## ⚡ Quick Deploy

### Step 1: Open SQL Editor
👉 Go to: https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/sql/new

### Step 2: Copy-Paste-Run
1. Open file: `DEPLOY_ALL_MIGRATIONS.sql`
2. **Copy ALL** contents (Ctrl+A, Ctrl+C)
3. Paste into SQL Editor
4. Click **"Run"** (bottom right)
5. Wait 30-60 seconds

### Step 3: Check Results
Look at the bottom of the SQL Editor output. You should see:

```
✅ Success. No rows returned
```

Plus verification queries showing:
- 7 client roles
- 4 tables created
- 25+ permissions
- 7 role mappings

---

## ✅ Success Looks Like This

After running, you'll see output like:

```
CLIENT ROLES CHECK:
client_admin
client_compliance_officer
client_executive
client_finance_manager
client_fraud_manager
client_operations_manager
client_procurement_manager

TABLES CHECK:
client_vendor_contracts
rfp_proposals
vendor_scorecards
vendors

PERMISSIONS CHECK:
29

ROLE MAPPINGS CHECK:
client_admin | 47
client_compliance_officer | 35
...
```

---

## 🧪 Next Step: Seed Test Data

After successful deployment, run the seed function:

In SQL Editor, run:
```sql
SELECT supabase.functions.invoke('seed-test-accounts');
```

---

## ⚠️ If You Get Errors

**Error: "app_role type does not exist"**
→ Your project needs the base RBAC migration first

**Error: "get_user_tenant_id does not exist"**  
→ RLS policies failed, but tables were created (safe to ignore for now)

**Error: "already exists"**
→ Partial deployment happened - run again (uses IF NOT EXISTS)

---

**Ready?** Open `DEPLOY_ALL_MIGRATIONS.sql` and copy it!

