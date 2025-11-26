#!/bin/bash

# Guardian Flow Status Check Script
# Quick health check for development environment

echo "🔍 Guardian Flow Status Check"
echo "=============================="
echo ""

# Check Node.js version
echo "📦 Node.js Version:"
node --version 2>/dev/null || echo "❌ Node.js not found"
echo ""

# Check PostgreSQL
echo "🗄️  PostgreSQL:"
if pg_isready &>/dev/null; then
  echo "✅ PostgreSQL is running"
  psql -U postgres -d guardianflow -c "SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tail -1 || echo "⚠️  Cannot connect to database"
else
  echo "❌ PostgreSQL is not running"
fi
echo ""

# Check Backend Server
echo "🔧 Backend Server:"
if curl -s http://localhost:3001/health &>/dev/null; then
  echo "✅ Backend is running on port 3001"
  curl -s http://localhost:3001/health | grep -q "ok" && echo "✅ Health check passed" || echo "⚠️  Health check failed"
else
  echo "❌ Backend is not running on port 3001"
fi
echo ""

# Check Frontend Server
echo "🎨 Frontend Server:"
if curl -s http://localhost:5175 &>/dev/null; then
  echo "✅ Frontend is running on port 5175"
else
  echo "❌ Frontend is not running on port 5175"
fi
echo ""

# Check Payment Gateways
echo "💳 Payment Gateways:"
if psql -U postgres -d guardianflow &>/dev/null; then
  psql -U postgres -d guardianflow -t -c "SELECT provider || ' - ' || CASE WHEN enabled THEN 'ENABLED' ELSE 'DISABLED' END FROM payment_gateways ORDER BY provider;" 2>/dev/null | sed 's/^/   /' || echo "⚠️  Cannot check gateways"
else
  echo "⚠️  Cannot connect to database"
fi
echo ""

# Check Environment Variables
echo "🔐 Environment Variables:"
if [ -f server/.env ]; then
  echo "✅ server/.env exists"
  if grep -q "STRIPE_SECRET_KEY=sk_test_" server/.env 2>/dev/null; then
    echo "✅ Stripe configured"
  else
    echo "⚠️  Stripe not configured"
  fi
  if grep -q "RAZORPAY_KEY_ID=rzp_test_" server/.env 2>/dev/null; then
    echo "✅ Razorpay configured"
  else
    echo "⚠️  Razorpay not configured"
  fi
else
  echo "❌ server/.env not found"
fi
echo ""

# Check Dependencies
echo "📚 Dependencies:"
if [ -d node_modules ] && [ -d server/node_modules ]; then
  echo "✅ Dependencies installed"
else
  echo "⚠️  Some dependencies missing - run: npm install && cd server && npm install"
fi
echo ""

echo "=============================="
echo "✅ Status check complete!"

