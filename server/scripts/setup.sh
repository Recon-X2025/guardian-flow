#!/bin/bash

# Setup script for Guardian Flow backend

echo "🚀 Setting up Guardian Flow backend..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install it first."
    exit 1
fi

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw guardianflow; then
    echo "✅ Database 'guardianflow' already exists"
else
    echo "📦 Creating database 'guardianflow'..."
    createdb guardianflow
    echo "✅ Database created"
fi

# Run initial schema
echo "📋 Running initial schema..."
psql -U postgres -d guardianflow -f scripts/init-db.sql

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run migrations
echo "🔄 Running migrations..."
npm run migrate

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy server/.env.example to server/.env"
echo "2. Update server/.env with your database credentials"
echo "3. Run 'npm run dev' to start the server"

