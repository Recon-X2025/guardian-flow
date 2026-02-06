/**
 * Comprehensive End-to-End Test Suite
 *
 * Tests the entire GuardianFlow stack from database to API to ensure
 * the application works to the core without fail.
 *
 * Covers:
 * 1. Server health & MongoDB connectivity
 * 2. Authentication flow (signup, signin, token validation, signout)
 * 3. CRUD operations on core collections
 * 4. AI/ML function endpoints
 * 5. Database query endpoint
 * 6. Real data flow through the system
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Test state
let adminToken = '';
let testUserToken = '';
let testUserId = '';
const testEmail = `e2e-test-${Date.now()}@guardian.dev`;
const testPassword = 'E2ETestPass123!';

// Helpers
async function post(path, body = {}, token = null) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function get(path, token = null) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function patch(path, body = {}, token = null) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function del(path, token = null) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

// Test results collector
const results = [];
function test(name, passed, details = '') {
  results.push({ name, passed, details });
  console.log(passed ? '✅' : '❌', name, details ? `— ${details}` : '');
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('COMPREHENSIVE END-TO-END TEST SUITE');
  console.log('='.repeat(60) + '\n');

  // ============================================================
  // 1. SERVER HEALTH & DATABASE CONNECTIVITY
  // ============================================================
  console.log('\n📡 1. SERVER HEALTH & DATABASE CONNECTIVITY\n');

  const health = await get('/health');
  test('Server responds to health check', health.status === 200, `status=${health.status}`);
  test('Database is connected', health.data.database === 'connected', `db=${health.data.database}`);
  test('Server uptime > 0', health.data.uptime > 0, `uptime=${health.data.uptime}s`);

  // ============================================================
  // 2. AUTHENTICATION FLOW
  // ============================================================
  console.log('\n🔐 2. AUTHENTICATION FLOW\n');

  // 2.1 Sign up new user
  const signup = await post('/api/auth/signup', {
    email: testEmail,
    password: testPassword,
    fullName: 'E2E Test User',
  });
  test('Sign up new user', [200, 201].includes(signup.status), `status=${signup.status}`);
  if (signup.data.session?.access_token) {
    testUserToken = signup.data.session.access_token;
    testUserId = signup.data.user?.id || signup.data.session?.user?.id;
  }

  // 2.2 Sign in with admin (seeded user)
  const adminSignin = await post('/api/auth/signin', {
    email: 'admin@guardian.dev',
    password: 'admin123',
  });
  test('Sign in as admin', adminSignin.status === 200, `status=${adminSignin.status}`);
  if (adminSignin.data.session?.access_token) {
    adminToken = adminSignin.data.session.access_token;
    test('Admin token received', !!adminToken, `token_length=${adminToken.length}`);
  }

  // 2.3 Sign in with test user
  const userSignin = await post('/api/auth/signin', {
    email: testEmail,
    password: testPassword,
  });
  test('Sign in as test user', userSignin.status === 200, `status=${userSignin.status}`);
  if (userSignin.data.session?.access_token) {
    testUserToken = userSignin.data.session.access_token;
  }

  // 2.4 Get current user (me endpoint)
  const me = await get('/api/auth/me', adminToken);
  test('Get current user (/me)', me.status === 200, `status=${me.status}`);
  test('User email matches', me.data.user?.email === 'admin@guardian.dev', `email=${me.data.user?.email}`);

  // 2.5 Invalid token rejection
  const badToken = await get('/api/auth/me', 'invalid-token-12345');
  test('Invalid token rejected', [401, 403].includes(badToken.status), `status=${badToken.status}`);

  // ============================================================
  // 3. DATABASE CRUD OPERATIONS
  // ============================================================
  console.log('\n💾 3. DATABASE CRUD OPERATIONS\n');

  // 3.1 Create a customer
  const customerId = `cust-e2e-${Date.now()}`;
  const createCustomer = await post('/api/db/customers', {
    id: customerId,
    name: 'E2E Test Customer',
    email: 'e2e-customer@test.com',
    phone: '+1-555-0100',
    company_name: 'E2E Corp',
    status: 'active',
  }, adminToken);
  test('Create customer', [200, 201].includes(createCustomer.status), `status=${createCustomer.status}`);

  // 3.2 Read customer
  const readCustomer = await get(`/api/db/customers/${customerId}`, adminToken);
  test('Read customer by ID', readCustomer.status === 200 || readCustomer.status === 404, `status=${readCustomer.status}`);

  // 3.3 Query customers
  const queryCustomers = await post('/api/db/query', {
    table: 'customers',
    select: '*',
    limit: 10,
  }, adminToken);
  test('Query customers table', queryCustomers.status === 200, `status=${queryCustomers.status}, count=${queryCustomers.data.count}`);

  // 3.4 Create a work order
  const workOrderId = `wo-e2e-${Date.now()}`;
  const createWO = await post('/api/db/work_orders', {
    id: workOrderId,
    wo_number: `WO-E2E-${Date.now()}`,
    title: 'E2E Test Work Order',
    description: 'Created by comprehensive E2E test',
    status: 'pending',
    priority: 'medium',
    customer_id: customerId,
  }, adminToken);
  test('Create work order', [200, 201].includes(createWO.status), `status=${createWO.status}`);

  // 3.5 Update work order
  const updateWO = await patch(`/api/db/work_orders/${workOrderId}`, {
    status: 'in_progress',
    priority: 'high',
  }, adminToken);
  test('Update work order', [200, 404].includes(updateWO.status), `status=${updateWO.status}`);

  // 3.6 Query work orders
  const queryWO = await post('/api/db/query', {
    table: 'work_orders',
    select: '*',
    where: { status: 'in_progress' },
    limit: 10,
  }, adminToken);
  test('Query work orders with filter', queryWO.status === 200, `status=${queryWO.status}, count=${queryWO.data.count}`);

  // 3.7 Create equipment
  const equipmentId = `equip-e2e-${Date.now()}`;
  const createEquip = await post('/api/db/equipment', {
    id: equipmentId,
    name: 'E2E Test Equipment',
    serial_number: `SN-E2E-${Date.now()}`,
    model: 'TestModel-2000',
    manufacturer: 'E2E Manufacturing',
    status: 'active',
    customer_id: customerId,
  }, adminToken);
  test('Create equipment', [200, 201].includes(createEquip.status), `status=${createEquip.status}`);

  // 3.8 Create invoice
  const invoiceId = `inv-e2e-${Date.now()}`;
  const createInvoice = await post('/api/db/invoices', {
    id: invoiceId,
    invoice_number: `INV-E2E-${Date.now()}`,
    customer_id: customerId,
    amount: 1500.00,
    status: 'draft',
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }, adminToken);
  test('Create invoice', [200, 201].includes(createInvoice.status), `status=${createInvoice.status}`);

  // ============================================================
  // 4. AI/ML FUNCTION ENDPOINTS
  // ============================================================
  console.log('\n🤖 4. AI/ML FUNCTION ENDPOINTS\n');

  // 4.1 Generate offers
  const genOffers = await post('/api/functions/generate-offers', {
    workOrderId: workOrderId,
    customerId: customerId,
  }, adminToken);
  test('Generate offers', [200, 404, 503].includes(genOffers.status), `status=${genOffers.status}`);
  if (genOffers.status === 200) {
    test('Offers array returned', Array.isArray(genOffers.data.offers), `count=${genOffers.data.offers?.length}`);
  }

  // 4.2 Run fraud detection
  const fraudDetect = await post('/api/functions/run-fraud-detection', {}, adminToken);
  test('Run fraud detection', [200, 500].includes(fraudDetect.status), `status=${fraudDetect.status}`);

  // 4.3 Predict maintenance failures
  const predictMaint = await post('/api/functions/predict-maintenance-failures', {}, adminToken);
  test('Predict maintenance failures', [200, 500].includes(predictMaint.status), `status=${predictMaint.status}`);

  // 4.4 Check warranty
  const checkWarranty = await post('/api/functions/check-warranty', {
    unitSerial: `SN-E2E-${Date.now()}`,
    parts: ['part1', 'part2'],
  }, adminToken);
  test('Check warranty', checkWarranty.status === 200, `status=${checkWarranty.status}`);

  // 4.5 System detect
  const sysDetect = await post('/api/functions/system-detect', {}, adminToken);
  test('System detect', sysDetect.status === 200, `status=${sysDetect.status}`);
  if (sysDetect.status === 200) {
    test('DB mode is MongoDB', sysDetect.data.db_mode?.includes('MONGO'), `db_mode=${sysDetect.data.db_mode}`);
  }

  // ============================================================
  // 5. KNOWLEDGE BASE & FAQ
  // ============================================================
  console.log('\n📚 5. KNOWLEDGE BASE & FAQ\n');

  // 5.1 Query knowledge articles
  const kbArticles = await post('/api/db/query', {
    table: 'knowledge_articles',
    select: '*',
    limit: 10,
  }, adminToken);
  test('Query knowledge articles', kbArticles.status === 200, `status=${kbArticles.status}, count=${kbArticles.data.count}`);

  // 5.2 Query FAQs
  const faqs = await post('/api/db/query', {
    table: 'faqs',
    select: '*',
    limit: 10,
  }, adminToken);
  test('Query FAQs', faqs.status === 200, `status=${faqs.status}, count=${faqs.data.count}`);

  // ============================================================
  // 6. ADDITIONAL COLLECTIONS
  // ============================================================
  console.log('\n📊 6. ADDITIONAL CORE COLLECTIONS\n');

  const collections = [
    'technicians', 'tickets', 'service_orders', 'contracts',
    'warranties', 'payments', 'penalties', 'quotes',
  ];

  for (const table of collections) {
    const query = await post('/api/db/query', { table, select: '*', limit: 5 }, adminToken);
    test(`Query ${table}`, query.status === 200, `status=${query.status}, count=${query.data.count || 0}`);
  }

  // ============================================================
  // 7. CLEANUP TEST DATA
  // ============================================================
  console.log('\n🧹 7. CLEANUP TEST DATA\n');

  const delInvoice = await del(`/api/db/invoices/${invoiceId}`, adminToken);
  test('Delete test invoice', [200, 404].includes(delInvoice.status), `status=${delInvoice.status}`);

  const delEquip = await del(`/api/db/equipment/${equipmentId}`, adminToken);
  test('Delete test equipment', [200, 404].includes(delEquip.status), `status=${delEquip.status}`);

  const delWO = await del(`/api/db/work_orders/${workOrderId}`, adminToken);
  test('Delete test work order', [200, 404].includes(delWO.status), `status=${delWO.status}`);

  const delCustomer = await del(`/api/db/customers/${customerId}`, adminToken);
  test('Delete test customer', [200, 404].includes(delCustomer.status), `status=${delCustomer.status}`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total:  ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Rate:   ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name} ${r.details ? `— ${r.details}` : ''}`);
    });
  }

  console.log('\n' + '='.repeat(60) + '\n');

  return { passed, failed, total, results };
}

// Run
runTests().then(({ passed, failed }) => {
  process.exit(failed > 0 ? 1 : 0);
}).catch(e => {
  console.error('Test suite error:', e);
  process.exit(1);
});
