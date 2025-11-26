# ⚠️ Database Setup Required

**Issue:** PostgreSQL is not running, which is causing sign-in failures.

## Quick Fix

### Option 1: Install PostgreSQL via Homebrew (Recommended for macOS)

```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify it's running
lsof -i :5432
```

### Option 2: Use Docker (Alternative)

If you have Docker installed:

```bash
# Run PostgreSQL in Docker
docker run --name guardianflow-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=guardianflow \
  -p 5432:5432 \
  -d postgres:15

# Wait a few seconds for it to start
sleep 5

# Verify it's running
docker ps | grep guardianflow-db
```

### Option 3: Install PostgreSQL from Official Website

1. Download PostgreSQL from: https://www.postgresql.org/download/macosx/
2. Install the package
3. Start PostgreSQL from System Preferences or via command line

---

## After PostgreSQL is Running

### 1. Create Database (if not already created)

```bash
# Connect to PostgreSQL
psql postgres

# In psql, run:
CREATE DATABASE guardianflow;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE guardianflow TO postgres;
\q
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

The server should automatically reconnect once PostgreSQL is running.

---

## Verify Setup

```bash
# Check PostgreSQL is running
lsof -i :5432

# Test database connection
cd server
node -e "import('./db/client.js').then(() => console.log('✅ Connected')).catch(e => console.error('❌ Error:', e.message))"
```

---

## Current Status

- ✅ `.env` file created in `server/` directory
- ❌ PostgreSQL not installed/running
- ❌ Database connection failing
- ❌ Sign-in endpoint returning 500 error

---

## Next Steps

1. **Install and start PostgreSQL** (choose one option above)
2. **Create the database** (if not already done)
3. **Run database setup script**: `cd server && node scripts/setup-database.js`
4. **Restart backend server** (it should auto-reconnect)
5. **Try signing in again** at http://localhost:5175/auth

---

**Note:** The `.env` file has been created with default values. Once PostgreSQL is running, the application should work correctly.

