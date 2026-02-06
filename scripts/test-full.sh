#!/usr/bin/env bash
###############################################################################
# test-full.sh - Orchestration script for GuardianFlow AI feature tests
#
# Usage:
#   ./scripts/test-full.sh --layer1   # Component tests only (no server)
#   ./scripts/test-full.sh --layer2   # API integration tests (MongoDB Atlas + backend)
#   ./scripts/test-full.sh --layer3   # E2E Playwright tests (full stack)
#   ./scripts/test-full.sh --all      # All 3 layers in sequence
###############################################################################
set -euo pipefail

# --- Configuration ---
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/guardianflow_test}"
BACKEND_PORT="${PORT:-3001}"
FRONTEND_PORT="5176"

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

LAYER1=false
LAYER2=false
LAYER3=false

# Parse args
for arg in "$@"; do
  case $arg in
    --layer1) LAYER1=true ;;
    --layer2) LAYER2=true ;;
    --layer3) LAYER3=true ;;
    --all)    LAYER1=true; LAYER2=true; LAYER3=true ;;
    *)        echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

if ! $LAYER1 && ! $LAYER2 && ! $LAYER3; then
  echo "Usage: $0 [--layer1] [--layer2] [--layer3] [--all]"
  exit 1
fi

# Track results
L1_RESULT="skipped"
L2_RESULT="skipped"
L3_RESULT="skipped"

# PIDs to clean up
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo -e "\n${YELLOW}Cleaning up...${NC}"
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  echo -e "${GREEN}Cleanup complete.${NC}"
}
trap cleanup EXIT

# ---- Shared: MongoDB Connection Check ----
check_mongodb() {
  echo -e "${YELLOW}Verifying MongoDB connection...${NC}"

  echo -n "Connecting to MongoDB..."
  if command -v mongosh &>/dev/null; then
    if mongosh "$MONGODB_URI" --quiet --eval "db.runCommand({ ping: 1 })" >/dev/null 2>&1; then
      echo -e " ${GREEN}ready${NC}"
      return 0
    fi
  else
    # Fallback: use Node.js to verify connectivity
    if node -e "
      const { MongoClient } = require('mongodb');
      const client = new MongoClient('$MONGODB_URI');
      client.connect().then(() => { client.close(); process.exit(0); }).catch(() => process.exit(1));
    " 2>/dev/null; then
      echo -e " ${GREEN}ready${NC}"
      return 0
    fi
  fi

  echo -e " ${RED}FAILED${NC}"
  echo -e "${RED}Cannot connect to MongoDB. Ensure MONGODB_URI is set correctly.${NC}"
  return 1
}

run_migrations() {
  echo -e "${YELLOW}Running migrations...${NC}"
  MONGODB_URI="$MONGODB_URI" \
    node server/scripts/migrate.js || echo "Migrations warning (non-fatal)"

  echo -e "${YELLOW}Creating missing collections...${NC}"
  MONGODB_URI="$MONGODB_URI" \
    node server/scripts/create-missing-tables.js || echo "Create-collections warning (non-fatal)"
}

seed_data() {
  echo -e "${YELLOW}Seeding test data...${NC}"
  MONGODB_URI="$MONGODB_URI" \
    node scripts/test-seed-pg.js
}

start_backend() {
  echo -e "${YELLOW}Starting backend on port $BACKEND_PORT...${NC}"
  MONGODB_URI="$MONGODB_URI" \
    AI_PROVIDER=mock JWT_SECRET=test-secret-key PORT="$BACKEND_PORT" \
    node server/server.js &
  BACKEND_PID=$!

  echo -n "Waiting for backend..."
  for i in $(seq 1 30); do
    if curl -sf "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
      echo -e " ${GREEN}ready${NC}"
      return 0
    fi
    sleep 1
    echo -n "."
  done
  echo -e " ${RED}TIMEOUT${NC}"
  return 1
}

start_frontend() {
  echo -e "${YELLOW}Starting frontend on port $FRONTEND_PORT...${NC}"
  VITE_API_URL="http://localhost:$BACKEND_PORT" \
    npx vite --port "$FRONTEND_PORT" --host localhost &
  FRONTEND_PID=$!

  echo -n "Waiting for frontend..."
  for i in $(seq 1 30); do
    if curl -sf "http://localhost:$FRONTEND_PORT/" >/dev/null 2>&1; then
      echo -e " ${GREEN}ready${NC}"
      return 0
    fi
    sleep 1
    echo -n "."
  done
  echo -e " ${RED}TIMEOUT${NC}"
  return 1
}

# ==============================================================================
# LAYER 1: Component Tests
# ==============================================================================
if $LAYER1; then
  echo -e "\n${GREEN}======== LAYER 1: Component Tests ========${NC}"
  if npx vitest run tests/components/ --reporter=verbose; then
    L1_RESULT="PASS"
  else
    L1_RESULT="FAIL"
  fi
fi

# ==============================================================================
# LAYER 2: API Integration Tests
# ==============================================================================
if $LAYER2; then
  echo -e "\n${GREEN}======== LAYER 2: API Integration Tests ========${NC}"

  check_mongodb
  run_migrations
  seed_data
  start_backend

  export API_URL="http://localhost:$BACKEND_PORT"

  if npx jest tests/api/ai-*.api.test.js --runInBand --forceExit; then
    L2_RESULT="PASS"
  else
    L2_RESULT="FAIL"
  fi

  # Stop backend (will be restarted for layer 3 if needed)
  kill "$BACKEND_PID" 2>/dev/null || true
  BACKEND_PID=""
fi

# ==============================================================================
# LAYER 3: E2E Playwright Tests
# ==============================================================================
if $LAYER3; then
  echo -e "\n${GREEN}======== LAYER 3: E2E Playwright Tests ========${NC}"

  # Verify MongoDB connectivity if layer 3 is run standalone
  check_mongodb
  run_migrations
  seed_data

  start_backend
  start_frontend

  export PLAYWRIGHT_TEST_BASE_URL="http://localhost:$FRONTEND_PORT"

  if npx playwright test tests/e2e/ai-features.spec.ts; then
    L3_RESULT="PASS"
  else
    L3_RESULT="FAIL"
  fi
fi

# ==============================================================================
# Summary
# ==============================================================================
echo -e "\n${GREEN}======== TEST SUMMARY ========${NC}"
echo -e "Layer 1 (Component):   ${L1_RESULT}"
echo -e "Layer 2 (API):         ${L2_RESULT}"
echo -e "Layer 3 (E2E):         ${L3_RESULT}"
echo ""

# Exit with failure if any layer failed
if [ "$L1_RESULT" = "FAIL" ] || [ "$L2_RESULT" = "FAIL" ] || [ "$L3_RESULT" = "FAIL" ]; then
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi

echo -e "${GREEN}All tests passed.${NC}"
exit 0
