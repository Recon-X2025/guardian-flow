# How to Run Database Migrations

## 🔍 **Issue**
`psql` command not found in PATH. PostgreSQL might be installed but not accessible directly.

---

## ✅ **Solution Options**

### **Option 1: Find and Use Full Path to psql**

PostgreSQL is often installed via Homebrew. Try these paths:

```bash
# Try common Homebrew locations
/usr/local/bin/psql
/opt/homebrew/bin/psql
/usr/local/opt/postgresql@15/bin/psql
/usr/local/opt/postgresql/bin/psql

# Or find it
find /usr -name psql 2>/dev/null
```

### **Option 2: Use Node.js Migration Script**

Check if there's a Node.js migration runner:

```bash
cd server
npm run migrate
```

### **Option 3: Add PostgreSQL to PATH**

If PostgreSQL is installed via Homebrew:

```bash
# Add to your ~/.zshrc or ~/.bashrc
export PATH="/usr/local/opt/postgresql@15/bin:$PATH"
# or
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Then reload
source ~/.zshrc  # or source ~/.bashrc
```

### **Option 4: Use PostgreSQL GUI Tool**

If you have pgAdmin or another PostgreSQL GUI:
- Open the SQL query tool
- Copy the contents of the migration files
- Paste and execute

---

## 📝 **Migration Files to Run**

### **1. FAQ System**
File: `server/scripts/migrations/add-faq-system.sql`

### **2. Payment Gateways**
File: `server/scripts/migrations/add-payment-gateways.sql`

---

## 🔧 **Manual Execution Steps**

1. **Find PostgreSQL installation:**
   ```bash
   brew services list | grep postgresql
   ```

2. **Get full path to psql:**
   ```bash
   brew --prefix postgresql@15
   # Then: <path>/bin/psql
   ```

3. **Run migrations:**
   ```bash
   <full-path-to-psql> -U postgres -d guardianflow -f server/scripts/migrations/add-faq-system.sql
   <full-path-to-psql> -U postgres -d guardianflow -f server/scripts/migrations/add-payment-gateways.sql
   ```

---

## 🚀 **Quick Alternative: Use Node.js**

If the backend server has database access, we can create a Node.js script to run migrations:

```bash
cd server
node scripts/run-migration.js add-faq-system.sql
node scripts/run-migration.js add-payment-gateways.sql
```

---

## 📋 **What Happens After Migrations**

Once migrations run successfully:
1. ✅ FAQ tables created
2. ✅ Payment gateway tables created
3. ✅ Default data inserted
4. ✅ Customer Portal features will work!

