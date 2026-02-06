# Migration Guide: legacy service to Local MongoDB Atlas

This guide explains the changes made to replace legacy service with local MongoDB Atlas.

## What Changed

### Backend
- **New Express.js server** (`server/`) replaces legacy service backend
- **MongoDB Atlas** replaces legacy service database
- **JWT authentication** replaces legacy service Auth
- **REST API** replaces legacy service Express.js Route Handlers

### Frontend
- **API Client** (`src/integrations/api/client.ts`) replaces legacy service client
- **AuthContext** updated to use new API
- **Database queries** now go through REST API instead of direct legacy service calls

## Setup Instructions

### 1. Install MongoDB Atlas

See `server/README.md` for installation instructions.

### 2. Set Up Database

```bash
# Create database
createdb guardianflow

# Run initial schema
mongosh -U mongodb -d guardianflow -f server/scripts/init-db.sql

# Run migrations
cd server
npm install
npm run migrate
```

### 3. Configure Environment

**Frontend** (`.env`):
```env
VITE_API_URL=http://localhost:3001
```

**Backend** (`server/.env`):
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/guardianflow
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:8080
PORT=3001
```

### 4. Start Services

**Terminal 1 - Backend:**
```bash
cd server
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm install
npm run dev
```

## Key Differences

### Authentication
- **Before:** `apiClient.auth.signInWithPassword()`
- **After:** `apiClient.signIn()` → `POST /api/auth/signin`

### Database Queries
- **Before:** `apiClient.from('table').select('*').eq('id', value)`
- **After:** `apiClient.from('table').select('*').eq('id', value)` (same interface, different backend)

### Express.js Route Handlers
- **Before:** `apiClient.functions.invoke('function-name', { body })`
- **After:** `apiClient.functions.invoke('function-name', { body })` → `POST /api/functions/function-name`

## Migration Status

✅ **Completed:**
- Database client setup
- Authentication system
- Basic CRUD operations
- API client wrapper
- Auth context migration

⚠️ **Needs Implementation:**
- Server route handlers (currently return 501)
- File storage/uploads
- Real-time subscriptions (WebSockets)
- Advanced query features (joins, aggregations)

## Express.js Route Handler Migration

Legacy functions need to be migrated to Express routes:

1. Copy function from `apiClient/functions/function-name/index.ts`
2. Create route in `server/routes/functions.js` or separate file
3. Update frontend to use new endpoint

Example:
```javascript
// server/routes/functions.js
router.post('/generate-offers', authenticateToken, async (req, res) => {
  // Migrate logic from apiClient/functions/generate-offers
});
```

## Database Schema Changes

- `auth.users` → `users` (with `password_hash` field)
- All foreign keys updated to reference `users(id)`
- Application-level tenant isolation implemented (replaces previous Row Level Security approach)
- legacy service folder and all Express.js route handlers removed
- Migrations preserved in `server/migrations` (if needed)

## Testing

1. Start MongoDB Atlas
2. Start backend server
3. Start frontend
4. Test authentication flow
5. Test database operations

## Troubleshooting

**Database connection error:**
- Check MongoDB Atlas is running
- Verify credentials in `server/.env`
- Check database exists: `mongosh -l | grep guardianflow`

**CORS errors:**
- Verify `FRONTEND_URL` in `server/.env` matches frontend URL
- Check backend CORS configuration

**Authentication errors:**
- Verify JWT_SECRET is set
- Check token in localStorage
- Verify backend is running

## Next Steps

1. Migrate remaining Express.js route handlers
2. Implement file storage (local filesystem or S3)
3. Add WebSocket support for real-time features
4. Set up production database on Vultr
5. Configure reverse proxy (nginx)
6. Set up SSL certificates

