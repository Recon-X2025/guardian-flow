# Seed Test Accounts - Instructions

## Option 1: Deploy Edge Function (Recommended)

### Step 1: Check if function is already deployed
Open: https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/functions

Look for: `seed-test-accounts`

### Step 2: If NOT deployed, deploy it

**Method A - Via Supabase CLI (if you have it installed):**
```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref srbvopyexztcoxcayydn

# Deploy the function
supabase functions deploy seed-test-accounts
```

**Method B - Via Git Push (if connected to Git):**
- Just push your code. Lovable Cloud will auto-deploy edge functions.

### Step 3: Invoke the function

**Via Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/functions/seed-test-accounts
2. Click "Invoke" button
3. Method: POST
4. Body: `{}` (empty JSON)
5. Click "Run"

**Via cURL:**
```bash
curl -X POST \
  https://srbvopyexztcoxcayydn.supabase.co/functions/v1/seed-test-accounts \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

---

## Option 2: Manual SQL Script (Alternative)

If edge function deployment is complex, I can create a direct SQL script to insert users.
This requires getting Supabase service role key.

---

## Option 3: Simple Test Accounts (Quick Start)

I can create a minimal seed script for just a few key test accounts first.

---

## What to Expect

After successful seeding, you should see:
- ✅ 195+ test accounts created
- ✅ 7 partner orgs (4 actual + 3 client-facing)
- ✅ 10+ core platform users
- ✅ 160 partner engineers (40 per partner)
- ✅ 21 client accounts (across 7 clients)

**Login credentials pattern:**
- Platform users: `{role}@techcorp.com` / `{Role}123!`
- Client users: `{client}.{role}@client.com` / `Client123!`
- Partner users: `admin@{partner}.com` / `Partner123!`
- Engineers: `engineer{X}@{partner}.com` / `Tech123!`

---

## Next Steps After Seeding

1. Verify accounts in Supabase Dashboard:
   - https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/auth/users

2. Test login flow in your app:
   - Open app at: `http://localhost:5173`
   - Try logging in with: `admin@techcorp.com` / `Admin123!`
   - Check redirects and RBAC

3. Test client accounts:
   - `oem1.admin@client.com` / `Client123!`
   - `insurance1.fraud@client.com` / `Client123!`

---

## Troubleshooting

**Function not found:**
- Need to deploy it first

**Permission errors:**
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set in function secrets

**Tenant creation errors:**
- Database setup might be incomplete, re-run `COMPLETE_DATABASE_SETUP.sql`

**Duplicate user errors:**
- Expected if re-running - script handles this gracefully

