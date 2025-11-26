# Quick Start Guide

## ✅ Server Setup Complete!

The server dependencies have been installed and the server is starting.

## 📋 Next Steps

### 1. Create Environment File

Create `server/.env` file with your database credentials:

```bash
cd server
cat > .env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=guardianflow
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Secret (change in production!)
JWT_SECRET=your-secret-key-change-in-production-use-strong-random-string

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8080

# Server Port
PORT=3001

# Storage Configuration
STORAGE_DIR=./storage
PUBLIC_URL=http://localhost:3001
EOF
```

### 2. Set Up PostgreSQL Database

```bash
# Create database (if not exists)
createdb guardianflow

# Run initial schema
psql -U postgres -d guardianflow -f server/scripts/init-db.sql

# Run migrations
cd server
npm run migrate
```

### 3. Verify Server is Running

The server should already be running. Check with:

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","timestamp":"..."}
```

### 4. Start Frontend

In a new terminal:

```bash
# From project root
npm run dev
```

Frontend will start on `http://localhost:8080`

## 🎯 What's Working

✅ **Backend Server** - Running on port 3001
✅ **File Storage** - Local filesystem storage
✅ **WebSocket** - Real-time subscriptions
✅ **Edge Functions** - 5 core functions migrated
✅ **API Client** - Supabase-compatible interface

## 🔧 Troubleshooting

### Server Won't Start
- Check if PostgreSQL is running: `pg_isready`
- Verify database exists: `psql -l | grep guardianflow`
- Check `server/.env` file exists and has correct values

### Database Connection Errors
- Ensure PostgreSQL is installed and running
- Check database credentials in `server/.env`
- Run: `psql -U postgres -d guardianflow -c "SELECT 1;"`

### Port Already in Use
- Change `PORT` in `server/.env` to a different port
- Or stop the process: `lsof -ti:3001 | xargs kill`

## 📚 Documentation

- `MIGRATION_GUIDE.md` - Complete migration guide
- `COMPLETE_MIGRATION_SUMMARY.md` - Feature overview
- `IMPLEMENTATION_STATUS.md` - Implementation status
- `server/README.md` - Backend documentation
- `server/SETUP_INSTRUCTIONS.md` - Detailed setup

## 🚀 Ready to Use!

Your server is running and ready to accept requests. The frontend can now connect to the local PostgreSQL backend instead of Supabase!

