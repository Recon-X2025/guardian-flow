# Guardian Flow Backend Server

Backend API server replacing Supabase with local PostgreSQL.

## Setup

### 1. Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from https://www.postgresql.org/download/windows/

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE guardianflow;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE guardianflow TO postgres;
\q
```

### 3. Install Dependencies

```bash
cd server
npm install
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 5. Initialize Database Schema

```bash
# Run initial schema
psql -U postgres -d guardianflow -f scripts/init-db.sql

# Run migrations
npm run migrate
```

### 6. Start Server

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
- **pg** - PostgreSQL client
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication

## Production Deployment

For Vultr deployment:
1. Set up PostgreSQL database on Vultr
2. Update `.env` with production database credentials
3. Set strong `JWT_SECRET`
4. Configure `FRONTEND_URL` to your domain
5. Use PM2 or similar process manager:
   ```bash
   npm install -g pm2
   pm2 start server.js --name guardian-flow
   ```

