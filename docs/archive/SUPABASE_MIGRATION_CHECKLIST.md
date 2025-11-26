# Supabase to API Client Migration Checklist

**Date:** November 25, 2025  
**Status:** ✅ COMPLETED - All Component Files Migrated  
**Progress:** 21/21 component files completed (100%)

---

## ✅ Completed Migrations

### Core Components
- [x] `src/components/CreateWorkOrderDialog.tsx` - Migrated to apiClient, fixed insert queries
- [x] `src/components/GenerateServiceOrderDialog.tsx` - Migrated to apiClient, fixed variable references
- [x] `src/components/TechnicianDialog.tsx` - Fixed imports, added error handling
- [x] `src/components/SeedDataManager.tsx` - Migrated, fixed undefined variable bug
- [x] `src/hooks/useOfflineSync.tsx` - Fully migrated from old supabase client path

### Infrastructure
- [x] `src/components/ModuleSandboxProvider.tsx` - Already using apiClient
- [x] `src/integrations/api/client.ts` - Core API client implementation complete

---

## ✅ All Component Files Migrated!

### High Priority Components - COMPLETED
- [x] `src/components/FraudFeedbackDialog.tsx` - ✅ Migrated, added useAuth
- [x] `src/components/GenerateOfferDialog.tsx` - ✅ Fixed variable references
- [x] `src/components/TriggerPrecheckDialog.tsx` - ✅ Migrated to apiClient
- [x] `src/components/PrecheckStatus.tsx` - ✅ Migrated, fixed queries
- [x] `src/components/OperationalCommandView.tsx` - ✅ Migrated
- [x] `src/components/SecurityDashboard.tsx` - ✅ Import updated
- [x] `src/components/PurchaseOrderDialog.tsx` - ✅ Import updated
- [x] `src/components/NLPQueryExecutor.tsx` - ✅ Fixed variable references
- [x] `src/components/MFAOverrideDialog.tsx` - ✅ Import updated
- [x] `src/components/ContractDialog.tsx` - ✅ Import updated

### Analytics Components - COMPLETED
- [x] `src/components/analytics/OperationalTab.tsx` - ✅ Migrated queries
- [x] `src/components/analytics/SLATab.tsx` - ✅ Migrated queries
- [x] `src/components/analytics/InventoryTab.tsx` - ✅ Migrated queries
- [x] `src/components/analytics/FinancialTab.tsx` - ✅ Migrated queries
- [x] `src/components/analytics/EnhancedSLATab.tsx` - ✅ Migrated all queries

### Other Components - COMPLETED
- [x] `src/components/AddPenaltyRuleDialog.tsx` - ✅ Migrated
- [x] `src/components/AddInventoryItemDialog.tsx` - ✅ Migrated

### Hooks - COMPLETED
- [x] `src/hooks/useOfflineSync.tsx` - ✅ Fully migrated

---

## Migration Pattern

### 1. Import Statement
```typescript
// Before
import { supabase } from '@/integrations/api/client';
// or
import { supabase } from '@/integrations/supabase/client';

// After
import { apiClient } from '@/integrations/api/client';
```

### 2. Query Pattern
```typescript
// Before
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('id', value)
  .single();

// After
const { data, error } = await apiClient
  .from('table')
  .select('*')
  .eq('id', value)
  .limit(1)
  .then();
  
const record = data?.[0]; // apiClient returns array, not single object
```

### 3. Insert Pattern
```typescript
// Before
const { data, error } = await supabase
  .from('table')
  .insert({ field: 'value' })
  .select()
  .single();

// After
const { data, error } = await apiClient
  .from('table')
  .insert({ field: 'value' })
  .then();

const created = Array.isArray(data) ? data[0] : data;
```

### 4. Update Pattern
```typescript
// Before
const { error } = await supabase
  .from('table')
  .update({ field: 'value' })
  .eq('id', id);

// After
const { error } = await apiClient
  .from('table')
  .update({ field: 'value' })
  .eq('id', id)
  .then();
```

### 5. Functions Invoke
```typescript
// Before
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { param: 'value' }
});

// After
const result = await apiClient.functions.invoke('function-name', {
  body: { param: 'value' }
});
// result.data, result.error
```

---

## Common Issues & Fixes

### Issue 1: Undefined Variables
```typescript
// Wrong
const { data, error } = await apiClient.functions.invoke(...);
console.log(data, error); // These don't exist

// Correct
const result = await apiClient.functions.invoke(...);
console.log(result.data, result.error);
```

### Issue 2: Single vs Array Returns
```typescript
// apiClient returns arrays, not single objects
const { data } = await apiClient.from('table').select('*').eq('id', id).limit(1).then();
const record = data?.[0]; // Get first item
```

### Issue 3: Missing .then() Call
```typescript
// apiClient queries need .then() to execute
await apiClient.from('table').insert(data).then(); // Don't forget .then()
```

---

## Testing Checklist

After migrating each file:
- [ ] Check for TypeScript/linter errors
- [ ] Verify imports are correct
- [ ] Test the component functionality
- [ ] Check console for API errors
- [ ] Verify data loading/updating works

---

## Verification Commands

```bash
# Check for remaining supabase imports
grep -r "from.*supabase" src/

# Check for supabase method calls
grep -r "supabase\\.from\|supabase\\.auth\|supabase\\.storage" src/

# Count remaining files
grep -r "from.*supabase" src/ | wc -l
```

---

## Progress Tracking

- **Started:** November 25, 2025
- **Completed:** November 25, 2025
- **Component Files Migrated:** 21/21 (100%) ✅
- **Remaining Work:** Page-level migrations (31 files in `src/pages/`) - Lower priority, can be done incrementally

---

## Notes

- All files should use `apiClient` from `@/integrations/api/client`
- The old `supabase` export is an alias but should be replaced for clarity
- Some components may need additional context providers (useAuth, etc.)
- Test each component after migration to ensure functionality

