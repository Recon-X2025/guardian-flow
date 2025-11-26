#!/bin/bash

# Guardian Flow Quick Start Script
# Sets up development environment quickly

set -e  # Exit on error

echo "🚀 Guardian Flow Quick Start"
echo "============================"
echo ""

# Check prerequisites
echo "1️⃣ Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install Node.js 18+"
  exit 1
fi

if ! command -v psql &> /dev/null; then
  echo "❌ PostgreSQL client not found. Please install PostgreSQL"
  exit 1
fi

if ! pg_isready &> /dev/null; then
  echo "❌ PostgreSQL server is not running. Please start PostgreSQL"
  exit 1
fi

echo "✅ Prerequisites met"
echo ""

# Install dependencies
echo "2️⃣ Installing dependencies..."
if [ ! -d node_modules ]; then
  echo "   Installing root dependencies..."
  npm install
else
  echo "✅ Root dependencies already installed"
fi

if [ ! -d server/node_modules ]; then
  echo "   Installing server dependencies..."
  cd server && npm install && cd ..
else
  echo "✅ Server dependencies already installed"
fi
echo ""

# Database setup
echo "3️⃣ Setting up database..."
if psql -U postgres -d guardianflow -c "SELECT 1;" &>/dev/null; then
  echo "✅ Database connection successful"
  
  # Check if tables exist
  TABLE_COUNT=$(psql -U postgres -d guardianflow -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
  
  if [ "$TABLE_COUNT" -lt 5 ]; then
    echo "   Creating database schema..."
    psql -U postgres -d guardianflow -f server/scripts/init-db.sql
    echo "✅ Schema created"
  else
    echo "✅ Database schema exists ($TABLE_COUNT tables)"
  fi
else
  echo "   Creating database..."
  createdb guardianflow 2>/dev/null || echo "⚠️  Database may already exist"
  echo "   Creating schema..."
  psql -U postgres -d guardianflow -f server/scripts/init-db.sql
  echo "✅ Database created"
fi
echo ""

# Run migrations
echo "4️⃣ Running migrations..."
cd server
npm run migrate 2>/dev/null || echo "⚠️  Migrations may have already run"
cd ..
echo ""

# Environment configuration
echo "5️⃣ Checking environment configuration..."
if [ ! -f server/.env ]; then
  echo "   Creating server/.env from template..."
  cat > server/.env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=guardianflow
DB_USER=postgres
DB_PASSWORD=postgres

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
  echo "✅ Created server/.env"
  echo "⚠️  Please update server/.env with your credentials"
else
  echo "✅ server/.env already exists"
fi
echo ""

# Enable payment gateways
echo "6️⃣ Setting up payment gateways..."
if [ -f server/.env ]; then
  cd server
  node scripts/setup-payment-gateways.js 2>/dev/null || echo "⚠️  Payment gateway setup may need manual configuration"
  cd ..
  echo "✅ Payment gateways configured"
else
  echo "⚠️  Skipping - server/.env not found"
fi
echo ""

echo "============================"
echo "✅ Quick start complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Update server/.env with your credentials"
echo "   2. Start backend: cd server && npm run dev"
echo "   3. Start frontend: npm run dev (in another terminal)"
echo "   4. Open http://localhost:5175"
echo ""
echo "📚 See BUILD_EXECUTION_GUIDE.md for detailed instructions"

