#!/bin/bash

# Setup script for Guardian Flow backend

echo "Setting up Guardian Flow backend..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 18+."
    exit 1
fi

echo "OK: Node.js $(node --version) found"

# Check MongoDB Atlas connectivity
echo ""
echo "Checking MongoDB Atlas connection..."

MONGO_URI=""
if [ -n "${MONGODB_URI:-}" ]; then
  MONGO_URI="$MONGODB_URI"
elif [ -f .env ]; then
  MONGO_URI=$(grep -E '^MONGODB_URI=' .env 2>/dev/null | cut -d '=' -f2- || true)
fi

if [ -z "$MONGO_URI" ]; then
    echo ""
    echo "ERROR: MONGODB_URI is not set."
    echo ""
    echo "MongoDB Atlas Setup Instructions:"
    echo "  1. Go to https://cloud.mongodb.com and create a free cluster"
    echo "  2. Create a database user with read/write access"
    echo "  3. Add your IP address to the Network Access list"
    echo "  4. Get your connection string from: Cluster -> Connect -> Drivers"
    echo "  5. Set MONGODB_URI in your .env file:"
    echo "     MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/guardianflow?retryWrites=true&w=majority"
    echo ""
    exit 1
fi

# Test the connection
if command -v mongosh &>/dev/null; then
  if mongosh "$MONGO_URI" --quiet --eval "db.runCommand({ ping: 1 })" >/dev/null 2>&1; then
    echo "OK: MongoDB Atlas connection successful"
  else
    echo "ERROR: Cannot connect to MongoDB Atlas. Please verify your MONGODB_URI."
    exit 1
  fi
else
  # Fallback: use Node.js to verify
  node -e "
    const { MongoClient } = require('mongodb');
    const client = new MongoClient('$MONGO_URI');
    client.connect()
      .then(() => { console.log('OK: MongoDB Atlas connection successful'); client.close(); process.exit(0); })
      .catch(err => { console.log('ERROR: Cannot connect to MongoDB Atlas -', err.message); process.exit(1); });
  " || exit 1
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Run migrations
echo ""
echo "Running MongoDB migrations..."
npm run migrate

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Verify your .env file has correct MONGODB_URI and other settings"
echo "  2. Run 'npm run dev' to start the server"
