/**
 * Test Payment Gateway Configuration
 * Verifies gateway credentials and endpoints are working
 */

import { query, getOne, getMany } from '../db/query.js';
import paymentGatewayService from '../services/paymentGateways.js';
import pool from '../db/client.js';
import dotenv from 'dotenv';

dotenv.config();

async function testPaymentGateways() {
  console.log('🧪 Testing Payment Gateway Configuration...\n');

  try {
    // 1. Check database gateways
    console.log('1️⃣ Checking database gateways...');
    const gateways = await getMany(
      `SELECT provider, name, enabled, test_mode 
       FROM payment_gateways 
       ORDER BY provider`
    );

    console.log(`   Found ${gateways.length} gateways:\n`);
    gateways.forEach(gw => {
      const status = gw.enabled ? '✅ ENABLED' : '❌ DISABLED';
      const mode = gw.test_mode ? '(TEST MODE)' : '(LIVE)';
      console.log(`   - ${gw.name} (${gw.provider}): ${status} ${mode}`);
    });

    // 2. Check environment variables
    console.log('\n2️⃣ Checking environment variables...\n');
    
    const envChecks = [
      { name: 'Stripe Secret Key', var: 'STRIPE_SECRET_KEY', prefix: 'sk_test_' },
      { name: 'Stripe Publishable Key', var: 'STRIPE_PUBLISHABLE_KEY', prefix: 'pk_test_' },
      { name: 'Razorpay Key ID', var: 'RAZORPAY_KEY_ID', prefix: 'rzp_test_' },
      { name: 'Razorpay Key Secret', var: 'RAZORPAY_KEY_SECRET', prefix: '' },
    ];

    envChecks.forEach(check => {
      const value = process.env[check.var];
      if (value && value !== `your_${check.var.toLowerCase()}_here`) {
        const valid = check.prefix ? value.startsWith(check.prefix) : value.length > 0;
        console.log(`   ${valid ? '✅' : '⚠️'} ${check.name}: ${valid ? 'Configured' : 'Invalid format'}`);
        if (!valid && check.prefix) {
          console.log(`      Expected format: ${check.prefix}...`);
        }
      } else {
        console.log(`   ❌ ${check.name}: Not configured`);
      }
    });

    // 3. Test gateway service initialization
    console.log('\n3️⃣ Testing gateway service initialization...\n');
    
    const enabledGateways = gateways.filter(gw => gw.enabled);
    
    for (const gw of enabledGateways) {
      try {
        console.log(`   Testing ${gw.provider}...`);
        const gateway = await paymentGatewayService.getGateway(gw.provider);
        
        // Try to create a test payment intent (1 cent/1 rupee)
        if (gateway.createPaymentIntent) {
          const currency = gw.provider === 'razorpay' ? 'INR' : 'USD';
          const amount = gw.provider === 'razorpay' ? 100 : 0.01; // 1 rupee or 1 cent
          
          const result = await gateway.createPaymentIntent(amount, currency, {
            test: true,
            description: 'Gateway configuration test'
          });

          if (result.success) {
            console.log(`   ✅ ${gw.provider}: Gateway working (test intent created)`);
          } else {
            console.log(`   ⚠️ ${gw.provider}: Gateway configured but test failed: ${result.error}`);
          }
        } else {
          console.log(`   ✅ ${gw.provider}: Gateway service initialized`);
        }
      } catch (error) {
        console.log(`   ❌ ${gw.provider}: Error - ${error.message}`);
      }
    }

    // 4. Check webhook endpoints
    console.log('\n4️⃣ Webhook Endpoint URLs:\n');
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
    const apiUrl = baseUrl.replace('5175', '3001');
    
    enabledGateways.forEach(gw => {
      console.log(`   ${gw.provider}: ${apiUrl}/api/payments/webhook/${gw.provider}`);
    });

    // 5. Summary
    console.log('\n📊 Summary:\n');
    const configuredCount = envChecks.filter(check => {
      const value = process.env[check.var];
      return value && value !== `your_${check.var.toLowerCase()}_here` && value.length > 10;
    }).length;

    console.log(`   Environment Variables: ${configuredCount}/${envChecks.length} configured`);
    console.log(`   Enabled Gateways: ${enabledGateways.length}/${gateways.length}`);
    
    if (configuredCount === envChecks.length && enabledGateways.length > 0) {
      console.log('\n   ✅ Payment gateways are ready for testing!');
    } else {
      console.log('\n   ⚠️ Some gateways need configuration. See PAYMENT_GATEWAY_SETUP.md');
    }

  } catch (error) {
    console.error('\n❌ Error testing gateways:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testPaymentGateways();

