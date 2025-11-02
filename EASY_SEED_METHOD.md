# 🌱 EASIEST WAY: Seed Test Accounts

Since the Edge Function setup is complex, here's the SIMPLEST approach:

---

## ✅ Steps (Takes 5 minutes)

### Step 1: Get Your Supabase Keys
Go to: https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/settings/api

**Copy these values:**
- **Project URL:** `https://srbvopyexztcoxcayydn.supabase.co`
- **anon public key:** (the `anon` `public` key)
- **service_role secret key:** (the `service_role` `secret` key) ⚠️ Keep this SECRET!

---

### Step 2: Create .env.local File

In your project root (`C:\Users\Karthik's PC\guardian-flow`), create file: `.env.local`

**Contents:**
```env
VITE_SUPABASE_URL=https://srbvopyexztcoxcayydn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY_HERE
```

Replace `YOUR_ANON_KEY_HERE` with the anon key from Step 1.

---

### Step 3: Start Your Frontend

```bash
npm install
npm run dev
```

**Your app will open at:** `http://localhost:5173`

---

### Step 4: Navigate to Auth Page

Go to: http://localhost:5173/auth

**You'll see:** A "Create All Accounts" button

**Click it!** 🎉

---

### Step 5: Wait for Completion

- Wait 1-2 minutes
- Button will show "Creating..." with spinner
- Success message will appear

---

### Step 6: Verify

Go to: https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/auth/users

**You should see:** 195+ users!

---

## 🎉 Test Login

Now you can login with:
- **Platform Admin:** `admin@techcorp.com` / `Admin123!`
- **Client:** `oem1.admin@client.com` / `Client123!`
- **Partner:** `admin@servicepro.com` / `Partner123!`

---

## 🐛 If "Create All Accounts" Button Doesn't Work

**This means the edge function isn't deployed.** 

**Quick fix:** I can create a Node.js script that calls Supabase API directly instead.

**Tell me:** "Create Node script" and I'll make it for you!

---

## ✅ That's It!

Once seeding works, you're production ready! 🚀

