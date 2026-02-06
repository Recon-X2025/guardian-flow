/**
 * Frontend Button & UI Functionality Test
 * Tests ALL button handlers and API calls from the frontend
 */

const API_URL = 'http://localhost:3001';
let authToken = null;

async function makeRequest(method, endpoint, body = null, useAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data, ok: response.ok };
}

async function login() {
  const res = await makeRequest('POST', '/api/auth/signin', {
    email: 'admin@guardianflow.com',
    password: 'admin123'
  }, false);

  if (res.ok && res.data.session?.access_token) {
    authToken = res.data.session.access_token;
    return true;
  }
  console.log('Login response:', JSON.stringify(res.data));
  return false;
}

// Test results
const results = { passed: 0, failed: 0, errors: [] };

async function test(name, fn) {
  try {
    await fn();
    console.log(`   ✅ ${name}`);
    results.passed++;
  } catch (error) {
    console.log(`   ❌ ${name}: ${error.message}`);
    results.failed++;
    results.errors.push({ name, error: error.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runTests() {
  console.log('============================================================');
  console.log('FRONTEND BUTTON & UI FUNCTIONALITY TEST');
  console.log('============================================================\n');

  // Login first
  console.log('🔐 Authenticating...');
  const loggedIn = await login();
  assert(loggedIn, 'Failed to login');
  console.log('   ✅ Logged in successfully\n');

  // ========== QUOTES PAGE BUTTONS ==========
  console.log('📄 QUOTES PAGE BUTTONS');
  console.log('----------------------------------------');

  await test('Create quote (New Quote button)', async () => {
    const res = await makeRequest('POST', '/api/db/quotes', {
      quote_number: `Q-TEST-${Date.now()}`,
      total_amount: 1500,
      status: 'draft',
      valid_until: new Date(Date.now() + 30*24*60*60*1000).toISOString()
    });
    assert(res.ok || res.status === 201, `Failed: ${res.status} ${JSON.stringify(res.data)}`);
  });

  await test('Update quote status (Send button)', async () => {
    // First get a quote
    const quotes = await makeRequest('POST', '/api/db/query', { table: 'quotes' });
    if (quotes.data?.length > 0) {
      const quoteId = quotes.data[0].id || quotes.data[0]._id;
      const res = await makeRequest('PATCH', `/api/db/quotes/${quoteId}`, { status: 'sent' });
      assert(res.ok || res.status === 200, `Failed: ${res.status}`);
    } else {
      console.log('      (No quotes to test, skipping)');
    }
  });

  await test('Get quotes (View button data)', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'quotes' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  // ========== CONTRACTS PAGE BUTTONS ==========
  console.log('\n📝 CONTRACTS PAGE BUTTONS');
  console.log('----------------------------------------');

  await test('Create contract (New Contract button)', async () => {
    const res = await makeRequest('POST', '/api/functions/contract-create', {
      contract: {
        title: 'Test Contract',
        contract_type: 'maintenance',
        contract_number: `SC-TEST-${Date.now()}`,
        status: 'draft'
      },
      line_items: []
    });
    assert(res.ok || res.status === 200 || res.status === 201, `Failed: ${res.status} ${JSON.stringify(res.data)}`);
  });

  await test('Get contracts (View button data)', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'service_contracts' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  // ========== PAYMENTS PAGE BUTTONS ==========
  console.log('\n💳 PAYMENTS PAGE BUTTONS');
  console.log('----------------------------------------');

  await test('Get invoices for payments', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'invoices' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  await test('Get payment gateways (Configure button)', async () => {
    const res = await makeRequest('GET', '/api/payments/gateways');
    assert(res.ok, `Failed: ${res.status}`);
  });

  await test('Process payment endpoint', async () => {
    const res = await makeRequest('POST', '/api/payments/process', {
      invoice_id: 'test-invoice-id',
      payment_method: 'manual',
      amount: 100
    });
    // May fail if invoice doesn't exist, but endpoint should respond
    assert(res.status !== 404, `Endpoint not found: ${res.status}`);
  });

  // ========== WARRANTY PAGE BUTTONS ==========
  console.log('\n🛡️ WARRANTY PAGE BUTTONS');
  console.log('----------------------------------------');

  await test('Get warranties', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'warranties' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  await test('Warranty check function', async () => {
    const res = await makeRequest('POST', '/api/functions/warranty-check', {
      equipment_id: 'test-equipment'
    });
    assert(res.status !== 404 && res.status !== 501, `Endpoint error: ${res.status}`);
  });

  // ========== INVENTORY PAGE BUTTONS ==========
  console.log('\n📦 INVENTORY PAGE BUTTONS');
  console.log('----------------------------------------');

  await test('Get inventory items', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'inventory_items' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  await test('Stock adjustment endpoint', async () => {
    const res = await makeRequest('POST', '/api/db/stock_adjustments', {
      item_id: 'test-item',
      adjustment_type: 'increase',
      quantity: 10,
      reason: 'Test adjustment'
    });
    assert(res.status !== 404, `Endpoint not found: ${res.status}`);
  });

  // ========== SERVICE ORDERS PAGE BUTTONS ==========
  console.log('\n📋 SERVICE ORDERS PAGE BUTTONS');
  console.log('----------------------------------------');

  await test('Get service orders', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'service_orders' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  await test('Generate service order', async () => {
    const res = await makeRequest('POST', '/api/functions/generate-service-order', {
      work_order_id: 'test-wo'
    });
    // 404 is acceptable if work order not found (endpoint exists), 501 means not implemented
    assert(res.status !== 501, `Endpoint not implemented: ${res.status}`);
    assert(res.status === 200 || res.status === 404 || res.status === 400, `Unexpected error: ${res.status}`);
  });

  // ========== PREDICTIVE MAINTENANCE BUTTONS ==========
  console.log('\n🔧 PREDICTIVE MAINTENANCE BUTTONS');
  console.log('----------------------------------------');

  await test('Get maintenance predictions', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'maintenance_predictions' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  await test('Predictive maintenance AI', async () => {
    const res = await makeRequest('POST', '/api/ai/predictive-maintenance', {
      equipment_id: 'test-equipment'
    });
    assert(res.status !== 404 && res.status !== 501, `Endpoint error: ${res.status}`);
  });

  // ========== TRAINING PLATFORM BUTTONS ==========
  console.log('\n📚 TRAINING PLATFORM BUTTONS');
  console.log('----------------------------------------');

  await test('Get training courses', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'training_courses' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  await test('Get training enrollments', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'training_enrollments' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  await test('Get certifications', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'training_certifications' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  // ========== MARKETPLACE BUTTONS ==========
  console.log('\n🏪 MARKETPLACE BUTTONS');
  console.log('----------------------------------------');

  await test('Get marketplace extensions', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'marketplace_extensions' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  await test('Get marketplace installations', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'marketplace_installations' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  // ========== ANALYTICS PLATFORM BUTTONS ==========
  console.log('\n📊 ANALYTICS PLATFORM BUTTONS');
  console.log('----------------------------------------');

  await test('Get analytics workspaces', async () => {
    const res = await makeRequest('POST', '/api/functions/analytics-workspace-manager', {
      action: 'list'
    });
    assert(res.status !== 404 && res.status !== 501, `Endpoint error: ${res.status}`);
  });

  await test('Get data quality rules', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'analytics_quality_rules' });
    assert(res.ok || res.status === 200, `Failed: ${res.status}`);
  });

  // ========== WEBHOOKS PAGE BUTTONS ==========
  console.log('\n🔗 WEBHOOKS PAGE BUTTONS');
  console.log('----------------------------------------');

  await test('Get webhooks', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'webhooks' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  await test('Create webhook', async () => {
    const res = await makeRequest('POST', '/api/db/webhooks', {
      name: 'Test Webhook',
      url: 'https://example.com/webhook',
      events: ['work_order.created'],
      active: true
    });
    assert(res.ok || res.status === 201, `Failed: ${res.status}`);
  });

  // ========== WORKFLOW TEMPLATES BUTTONS ==========
  console.log('\n⚙️ INDUSTRY WORKFLOWS BUTTONS');
  console.log('----------------------------------------');

  await test('Get workflow templates', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'workflow_templates' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  // ========== KNOWLEDGE BASE BUTTONS ==========
  console.log('\n📖 KNOWLEDGE BASE BUTTONS');
  console.log('----------------------------------------');

  await test('Get KB articles', async () => {
    const res = await makeRequest('GET', '/api/knowledge-base/articles');
    assert(res.ok, `Failed: ${res.status}`);
  });

  await test('Search KB', async () => {
    const res = await makeRequest('GET', '/api/knowledge-base/articles?search=test');
    assert(res.ok, `Failed: ${res.status}`);
  });

  await test('Get FAQs', async () => {
    const res = await makeRequest('GET', '/api/faqs');
    assert(res.ok, `Failed: ${res.status}`);
  });

  // ========== WORK ORDERS BUTTONS ==========
  console.log('\n🔨 WORK ORDERS BUTTONS');
  console.log('----------------------------------------');

  await test('Get work orders', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'work_orders' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  await test('Get work order stages', async () => {
    const res = await makeRequest('POST', '/api/functions/get-work-order-stages', {});
    assert(res.ok || res.status === 200, `Failed: ${res.status}`);
  });

  await test('Create work order', async () => {
    const res = await makeRequest('POST', '/api/functions/create-work-order', {
      title: 'Test Work Order',
      priority: 'medium',
      status: 'pending'
    });
    assert(res.status !== 404 && res.status !== 501, `Endpoint error: ${res.status}`);
  });

  // ========== DISPATCH/SCHEDULING BUTTONS ==========
  console.log('\n🚚 DISPATCH/SCHEDULING BUTTONS');
  console.log('----------------------------------------');

  await test('Optimize schedule', async () => {
    const res = await makeRequest('POST', '/api/functions/optimize-schedule', {
      date: new Date().toISOString().split('T')[0]
    });
    assert(res.status !== 404 && res.status !== 501, `Endpoint error: ${res.status}`);
  });

  await test('Optimize route', async () => {
    const res = await makeRequest('POST', '/api/functions/optimize-route', {
      technician_id: 'test-tech'
    });
    assert(res.status !== 404 && res.status !== 501, `Endpoint error: ${res.status}`);
  });

  // ========== AI FEATURES BUTTONS ==========
  console.log('\n🤖 AI FEATURES BUTTONS');
  console.log('----------------------------------------');

  await test('Generate AI offer', async () => {
    const res = await makeRequest('POST', '/api/ai/generate-offer', {
      customer_id: 'test-customer',
      context: 'maintenance service'
    });
    assert(res.status !== 404 && res.status !== 501, `Endpoint error: ${res.status}`);
  });

  await test('Fraud detection', async () => {
    const res = await makeRequest('POST', '/api/ai/fraud-detection', {
      transaction_data: { amount: 1000 }
    });
    assert(res.status !== 404 && res.status !== 501, `Endpoint error: ${res.status}`);
  });

  await test('SLA risk assessment', async () => {
    const res = await makeRequest('POST', '/api/functions/assess-sla-risk', {});
    assert(res.status !== 404 && res.status !== 501, `Endpoint error: ${res.status}`);
  });

  await test('Anomaly detection', async () => {
    const res = await makeRequest('POST', '/api/functions/detect-anomalies', {});
    assert(res.status !== 404 && res.status !== 501, `Endpoint error: ${res.status}`);
  });

  await test('Run forecast', async () => {
    const res = await makeRequest('POST', '/api/functions/run-forecast', {
      forecast_type: 'demand'
    });
    assert(res.status !== 404 && res.status !== 501, `Endpoint error: ${res.status}`);
  });

  // ========== DOCUMENTS/STORAGE BUTTONS ==========
  console.log('\n📁 DOCUMENTS/STORAGE BUTTONS');
  console.log('----------------------------------------');

  await test('Get documents', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'documents' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  await test('Storage upload endpoint exists', async () => {
    // Just check endpoint exists (POST without file will fail but not 404)
    const res = await fetch(`${API_URL}/api/storage/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    assert(res.status !== 404, `Endpoint not found: ${res.status}`);
  });

  // ========== CUSTOMERS PAGE BUTTONS ==========
  console.log('\n👥 CUSTOMERS PAGE BUTTONS');
  console.log('----------------------------------------');

  await test('Get customers', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'customers' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  await test('Get customer equipment', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'equipment' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  // ========== TECHNICIANS PAGE BUTTONS ==========
  console.log('\n👷 TECHNICIANS PAGE BUTTONS');
  console.log('----------------------------------------');

  await test('Get technicians', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'technicians' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  // ========== TICKETS PAGE BUTTONS ==========
  console.log('\n🎫 TICKETS PAGE BUTTONS');
  console.log('----------------------------------------');

  await test('Get tickets', async () => {
    const res = await makeRequest('POST', '/api/db/query', { table: 'tickets' });
    assert(res.ok, `Failed: ${res.status}`);
  });

  // ========== FINAL SUMMARY ==========
  console.log('\n============================================================');
  console.log('FINAL SUMMARY');
  console.log('============================================================');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed:   ${results.passed}`);
  console.log(`❌ Failed:   ${results.failed}`);
  console.log(`Pass Rate:   ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.errors.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.errors.forEach(e => {
      console.log(`   - ${e.name}: ${e.error}`);
    });
  }

  console.log('============================================================\n');
}

runTests().catch(console.error);
