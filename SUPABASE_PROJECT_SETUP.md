# Supabase Project Setup Instructions

**Issue:** The Guardian Flow project doesn't exist in your Supabase account yet.

---

## 🎯 You Have Two Options

### Option 1: Use Your Existing Project ✅ RECOMMENDED

**If you see:** "karthikiyer25@gmail.com's Project" in the dashboard

**Steps:**
1. Click on that project in the Supabase dashboard
2. Get the project details (Project URL, API keys)
3. Update `supabase/config.toml` with your actual project ID
4. Deploy migrations using that project

---

### Option 2: Create New Project for Guardian Flow

**If you want a fresh project:**

**Steps:**
1. Click **"+ New project"** in Supabase dashboard
2. Fill in:
   - Project name: "Guardian Flow"
   - Database password: (save securely)
   - Region: ap-south-1 (Mumbai) - already shown
   - Plan: Free tier is fine
3. Wait for project creation (~2 minutes)
4. Copy the new project ID
5. Update `supabase/config.toml` with new project ID

---

## 🔧 What to Update

Once you have the correct project, update these files:

### 1. `supabase/config.toml`
Change line 1:
```toml
project_id = "YOUR_ACTUAL_PROJECT_ID"
```

### 2. Environment Variables (if you create `.env`)
```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY
```

---

## 🚀 After Setup

Then proceed with:
1. `QUICK_START_DEPLOYMENT.md` - Deploy migrations
2. `DEPLOYMENT_GUIDE.md` - Full instructions

---

## ❓ Questions?

**Do you already have a Supabase project running Guardian Flow?**
- If yes → Use that project
- If no → Create new project or tell me which project to use

**What's your actual Supabase project ID?**
- Check your dashboard URL
- Or check existing environment variables

