# Create New Supabase Project & Deploy Guardian Flow

**Step-by-step guide to set up a fresh Supabase project for Guardian Flow**

---

## 🎯 Step 1: Create New Supabase Project

### In Supabase Dashboard:

1. **Click "+ New project"** (green button, bottom right)

2. **Fill in project details:**
   - **Name:** `Guardian Flow`
   - **Database Password:** 
     - Click "Generate a secure password" OR
     - Create your own (must be strong)
     - ⚠️ **SAVE THIS PASSWORD** - you'll need it!
   - **Region:** Select `ap-south-1 (Mumbai)` (or closest to users)
   - **Pricing:** Start with **Free** tier

3. **Click "Create new project"**
   - Wait 2-3 minutes for provisioning

4. **Copy your Project ID:**
   - After creation, look at the URL
   - Format: `https://dashboard.supabase.com/project/XXXXXXXXXXXXXX`
   - `XXXXXXXXXXXXXX` is your Project ID

---

## 🔧 Step 2: Update Configuration

### Update `supabase/config.toml`

**Find this line:**
```toml
project_id = "blvrfzymeerefsdwqhoh"
```

**Replace with your new project ID:**
```toml
project_id = "YOUR_NEW_PROJECT_ID"
```

---

### Create `.env` File (Optional but Recommended)

**In your project root:** Create `.env` file

1. **Get your keys from Supabase Dashboard:**
   - Go to: Settings → API
   - Copy "Project URL"
   - Copy "anon public" key

2. **Create `.env` file:**
```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...your_anon_key_here
```

---

## 🚀 Step 3: Deploy Migrations

### Option A: Via Supabase Dashboard SQL Editor (Easiest)

1. **Open SQL Editor**
   - In your project dashboard
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

2. **Run Migration 1: Client Roles**
   - Open: `supabase/migrations/20251101130000_add_client_roles.sql`
   - Copy ALL contents
   - Paste into SQL Editor
   - Click **"Run"** (or press Ctrl+Enter)
   - Wait for: ✅ "Success. No rows returned"

3. **Run Migration 2: Client-Vendor System**
   - Open: `supabase/migrations/20251101140000_client_vendor_system.sql`
   - Copy ALL contents
   - Paste into SQL Editor (in new query)
   - Click **"Run"**
   - Wait for: ✅ "Success. No rows returned"

4. **Run Migration 3: Client Permissions**
   - Open: `supabase/migrations/20251101150000_client_permissions.sql`
   - Copy ALL contents
   - Paste into SQL Editor (in new query)
   - Click **"Run"**
   - Wait for: ✅ "Success. No rows returned"

---

## ✅ Step 4: Verify Migrations

### Run Verification Queries

In SQL Editor, run each of these:

**Query 1: Check Client Roles**
```sql
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype 
AND enumlabel LIKE 'client_%'
ORDER BY enumlabel;
```
**Expected:** 7 rows showing all client roles ✅

**Query 2: Check Tables**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('vendors', 'client_vendor_contracts', 'vendor_scorecards', 'rfp_proposals')
ORDER BY table_name;
```
**Expected:** 4 rows ✅

**Query 3: Check Permissions**
```sql
SELECT COUNT(*) as permission_count
FROM public.permissions 
WHERE category IN ('vendor', 'contract', 'sla', 'rfp');
```
**Expected:** 25+ permissions ✅

**Query 4: Check Role Mappings**
```sql
SELECT r.role, COUNT(*) as permission_count 
FROM role_permissions r 
WHERE r.role::text LIKE 'client_%' 
GROUP BY r.role
ORDER BY r.role;
```
**Expected:** 7 rows with permission counts ✅

---

## 🧪 Step 5: Seed Test Accounts

### Deploy Seed Function First

1. **Copy the seed-test-accounts function**
   - Go to: `supabase/functions/seed-test-accounts/`
   - This is already set up

2. **Deploy via Supabase CLI** (or wait for auto-deploy)

**OR manually seed via SQL:**

1. **Create a simple test user first:**
```sql
-- Create a test user manually
INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'test@example.com',
  crypt('Test123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
);
```

2. **Then call the seed function** (requires function deployment)

---

## 🎯 Step 6: Test the Application

### Start Your App

1. **Install dependencies** (if not done):
```bash
npm install
```

2. **Start dev server:**
```bash
npm run dev
```

3. **Open browser:**
   - Navigate to: `http://localhost:5173`
   - Go to: `/auth` or `/auth/platform`

4. **Test client login:**
   - After seeding accounts, use quick-login
   - Click "Dev: Test Accounts"
   - Try: "OEM Client 1 Admin"

---

## ⚠️ Troubleshooting

### Error: "Cannot connect to Supabase"

**Fix:** Check your `.env` file has correct URL and key

### Error: "relation does not exist"

**Fix:** Some tables depend on others - re-run migrations in order

### Error: "permission denied"

**Fix:** Ensure you're using the project owner account

### Error: "function does not exist"

**Fix:** The `seed-test-accounts` function needs to be deployed

---

## 📋 Quick Checklist

- [ ] Created new Supabase project
- [ ] Copied Project ID
- [ ] Updated `supabase/config.toml`
- [ ] Created `.env` file (optional)
- [ ] Ran Migration 1 (client roles)
- [ ] Ran Migration 2 (client-vendor)
- [ ] Ran Migration 3 (permissions)
- [ ] Verified with SQL queries
- [ ] Seeded test accounts
- [ ] Tested login in app

---

## 🎉 You're Done!

After completing these steps:
- ✅ Database set up with all migrations
- ✅ Client roles enabled
- ✅ Test accounts created
- ✅ Ready to build client dashboards

---

**Need help?** Check:
- `DEPLOYMENT_GUIDE.md` - Detailed troubleshooting
- `QUICK_START_DEPLOYMENT.md` - Fast reference
- Supabase Docs: https://supabase.com/docs

