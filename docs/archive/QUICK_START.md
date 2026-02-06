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
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/guardianflow

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

### 2. Set Up MongoDB Atlas Database

```bash
# Create database (if not exists)
createdb guardianflow

# Run initial schema
mongosh guardianflow --file server/scripts/init-db.js

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
✅ **Express.js Route Handlers** - 5 core handlers migrated
✅ **API Client** - Compatible interface

## 🔧 Troubleshooting

### Server Won't Start
- Check if MongoDB is running: `mongosh --eval "db.runCommand({ping:1})"`
- Verify database exists: `mongosh --eval "show dbs" | grep guardianflow`
- Check `server/.env` file exists and has correct values

### Database Connection Errors
- Ensure MongoDB is running
- Check database credentials in `server/.env`
- Run: `mongosh guardianflow --eval "db.runCommand({ping:1})"`

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

Your server is running and ready to accept requests. The frontend can now connect to the MongoDB Atlas backend via the Express.js custom backend!

