# Server Setup Instructions

## Quick Start

### 1. Create Environment File

Create `server/.env` with the following content:

```env
# Database Configuration
MONGODB_URI=mongodb+srv://vivekkumar787067_db_user:Vivek09876@cluster0.xdkbkkd.mongodb.net/
MONGODB_DB_NAME=guardianflow

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
### 2. Set Up MongoDB Atlas Connection

```bash
# No local database setup required - using MongoDB Atlas cloud
# The connection is configured in your .env file

# Run migrations (creates collections if needed)
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
- Ensure MongoDB Atlas connection string is correct in `server/.env`
- Check that your IP address is whitelisted in MongoDB Atlas
- Verify credentials: `MONGODB_URI` and `MONGODB_DB_NAME`
- Test connection: `node -e "require('mongodb').MongoClient.connect(process.env.MONGODB_URI, (err, client) => { console.log(err ? 'Error: ' + err : 'Connected!'); client && client.close(); })"`

### Port Already in Use
- Change `PORT` in `server/.env`
- Or stop the process using port 3001

### Module Not Found Errors
- Run `npm install` in the `server` directory
- Ensure you're using Node.js 18+

## Next Steps

1. Start the frontend: `npm run dev` (from project root)
2. Test authentication at `/auth`
3. Migrate more API function handlers as needed

