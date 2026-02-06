# Guardian Flow Backend Server

Backend API server powered by MongoDB Atlas.

## Setup

### 1. MongoDB Atlas Setup

The application uses MongoDB Atlas cloud database. No local installation required.

**Connection String:**
```
mongodb+srv://vivekkumar787067_db_user:Vivek09876@cluster0.xdkbkkd.mongodb.net/
```

**Database Name:**
```
guardianflow
```

### 2. Install Dependencies

```bash
cd server
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your MongoDB connection details
```

Add to your `.env` file:
```env
MONGODB_URI=mongodb+srv://vivekkumar787067_db_user:Vivek09876@cluster0.xdkbkkd.mongodb.net/
MONGODB_DB_NAME=guardianflow
```

### 4. Initialize Database Collections

```bash
# The server will automatically connect to MongoDB Atlas
# Collections are created on first use
npm run migrate
```

### 5. Start Server

```bash
npm run dev
```

The server will run on http://localhost:3001

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Sign up new user
- `POST /api/auth/signin` - Sign in
- `GET /api/auth/user` - Get current user
- `POST /api/auth/signout` - Sign out

### Database
- `POST /api/db/query` - Generic database query
- `GET /api/db/:table/:id` - Get single row
- `POST /api/db/:table` - Insert row
- `PATCH /api/db/:table/:id` - Update row
- `DELETE /api/db/:table/:id` - Delete row

### Functions
- `POST /api/functions/:functionName` - Edge function replacements

## Development

The server uses:
- **Express.js** - Web framework
- **mongodb** - MongoDB client
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication

## Production Deployment

For Vultr deployment:
1. Use MongoDB Atlas cloud database (already configured)
2. Update `.env` with production MongoDB credentials
3. Set strong `JWT_SECRET`
4. Configure `FRONTEND_URL` to your domain
5. Use PM2 or similar process manager:
   ```bash
   npm install -g pm2
   pm2 start server.js --name guardian-flow
   ```

