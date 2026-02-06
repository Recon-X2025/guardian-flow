# How to Run Database Migrations

## 🔍 **Issue**
`mongosh` command not found in PATH. MongoDB Atlas might be installed but not accessible directly.

---

## ✅ **Solution Options**

### **Option 1: Find and Use Full Path to mongosh**

MongoDB Atlas is often installed via Homebrew. Try these paths:

```bash
# Try common Homebrew locations
/usr/local/bin/mongosh
/opt/homebrew/bin/mongosh
/usr/local/opt/mongodb-community/bin/mongosh
/usr/local/opt/mongodb-community/bin/mongosh

# Or find it
find /usr -name mongosh 2>/dev/null
```

### **Option 2: Use Node.js Migration Script**

Check if there's a Node.js migration runner:

```bash
cd server
npm run migrate
```

### **Option 3: Add MongoDB Atlas to PATH**

If MongoDB Atlas is installed via Homebrew:

```bash
# Add to your ~/.zshrc or ~/.bashrc
export PATH="/usr/local/opt/mongodb-community/bin:$PATH"
# or
export PATH="/opt/homebrew/opt/mongodb-community/bin:$PATH"

# Then reload
source ~/.zshrc  # or source ~/.bashrc
```

### **Option 4: Use MongoDB Atlas GUI Tool**

If you have MongoDB Compass or the MongoDB Atlas UI:
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

1. **Find MongoDB Atlas installation:**
   ```bash
   brew services list | grep mongodb-community
   ```

2. **Get full path to mongosh:**
   ```bash
   brew --prefix mongodb-community
   # Then: <path>/bin/mongosh
   ```

3. **Run migrations:**
   ```bash
   mongosh guardianflow --file server/scripts/migrations/add-faq-system.sql
   mongosh guardianflow --file server/scripts/migrations/add-payment-gateways.sql
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

