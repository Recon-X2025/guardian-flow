# Misdirected Pages Report

## Summary
Found **4 issues** with page routing and imports:

---

## 🔴 Critical Issues

### 1. **Duplicate Route: `/analytics-platform`**
**Severity**: HIGH - First route will always match, second is unreachable

**Location**: `src/App.tsx`
- **Line 473-479**: Route with permission `["analytics:view"]` - NO AppLayout wrapper
- **Line 627-633**: Route with permission `["audit.read"]` - NO AppLayout wrapper (UNREACHABLE)

**Issue**: React Router will use the first matching route, making the second route definition completely unreachable.

**Fix Required**: Remove one of the duplicate routes or merge them with appropriate logic.

---

### 2. **Unused Import: `Auth.tsx`**
**Severity**: MEDIUM - Dead code, causes confusion

**Location**: `src/App.tsx` line 11
```typescript
import Auth from "./pages/Auth";
```

**Issue**: 
- `Auth.tsx` is imported but never used in routes
- Route at line 136 uses `<UnifiedPlatformAuth />` instead
- File exists at `src/pages/Auth.tsx` but is orphaned

**Fix Required**: 
- Option A: Remove the unused import
- Option B: Add a route using `<Auth />` component (if intentional)

---

## 🟡 Orphaned Pages (Exist but not routed)

### 3. **FunctionTelemetry.tsx**
**Severity**: LOW - Page exists but not accessible

**Location**: `src/pages/FunctionTelemetry.tsx`

**Status**: 
- ✅ File exists
- ❌ Not imported in `App.tsx`
- ❌ No route defined
- ❌ No navigation links found

**Fix Required**: 
- Option A: Add route: `/function-telemetry` or `/telemetry`
- Option B: Remove file if not needed

---

### 4. **ProductSpecs.tsx**
**Severity**: LOW - Page exists but not accessible

**Location**: `src/pages/ProductSpecs.tsx`

**Status**: 
- ✅ File exists
- ❌ Not imported in `App.tsx`
- ❌ No route defined
- ❌ No navigation links found
- ⚠️ Referenced in Dashboard.tsx (download PDF functionality)

**Fix Required**: 
- Option A: Add route: `/product-specs`
- Option B: Keep as component-only (used by Dashboard, not standalone page)

---

## 📊 Statistics

- **Total Pages in `src/pages/`**: 92 files
- **Pages Imported in App.tsx**: 89 imports
- **Pages with Routes**: 88 routes
- **Orphaned Pages**: 2 (FunctionTelemetry, ProductSpecs)
- **Unused Imports**: 1 (Auth)
- **Duplicate Routes**: 1 (/analytics-platform)

---

## ✅ All Other Pages Verified

All other 88 pages are properly:
- ✅ Imported in `App.tsx`
- ✅ Have routes defined
- ✅ Accessible via navigation or direct URL

---

## 🔧 Recommended Actions

1. **URGENT**: Fix duplicate `/analytics-platform` route
2. **HIGH**: Remove unused `Auth` import
3. **LOW**: Decide on `FunctionTelemetry` - add route or remove file
4. **LOW**: Decide on `ProductSpecs` - add route if standalone page needed

