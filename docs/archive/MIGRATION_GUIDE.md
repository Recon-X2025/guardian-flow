# Migration Guide: Supabase to Local PostgreSQL

This guide explains the changes made to replace Supabase with local PostgreSQL.

## What Changed

### Backend
- **New Express.js server** (`server/`) replaces Supabase backend
- **PostgreSQL** replaces Supabase database
- **JWT authentication** replaces Supabase Auth
- **REST API** replaces Supabase Edge Functions

### Frontend
- **API Client** (`src/integrations/api/client.ts`) replaces Supabase client
- **AuthContext** updated to use new API
- **Database queries** now go through REST API instead of direct Supabase calls

## Setup Instructions

### 1. Install PostgreSQL

See `server/README.md` for installation instructions.

### 2. Set Up Database

```bash
# Create database
createdb guardianflow

# Run initial schema
psql -U postgres -d guardianflow -f server/scripts/init-db.sql

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
DB_HOST=localhost
DB_PORT=5432
DB_NAME=guardianflow
DB_USER=postgres
DB_PASSWORD=postgres
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
- **Before:** `supabase.auth.signInWithPassword()`
- **After:** `apiClient.signIn()` → `POST /api/auth/signin`

### Database Queries
- **Before:** `supabase.from('table').select('*').eq('id', value)`
- **After:** `apiClient.from('table').select('*').eq('id', value)` (same interface, different backend)

### Edge Functions
- **Before:** `supabase.functions.invoke('function-name', { body })`
- **After:** `apiClient.functions.invoke('function-name', { body })` → `POST /api/functions/function-name`

## Migration Status

✅ **Completed:**
- Database client setup
- Authentication system
- Basic CRUD operations
- API client wrapper
- Auth context migration

⚠️ **Needs Implementation:**
- Edge functions (currently return 501)
- File storage/uploads
- Real-time subscriptions (WebSockets)
- Advanced query features (joins, aggregations)

## Edge Functions Migration

Supabase Edge Functions need to be migrated to Express routes:

1. Copy function from `supabase/functions/function-name/index.ts`
2. Create route in `server/routes/functions.js` or separate file
3. Update frontend to use new endpoint

Example:
```javascript
// server/routes/functions.js
router.post('/generate-offers', authenticateToken, async (req, res) => {
  // Migrate logic from supabase/functions/generate-offers
});
```

## Database Schema Changes

- `auth.users` → `users` (with `password_hash` field)
- All foreign keys updated to reference `users(id)`
- RLS (Row Level Security) policies removed (implement in application layer if needed)
- Supabase folder and all edge functions removed
- Migrations preserved in `server/migrations` (if needed)

## Testing

1. Start PostgreSQL
2. Start backend server
3. Start frontend
4. Test authentication flow
5. Test database operations

## Troubleshooting

**Database connection error:**
- Check PostgreSQL is running
- Verify credentials in `server/.env`
- Check database exists: `psql -l | grep guardianflow`

**CORS errors:**
- Verify `FRONTEND_URL` in `server/.env` matches frontend URL
- Check backend CORS configuration

**Authentication errors:**
- Verify JWT_SECRET is set
- Check token in localStorage
- Verify backend is running

## Next Steps

1. Migrate remaining edge functions
2. Implement file storage (local filesystem or S3)
3. Add WebSocket support for real-time features
4. Set up production database on Vultr
5. Configure reverse proxy (nginx)
6. Set up SSL certificates

