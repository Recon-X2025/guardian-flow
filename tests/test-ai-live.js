#!/usr/bin/env node
/**
 * Live AI Integration Test
 * Tests all AI endpoints with real GPT-4o
 */

const API_URL = 'http://localhost:3001';
let token = '';

async function post(path, body = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('LIVE AI INTEGRATION TEST (GPT-4o)');
  console.log('='.repeat(60) + '\n');

  // Authenticate
  console.log('🔐 Authenticating...');
  const auth = await post('/api/auth/signin', { email: 'admin@guardian.dev', password: 'admin123' });
  if (!auth.data.session?.access_token) {
    console.log('❌ Authentication failed');
    process.exit(1);
  }
  token = auth.data.session.access_token;
  console.log('✅ Authenticated\n');

  // 1. System Detect
  console.log('📊 1. SYSTEM DETECT');
  const detect = await post('/api/functions/system-detect', {});
  console.log('   AI Provider:', detect.data.ai_provider);
  console.log('   AI Model:', detect.data.ai_model);
  console.log('   DB Mode:', detect.data.db_mode);
  const isRealAI = detect.data.ai_provider === 'openai';
  console.log('   Status:', isRealAI ? '✅ REAL AI' : '⚠️ MOCK AI');

  // 2. Generate Offers
  console.log('\n🎁 2. GENERATE OFFERS');
  const startOffers = Date.now();
  const offers = await post('/api/functions/generate-offers', {
    workOrderId: '00000000-0000-4000-c000-000000000002',
    customerId: 'cust-001',
  });
  const offersTime = Date.now() - startOffers;
  if (offers.data.offers) {
    console.log('   ✅ Generated', offers.data.offers.length, 'offers in', offersTime, 'ms');
    console.log('   Provider:', offers.data.ai_provider);
    offers.data.offers.forEach((o, i) => {
      console.log(`   ${i + 1}. ${o.title} — $${o.price}`);
    });
  } else {
    console.log('   ❌ Failed:', offers.data.error);
  }

  // 3. Fraud Detection
  console.log('\n🔍 3. FRAUD DETECTION');
  const startFraud = Date.now();
  const fraud = await post('/api/functions/run-fraud-detection', {});
  const fraudTime = Date.now() - startFraud;
  if (fraud.data.success) {
    console.log('   ✅ Completed in', fraudTime, 'ms');
    console.log('   Alerts found:', fraud.data.alerts?.length || 0);
  } else {
    console.log('   ❌ Failed:', fraud.data.error);
  }

  // 4. Predictive Maintenance
  console.log('\n🔧 4. PREDICTIVE MAINTENANCE');
  const startPred = Date.now();
  const pred = await post('/api/functions/predict-maintenance-failures', {});
  const predTime = Date.now() - startPred;
  if (pred.data.success) {
    console.log('   ✅ Completed in', predTime, 'ms');
    console.log('   Predictions:', pred.data.predictions?.length || 0);
    if (pred.data.predictions?.[0]) {
      const p = pred.data.predictions[0];
      console.log(`   Sample: Equipment ${p.equipment_id} — Risk: ${p.risk_level}, Prob: ${(p.failure_probability * 100).toFixed(1)}%`);
    }
  } else {
    console.log('   ❌ Failed:', pred.data.error);
  }

  // 5. Check Warranty
  console.log('\n📋 5. WARRANTY CHECK');
  const warranty = await post('/api/functions/check-warranty', {
    unitSerial: 'SN-SRV-002',
    parts: ['hard_drive', 'memory'],
  });
  if (warranty.status === 200) {
    console.log('   ✅ Warranty Status:', warranty.data.covered ? 'COVERED' : 'NOT COVERED');
    if (warranty.data.warranty_end) {
      console.log('   Expires:', new Date(warranty.data.warranty_end).toLocaleDateString());
    }
  } else {
    console.log('   ❌ Failed:', warranty.data.error);
  }

  // 6. SLA Risk Assessment
  console.log('\n⏱️ 6. SLA RISK ASSESSMENT');
  const sla = await post('/api/functions/assess-sla-risk', {});
  if (sla.data.success || sla.data.assessments) {
    console.log('   ✅ Assessments:', sla.data.assessments?.length || 0);
    if (sla.data.assessments?.[0]) {
      const a = sla.data.assessments[0];
      console.log(`   Sample: WO ${a.wo_number} — Risk: ${a.risk_level}, Breach Prob: ${(a.breach_probability * 100).toFixed(1)}%`);
    }
  } else {
    console.log('   ⚠️ No SLA data or endpoint not available');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`AI Provider: ${detect.data.ai_provider || 'unknown'}`);
  console.log(`AI Model: ${detect.data.ai_model || 'unknown'}`);
  console.log(`Real AI Active: ${isRealAI ? '✅ YES' : '❌ NO'}`);
  console.log('='.repeat(60) + '\n');
}

runTests().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
