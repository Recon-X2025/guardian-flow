# TypeScript Errors Explanation

**Status:** Expected and Temporary  
**Date:** November 1, 2025

---

## Why These Errors Exist

The following TypeScript errors are **expected** and will resolve automatically once database migrations are deployed and Supabase types are regenerated:

### Files Affected
1. `src/hooks/usePlanFeatures.ts`
2. `src/components/ModulePicker.tsx`
3. `src/components/CompanyOnboarding.tsx`

### Root Cause

The subscription system was implemented in the frontend, but the corresponding database tables have not yet been migrated to Supabase production:

**Missing Tables:**
- `subscription_plans`
- `available_modules`
- `tenant_subscriptions`

**Migration Status:**
- ✅ Migration file created: `supabase/migrations/20251101120000_subscription_system.sql`
- ❌ Migration not yet deployed to Supabase
- ❌ TypeScript types not yet regenerated

### Error Examples

```
Type instantiation is excessively deep and possibly infinite
No overload matches this call. Argument of type '"subscription_plans"' is not assignable
Property 'subscription_plans' does not exist on type
```

---

## How to Fix

### Step 1: Deploy Migrations

Run the following migrations in order:

1. `20251101120000_subscription_system.sql` - Subscription tables
2. `20251101130000_add_client_roles.sql` - Client roles enum
3. `20251101140000_client_vendor_system.sql` - Client-vendor tables
4. `20251101150000_client_permissions.sql` - Client permissions

### Step 2: Regenerate TypeScript Types

```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
# Or for remote:
npx supabase gen types typescript --project-id <your-project-id> > src/integrations/supabase/types.ts
```

### Step 3: Verify

After types are regenerated, all TypeScript errors should disappear.

---

## Temporary Workaround

If you need to work on these files before migrations are deployed:

1. Add `// @ts-ignore` above affected lines (not recommended for production)
2. Use type assertions: `as any` (not recommended)
3. Wait for migrations to be deployed (recommended)

---

## Impact Assessment

**Severity:** LOW  
**Blocks Production:** NO (frontend is ready)  
**Blocks Development:** NO (can use ts-ignore temporarily)  
**User Impact:** ZERO (all tables exist in migrations)

---

**Action Required:** Deploy database migrations when ready  
**Owner:** DevOps/Backend Team  
**Timeline:** Before production deployment
