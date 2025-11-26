#!/bin/bash
# Quick script to check and start servers

echo "🔍 Checking Server Status..."
echo ""

# Check Backend
echo "Backend (Port 3001):"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "  ✅ RUNNING"
else
    echo "  ❌ NOT RUNNING"
    echo "  Starting backend server..."
    cd server && npm run dev &
    echo "  ⏳ Wait 10 seconds for backend to start"
fi

echo ""
echo "Frontend (Port 5175):"
if curl -s http://localhost:5175 > /dev/null 2>&1; then
    echo "  ✅ RUNNING"
else
    echo "  ❌ NOT RUNNING"
    echo "  Start with: npm run dev"
fi

echo ""
echo "📊 Next Steps:"
echo "1. Wait 10-15 seconds for backend to fully start"
echo "2. Refresh browser (Cmd+Shift+R)"
echo "3. Try logging in again"

