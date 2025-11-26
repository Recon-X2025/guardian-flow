# Server Setup Instructions

## Quick Start

### 1. Create Environment File

Create `server/.env` with the following content:

```env
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

# Payment Gateway Configuration (Optional - for payment testing)

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Razorpay (Test Mode)
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_secret_here

# PayPal (Sandbox Mode - Optional)
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
PAYPAL_MODE=sandbox
```
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
read_file

### 2. Set Up PostgreSQL Database

```bash
# Create database
createdb guardianflow

# Run initial schema
psql -U postgres -d guardianflow -f server/scripts/init-db.sql

# Run migrations
cd server
npm run migrate
```

### 3. Start the Server

```bash
cd server
npm run dev
```

The server will start on `http://localhost:3001`

### 4. Verify Server is Running

```bash
curl http://localhost:3001/health
```

You should see:
```json
{"status":"ok","timestamp":"..."}
```

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running: `pg_isready`
- Check credentials in `server/.env`
- Verify database exists: `psql -l | grep guardianflow`

### Port Already in Use
- Change `PORT` in `server/.env`
- Or stop the process using port 3001

### Module Not Found Errors
- Run `npm install` in the `server` directory
- Ensure you're using Node.js 18+

## Next Steps

1. Start the frontend: `npm run dev` (from project root)
2. Test authentication at `/auth`
3. Migrate more edge functions as needed

