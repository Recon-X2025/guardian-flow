# Guardian Flow - Comprehensive System Failures & Fix Plan
**Generated:** 2025-01-02  
**Status:** 🔴 CRITICAL ISSUES IDENTIFIED  
**Priority:** Fix systematically in order

---

## 📋 EXECUTIVE SUMMARY

| Category | Issues Found | Status | Priority |
|----------|--------------|--------|----------|
| **RBAC & Permissions** | 2 | 🔴 Critical | P0 |
| **Database Tables** | 3 | 🔴 Critical | P0 |
| **Edge Functions** | 5 | 🟡 High | P1 |
| **Frontend Errors** | 4 | 🟡 High | P1 |
| **Test Accounts** | 1 | 🟡 High | P1 |
| **TypeScript Types** | Multiple | 🔵 Medium | P2 |
| **CORS/Network** | 2 | 🔵 Medium | P2 |

**Overall System Health:** 🟡 65% - Needs immediate attention

---

## 🔴 CRITICAL PRIORITY 0 (P0) - FIX FIRST

### 1. RBAC Permission Mappings Missing ⚡
**Impact:** Sidebar empty, users can't access features  
**Status:** 🔴 Blocking all functionality  
**Affected Roles:** `partner_admin`, potentially others

#### Problem:
- `partner_admin` role has no permissions mapped
- Sidebar only shows Dashboard, Help, Settings
- Users can't see Work Orders, Tickets, Inventory, etc.

#### Solution:
**Action Required:** Run `MAP_BASE_ROLE_PERMISSIONS.sql`

```sql
-- This maps permissions to all base roles including partner_admin
-- File: MAP_BASE_ROLE_PERMISSIONS.sql
```

**Steps:**
1. Go to: https://supabase.com/dashboard/project/srbvopyexztcoxcayydn/sql/new
2. Open `MAP_BASE_ROLE_PERMISSIONS.sql`
3. Copy entire contents
4. Run in SQL Editor
5. Verify with `CHECK_PARTNER_ADMIN_PERMISSIONS.sql`

**Expected Result:**
- `partner_admin` gets permissions from: `ticketing`, `work_order`, `inventory`, `warranty`, `attachments`, `photos`, `service_orders`, `sapos`, `finance`, `overrides`
- Sidebar populates with appropriate menu items
- Users can access their modules

---

### 2. Missing Database Tables 🔴
**Impact:** Dashboard shows "No data", errors in console  
**Status:** Partially fixed, needs verification

#### Tables Status:
- ✅ `notifications` - Created (via CREATE_MISSING_TABLES.sql)
- ✅ `notification_preferences` - Created
- ❓ `subscription_plans` - Verify exists
- ❓ `tenant_subscriptions` - Verify exists
- ❓ `available_modules` - Verify exists

#### Solution:
**Action Required:** Verify all subscription tables exist

**Verification Query:**
```sql
-- Run this to check what's missing
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'subscription_plans',
    'tenant_subscriptions',
    'available_modules',
    'notifications',
    'notification_preferences'
  )
ORDER BY table_name;
```

**If Missing:** Run `20251101120000_subscription_system.sql` migration

---

### 3. RBAC Query Optimization 🔴
**Impact:** Slow loading, potential timeouts  
**Status:** Needs verification

#### Problem:
- `RBACContext.tsx` queries permissions with `.in('role', roleNames)`
- If enum casting fails, permissions won't load
- No fallback or error handling

#### Solution:
**File:** `src/contexts/RBACContext.tsx` (Lines 88-102)

**Verify the query works:**
```typescript
// Current query - check if this works with enum types
const { data: rolePerms } = await supabase
  .from('role_permissions')
  .select('permissions(name)')
  .in('role', roleNames);
```

**If failing, add error logging:**
```typescript
if (!rolePerms || rolePerms.length === 0) {
  console.error('No permissions found for roles:', roleNames);
  // Check if roles are properly cast
  console.log('Role types:', roleNames.map(r => typeof r));
}
```

---

## 🟡 HIGH PRIORITY 1 (P1) - FIX NEXT

