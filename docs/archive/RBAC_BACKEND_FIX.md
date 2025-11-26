# RBAC Backend Enforcement - Complete Fix

## 🐛 **Problem:**
RBAC was not working because:
1. Backend routes weren't checking permissions
2. No tenant filtering on database queries
3. Database query endpoint was using `optionalAuth` instead of requiring authentication

---

## ✅ **Fixes Applied:**

### **1. Created RBAC Middleware** (`server/middleware/rbac.js`)
- `requirePermission(permission)` - Check if user has specific permission
- `requireAnyPermission(permissions)` - Check if user has any of the permissions
- `requireRole(role)` - Check if user has specific role
- `getUserTenantId(userId)` - Get tenant ID for user
- Falls back to code-based permission checks if DB query fails

### **2. Added Tenant Filtering** (`server/routes/database.js`)
- Database queries now automatically filter by `tenant_id`
- Sys admins can see all tenants
- Regular users only see their tenant's data
- Applied to multi-tenant tables: `work_orders`, `tickets`, `service_requests`, `customers`, `equipment`, `invoices`, `quotes`, `service_orders`

### **3. Changed Authentication** (`server/routes/database.js`)
- Changed `/api/db/query` from `optionalAuth` to `authenticateToken`
- Now requires authentication for all database queries
- Ensures proper tenant isolation

### **4. Enhanced Auth Middleware** (`server/middleware/auth.js`)
- Added role mapping in `authenticateToken`
- Sets both `roles` and `mappedRoles` on `req.user`
- Ensures roles are available for RBAC checks

---

## 🔧 **How It Works Now:**

### **Database Queries:**
1. User makes query → Must be authenticated
2. System gets user's tenant_id from profile
3. Automatically filters results by tenant_id (unless sys_admin)
4. Returns only tenant-specific data

### **Permission Checks:**
1. Route uses `requirePermission('portal.access')`
2. Middleware checks user's roles
3. Queries `role_permissions` table
4. Returns 403 if permission denied
5. Falls back to code-based check if DB fails

---

## 🧪 **Testing:**

### **Check Backend Logs:**
Look for:
- "Permission check failed" - DB query issue
- "Insufficient permissions" - User lacks permission
- "Authentication required" - No token

### **Test Different Roles:**
1. Login as different users with different roles
2. Try accessing Customer Portal
3. Should only see data for your tenant
4. Should only see features you have permissions for

---

## ⚠️ **Important: Restart Backend!**

**The backend server must be restarted** for these changes to take effect:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd server
npm run dev
```

---

## ✅ **Status:**
- ✅ RBAC middleware created
- ✅ Tenant filtering implemented
- ✅ Authentication required for queries
- ✅ Role mapping enhanced
- ⏳ **Backend restart needed**

**Restart the backend server and RBAC should work!** 🔄

