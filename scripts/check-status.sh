#!/bin/bash

# Guardian Flow Status Check Script
# Quick health check for development environment

echo "Guardian Flow Status Check"
echo "=============================="
echo ""

# Check Node.js version
echo "Node.js Version:"
node --version 2>/dev/null || echo "ERROR: Node.js not found"
echo ""

# Check MongoDB Atlas
echo "MongoDB Atlas:"
MONGO_URI=""
if [ -n "${MONGODB_URI:-}" ]; then
  MONGO_URI="$MONGODB_URI"
elif [ -f server/.env ]; then
  MONGO_URI=$(grep -E '^MONGODB_URI=' server/.env 2>/dev/null | cut -d '=' -f2- || true)
fi

if [ -n "$MONGO_URI" ]; then
  if command -v mongosh &>/dev/null; then
    if mongosh "$MONGO_URI" --quiet --eval "db.runCommand({ ping: 1 })" >/dev/null 2>&1; then
      echo "OK: MongoDB Atlas is reachable"
      COLLECTION_COUNT=$(mongosh "$MONGO_URI" --quiet --eval "db.getCollectionNames().length" 2>/dev/null || echo "?")
      echo "   Collections: $COLLECTION_COUNT"
    else
      echo "ERROR: Cannot connect to MongoDB Atlas"
    fi
  else
    # Fallback: use Node.js to test connection
    if node -e "
      const { MongoClient } = require('mongodb');
      const client = new MongoClient('$MONGO_URI');
      client.connect()
        .then(c => c.db().listCollections().toArray())
        .then(cols => { console.log('OK: MongoDB Atlas is reachable'); console.log('   Collections: ' + cols.length); process.exit(0); })
        .catch(() => { console.log('ERROR: Cannot connect to MongoDB Atlas'); process.exit(1); });
    " 2>/dev/null; then
      true  # output already printed by Node
    else
      echo "ERROR: Cannot connect to MongoDB Atlas (and mongosh not installed)"
    fi
  fi
else
  echo "WARNING: MONGODB_URI not set in environment or server/.env"
fi
echo ""

# Check Backend Server
echo "Backend Server:"
if curl -s http://localhost:3001/health &>/dev/null; then
  echo "OK: Backend is running on port 3001"
  curl -s http://localhost:3001/health | grep -q "ok" && echo "OK: Health check passed" || echo "WARNING: Health check failed"
else
  echo "ERROR: Backend is not running on port 3001"
fi
echo ""

# Check Frontend Server
echo "Frontend Server:"
if curl -s http://localhost:5175 &>/dev/null; then
  echo "OK: Frontend is running on port 5175"
else
  echo "ERROR: Frontend is not running on port 5175"
fi
echo ""

# Check Payment Gateways
echo "Payment Gateways:"
if curl -s http://localhost:3001/health &>/dev/null; then
  # Query payment gateways via the backend API health/status endpoint
  GATEWAYS=$(curl -s http://localhost:3001/api/functions/payment-gateways 2>/dev/null)
  if [ -n "$GATEWAYS" ] && [ "$GATEWAYS" != "null" ]; then
    echo "   $GATEWAYS" | head -10
  else
    echo "WARNING: Cannot retrieve gateway status (backend may need auth)"
  fi
else
  echo "WARNING: Backend not running - cannot check gateways"
fi
echo ""

# Check Environment Variables
echo "Environment Variables:"
if [ -f server/.env ]; then
  echo "OK: server/.env exists"
  if grep -q "^MONGODB_URI=" server/.env 2>/dev/null; then
    echo "OK: MONGODB_URI configured"
  else
    echo "WARNING: MONGODB_URI not configured in server/.env"
  fi
  if grep -q "STRIPE_SECRET_KEY=sk_test_" server/.env 2>/dev/null; then
    echo "OK: Stripe configured"
  else
    echo "WARNING: Stripe not configured"
  fi
  if grep -q "RAZORPAY_KEY_ID=rzp_test_" server/.env 2>/dev/null; then
    echo "OK: Razorpay configured"
  else
    echo "WARNING: Razorpay not configured"
  fi
else
  echo "ERROR: server/.env not found"
fi
echo ""

# Check Dependencies
echo "Dependencies:"
if [ -d node_modules ] && [ -d server/node_modules ]; then
  echo "OK: Dependencies installed"
else
  echo "WARNING: Some dependencies missing - run: npm install && cd server && npm install"
fi
echo ""

echo "=============================="
echo "Status check complete!"
