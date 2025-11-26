#!/bin/bash
echo "🚀 Starting Guardian Flow Servers..."
echo ""

# Kill any existing processes
echo "Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5175 | xargs kill -9 2>/dev/null || true

echo ""
echo "📦 Starting Backend Server..."
cd server
npm run dev &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

sleep 3

echo ""
echo "📦 Starting Frontend Server..."
cd ..
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ Servers starting!"
echo ""
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:5175"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

wait
