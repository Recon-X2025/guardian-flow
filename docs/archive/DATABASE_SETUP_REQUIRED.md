# ⚠️ Database Setup Required

**Issue:** MongoDB Atlas is not running, which is causing sign-in failures.

## Quick Fix

### Option 1: Use MongoDB Atlas Cloud (Recommended)

1. Create a free cluster at https://cloud.mongodb.com
2. Get your connection string (MONGODB_URI)
3. Add it to your `server/.env` file

### Option 2: Install MongoDB Community via Homebrew (macOS)

```bash
# Install MongoDB Community
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Verify it's running
lsof -i :27017
```

### Option 3: Use Docker (Alternative)

If you have Docker installed:

```bash
# Run MongoDB in Docker
docker run --name guardianflow-db \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -p 27017:27017 \
  -d mongo:7

# Wait a few seconds for it to start
sleep 5

# Verify it's running
docker ps | grep guardianflow-db
```

---

## After MongoDB Atlas is Running

### 1. Create Database (if not already created)

```bash
# Connect to MongoDB
mongosh

# In mongosh, run:
use guardianflow
db.createUser({ user: "appuser", pwd: "password", roles: [{ role: "readWrite", db: "guardianflow" }] })
```

### 2. Initialize Database Schema

```bash
cd server
node scripts/setup-database.js
```

This will:
- Create the database if it doesn't exist
- Run the initial schema
- Apply migrations (including payment status)

### 3. Restart Backend Server

The server should automatically reconnect once MongoDB Atlas is running.

---

## Verify Setup

```bash
# Check MongoDB is running
lsof -i :27017

# Test database connection
cd server
node -e "import('./db/client.js').then(() => console.log('✅ Connected')).catch(e => console.error('❌ Error:', e.message))"
```

---

## Current Status

- ✅ `.env` file created in `server/` directory
- ❌ MongoDB Atlas not installed/running
- ❌ Database connection failing
- ❌ Sign-in endpoint returning 500 error

---

## Next Steps

1. **Install and start MongoDB Atlas** (choose one option above)
2. **Create the database** (if not already done)
3. **Run database setup script**: `cd server && node scripts/setup-database.js`
4. **Restart backend server** (it should auto-reconnect)
5. **Try signing in again** at http://localhost:5175/auth

---

**Note:** The `.env` file has been created with default values. Once MongoDB Atlas is running, the application should work correctly.

