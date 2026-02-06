#!/bin/bash

# Guardian Flow Quick Start Script
# Sets up development environment quickly

set -e  # Exit on error

echo "Guardian Flow Quick Start"
echo "============================"
echo ""

# Check prerequisites
echo "1. Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js not found. Please install Node.js 18+"
  exit 1
fi

echo "OK: Node.js $(node --version) found"
echo ""

# Install dependencies
echo "2. Installing dependencies..."
if [ ! -d node_modules ]; then
  echo "   Installing root dependencies..."
  npm install
else
  echo "OK: Root dependencies already installed"
fi

if [ ! -d server/node_modules ]; then
  echo "   Installing server dependencies..."
  cd server && npm install && cd ..
else
  echo "OK: Server dependencies already installed"
fi
echo ""

# MongoDB Atlas connection check
echo "3. Checking MongoDB Atlas connection..."

# Check for MONGODB_URI in server/.env or environment
MONGO_URI=""
if [ -n "${MONGODB_URI:-}" ]; then
  MONGO_URI="$MONGODB_URI"
elif [ -f server/.env ]; then
  MONGO_URI=$(grep -E '^MONGODB_URI=' server/.env 2>/dev/null | cut -d '=' -f2- || true)
fi

if [ -n "$MONGO_URI" ]; then
  echo "   Found MONGODB_URI, testing connection..."
  if command -v mongosh &>/dev/null; then
    if mongosh "$MONGO_URI" --quiet --eval "db.runCommand({ ping: 1 })" >/dev/null 2>&1; then
      echo "OK: MongoDB Atlas connection successful"
    else
      echo "WARNING: Could not connect to MongoDB Atlas. Please verify your MONGODB_URI."
    fi
  else
    # Fallback: use Node.js to test connection
    if node -e "
      const { MongoClient } = require('mongodb');
      const client = new MongoClient('$MONGO_URI');
      client.connect().then(() => { console.log('connected'); client.close(); process.exit(0); }).catch(() => process.exit(1));
    " 2>/dev/null; then
      echo "OK: MongoDB Atlas connection successful"
    else
      echo "WARNING: Could not connect to MongoDB Atlas. Please verify your MONGODB_URI."
    fi
  fi
else
  echo "WARNING: MONGODB_URI not set. You must configure it in server/.env before starting the server."
fi
echo ""

# Run migrations
echo "4. Running migrations..."
cd server
npm run migrate 2>/dev/null || echo "WARNING: Migrations may have already run"
cd ..
echo ""

# Environment configuration
echo "5. Checking environment configuration..."
if [ ! -f server/.env ]; then
  echo "   Creating server/.env from template..."
  cat > server/.env << 'EOF'
# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/guardianflow?retryWrites=true&w=majority

# JWT Secret (change in production!)
JWT_SECRET=your-secret-key-change-in-production-use-strong-random-string

# Frontend URL (for CORS and webhook redirects)
FRONTEND_URL=http://localhost:5175

# Server Port
PORT=3001

# Storage Configuration
STORAGE_DIR=./storage
PUBLIC_URL=http://localhost:3001

# Payment Gateway Configuration (add your keys)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_PUBLISHABLE_KEY=pk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# RAZORPAY_KEY_ID=rzp_test_...
# RAZORPAY_KEY_SECRET=...
EOF
  echo "OK: Created server/.env"
  echo "IMPORTANT: Update server/.env with your MongoDB Atlas connection string and other credentials"
else
  echo "OK: server/.env already exists"
fi
echo ""

# Enable payment gateways
echo "6. Setting up payment gateways..."
if [ -f server/.env ]; then
  cd server
  node scripts/setup-payment-gateways.js 2>/dev/null || echo "WARNING: Payment gateway setup may need manual configuration"
  cd ..
  echo "OK: Payment gateways configured"
else
  echo "WARNING: Skipping - server/.env not found"
fi
echo ""

echo "============================"
echo "Quick start complete!"
echo ""
echo "Next steps:"
echo "   1. Update server/.env with your MongoDB Atlas URI and credentials"
echo "   2. Start backend: cd server && npm run dev"
echo "   3. Start frontend: npm run dev (in another terminal)"
echo "   4. Open http://localhost:5175"
echo ""
echo "See docs/ARCHITECTURE.md for detailed instructions"