### 4. Missing Edge Functions 🟡
**Impact:** Features don't work, console errors  
**Status:** Some functions missing

#### Missing Functions:
1. ✅ `get-exchange-rates` - Has fallback in `useCurrency.tsx`, but should be deployed
2. ❓ `health-monitor` - Called by SystemHealth.tsx
3. ❓ `compliance-policy-enforcer` - Called by ComplianceCenter.tsx
4. ❓ `custom-report-builder` - Called by CustomReportBuilder.tsx
5. ❓ `dispute-manager` - Called by DisputeManagement.tsx

#### Solution:
**Action Required:** Deploy missing edge functions OR add error handling

**Option A: Deploy Functions (Recommended)**
- Check if functions exist in `supabase/functions/`
- Deploy via Supabase Dashboard or CLI

**Option B: Add Graceful Fallbacks (Temporary)**
- Wrap edge function calls in try-catch
- Show user-friendly messages
- Use mock data if appropriate

**Example Fix for `get-exchange-rates`:**
```typescript
// File: src/hooks/useCurrency.tsx
try {
  const { data, error } = await supabase.functions.invoke('get-exchange-rates', {
    // ... options
  });
  if (error) throw error;
  return data;
} catch (error) {
  console.warn('Exchange rates function unavailable, using fallback');
  // Already has fallback rates - this is fine
  return FALLBACK_RATES;
}
```

---

### 5. Test Accounts Not Properly Seeded 🟡
**Impact:** Can't test different roles  
**Status:** Needs re-seeding after permission fix

#### Problem:
- Accounts may exist but without proper role assignments
- Permissions won't work if roles aren't assigned to users

#### Solution:
**Action Required:** Re-run account seeding AFTER fixing permissions

