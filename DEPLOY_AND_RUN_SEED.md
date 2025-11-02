# 🚀 Deploy and Run Seed - SIMPLEST METHOD

## You DON'T need Supabase CLI! Here's the easy way:

---

## Step 1: Deploy Edge Function via Supabase Dashboard

1. **Go to:** https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/functions

2. **Click:** "New Function" or "Create Function"

3. **Enter:**
   - **Function Name:** `seed-test-accounts`
   - **Body:** Copy ALL of this file: `supabase/functions/seed-test-accounts/index.ts`

4. **Click:** "Deploy" or "Save"

5. **Wait:** 30 seconds for deployment

---

## Step 2: Invoke the Function

1. **Still on the functions page**, find `seed-test-accounts`

2. **Click:** "Invoke" or "Run"

3. **Method:** POST

4. **Body:**
   ```json
   {}
   ```

5. **Click:** "Run" or "Execute"

6. **Wait:** 1-2 minutes

---

## Step 3: Check Results

**Expected Output:**
```json
{
  "created": ["admin@techcorp.com", "ops@techcorp.com", ...],
  "existing": [],
  "errors": [],
  "summary": {
    "total_accounts": 195,
    "partner_admins": 4,
    "engineers": 160,
    "client_accounts": 21,
    "platform_users": 10,
    ...
  }
}
```

---

## Step 4: Verify Accounts

**Go to:**
https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/auth/users

**You should see:** 195+ users listed!

---

## Alternative: If Dashboard doesn't work

You can manually invoke via API in Postman or any REST client:

**URL:**
```
POST https://srbvopyexztcoxcayydn.supabase.co/functions/v1/seed-test-accounts
```

**Headers:**
```
Authorization: Bearer YOUR_SERVICE_ROLE_KEY
Content-Type: application/json
```

**Body:**
```json
{}
```

**To get your Service Role Key:**
1. Go to: https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/settings/api
2. Look for "service_role" key (NOT anon key)
3. Copy it

---

## ✅ Success Checklist

After this, you should have:
- ✅ 195+ test accounts in your database
- ✅ All 7 client accounts working
- ✅ 4 partner organizations
- ✅ 160 engineer accounts
- ✅ 10+ platform admin/ops users

**You can then test login in your app!**

---

## 🐛 Troubleshooting

**"Function not found":**
- Make sure you deployed it first!

**"Permission denied":**
- Use service_role key, not anon key

**"Tenant not found" errors:**
- Re-run `COMPLETE_DATABASE_SETUP.sql` first

**"Duplicate user" errors:**
- This is OK! Means some accounts already exist

---

## 🎉 That's It!

Once complete, try logging in with:
- `admin@techcorp.com` / `Admin123!`
- `oem1.admin@client.com` / `Client123!`
- `admin@servicepro.com` / `Partner123!`

**All working? Great! You're production ready! 🚀**

