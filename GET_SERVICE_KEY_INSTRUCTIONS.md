# How to Get Your Supabase Service Role Key

1. Go to: https://srbvopyexztcoxcayydn.supabase.co
2. Click **Settings** (gear icon in left sidebar)
3. Click **API** 
4. Scroll down to **Project API keys**
5. Find the key labeled **service_role** (secret) - it starts with `eyJhbG...`
6. Click the **eye icon** to reveal it
7. Copy the **ENTIRE** key (it's very long!)

Then run:
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="<paste-the-ENTIRE-key-here>"
node create-just-4.cjs
```

**IMPORTANT:** The key you shared was incomplete (ends with `ZeC4` but should be hundreds of characters longer!)