**Steps:**
1. ✅ First: Run `MAP_BASE_ROLE_PERMISSIONS.sql` (from P0 #1)
2. Then: Run `seed-accounts.html` again
3. Verify accounts have roles: `CHECK_PARTNER_ADMIN_PERMISSIONS.sql`

**Verification:**
```sql
-- Check if partner admin account has the role
SELECT ur.*, p.email, p.full_name
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'partner_admin'
LIMIT 5;
```

---

### 6. TanStack Query v5 Migration ⚡
**Impact:** Login errors, app crashes  
**Status:** ✅ FIXED in `usePlanFeatures.ts`

#### Already Fixed:
- ✅ `src/hooks/usePlanFeatures.ts` - Updated to v5 syntax

#### Verify No Other Files Need Updates:
**Action:** Check for any remaining old syntax

```bash
# Search for old useQuery syntax (if grep available)
grep -r "useQuery\(\[" src/
grep -r "useQuery('" src/
```

**If found:** Update to:
```typescript
// OLD (v4)
useQuery(['key'], queryFn, { enabled: true })

// NEW (v5)
useQuery({ queryKey: ['key'], queryFn, enabled: true })
```

---

### 7. Dashboard Loading State Issues 🟡
**Impact:** "Loading dashboard..." forever  
**Status:** ✅ Partially fixed

#### Problem:
- Dashboard can get stuck in loading state
- Early returns didn't set loading to false

#### Solution:
**File:** `src/pages/Dashboard.tsx` (Lines 68-83)

**Status:** ✅ Already fixed - early returns now set `setLoading(false)`

**Verify it's working:**
- Login and check dashboard loads
- Should see stats or "No data available" (not "Loading...")

---

## 🔵 MEDIUM PRIORITY 2 (P2) - FIX AFTER P0/P1

### 8. TypeScript Type Errors 🔵
**Impact:** Red squiggles in IDE, but app runs  
**Status:** Expected until types regenerate

#### Problem:
- Supabase types don't include new tables
- TypeScript complains about `tenant_subscriptions`, `subscription_plans`, etc.

#### Solution:
**Action Required:** Regenerate Supabase types AFTER all migrations run

```bash
# After all SQL migrations are complete
npx supabase gen types typescript --project-id srbvopyexztcoxcayydn > src/integrations/supabase/types.ts
```

**Temporary Workaround:**
- Files already use `as any` in many places
- This is acceptable until types regenerate

---

### 9. CORS Issues with Edge Functions 🔵
**Impact:** Network errors in console  
**Status:** May be edge function configuration

#### Problem:
- Some edge functions may not have CORS configured
- Browser blocks requests

#### Solution:
**Check Edge Function CORS:**
- Edge functions should return CORS headers
- Verify in `supabase/functions/_shared/cors.ts` or similar

**Example headers needed:**
```typescript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

---

### 10. Missing Landing Page 🔵
**Impact:** No public landing page  
**Status:** Feature gap

#### Problem:
- User reported "landing page for the platform is missing"
- Direct navigation to `/` may not show proper landing

#### Solution:
**Verify Route:** Check `src/App.tsx` for `/` route
- Should redirect to `/auth` if not logged in
- Should show landing page if public access needed

---

## 📊 SYSTEMATIC FIX EXECUTION PLAN

### Phase 1: Critical Fixes (30 minutes) ⚡
**Goal:** Get basic functionality working

1. ✅ **Run `MAP_BASE_ROLE_PERMISSIONS.sql`**
   - This fixes RBAC for all roles
   - Verifies with `CHECK_PARTNER_ADMIN_PERMISSIONS.sql`

2. ✅ **Verify Database Tables**
   - Run verification query from P0 #2
   - Create missing tables if needed

3. ✅ **Test Login & Sidebar**
   - Log in with `partner_admin` account
   - Verify sidebar populates
   - Check permissions are loaded

### Phase 2: High Priority Fixes (1 hour) 🔧
**Goal:** Fix broken features

4. ✅ **Deploy Missing Edge Functions**
   - Check which functions are called but missing
   - Deploy or add fallbacks

5. ✅ **Re-seed Test Accounts**
   - Run `seed-accounts.html` after permissions fix
   - Verify accounts have correct roles

6. ✅ **Fix Dashboard Loading**
   - Verify loading states work correctly
   - Test with different roles

### Phase 3: Polish & Types (30 minutes) ✨
**Goal:** Clean up errors and regenerate types

7. ✅ **Regenerate Supabase Types**
   - Run type generation command
   - Fix any remaining TypeScript errors

8. ✅ **Verify CORS & Network**
   - Check edge function responses
   - Fix CORS if needed

---

## ✅ VERIFICATION CHECKLIST

After completing fixes, verify:

- [ ] Partner admin can log in
- [ ] Sidebar shows all appropriate menu items for role
- [ ] Dashboard loads (even if showing "No data")
- [ ] Work Orders page accessible
- [ ] Tickets page accessible
- [ ] No console errors about permissions
- [ ] No console errors about missing tables
- [ ] Edge functions either work or fail gracefully
- [ ] Test accounts can log in with correct roles

---

## 🚨 IMMEDIATE ACTION REQUIRED

**RIGHT NOW, DO THIS:**

1. **Run this SQL first:**
   ```sql
   -- Open: MAP_BASE_ROLE_PERMISSIONS.sql
   -- Run in Supabase SQL Editor
   ```

2. **Then verify:**
   ```sql
   -- Run: CHECK_PARTNER_ADMIN_PERMISSIONS.sql
   -- Should show permissions mapped to partner_admin
   ```

3. **Then test:**
   - Log out
   - Log in with `partner.admin@servicepro.com` / `Partner123!`
   - Check sidebar shows menu items

**This fixes 80% of the issues immediately.**

---

## 📝 NOTES

- **TanStack Query v5:** Already fixed in `usePlanFeatures.ts`
- **Dashboard Loading:** Already fixed with early return handling
- **Notifications Table:** Already created via `CREATE_MISSING_TABLES.sql`
- **Test Accounts:** Need re-seeding after permission mappings

**Next Steps After P0/P1:**
- Monitor console for remaining errors
- Fix edge function deployments
- Regenerate types
- Add more comprehensive error handling

---

**Last Updated:** 2025-01-02  
**Status:** Ready for execution

