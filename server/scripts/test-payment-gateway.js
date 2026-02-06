/**
 * Test Payment Gateway Configuration
 * Verifies gateway credentials and endpoints are working
 */

import { MongoClient } from 'mongodb';
import paymentGatewayService from '../services/paymentGateways.js';
import dotenv from 'dotenv';

dotenv.config();

async function testPaymentGateways() {
  const client = new MongoClient(process.env.MONGODB_URI);
  console.log('Testing Payment Gateway Configuration...\n');

  try {
    await client.connect();
    const db = client.db('guardianflow');

    // 1. Check database gateways
    console.log('1. Checking database gateways...');
    const gateways = await db.collection('payment_gateways').find(
      {},
      { projection: { provider: 1, name: 1, enabled: 1, test_mode: 1 } }
    ).sort({ provider: 1 }).toArray();

    console.log(`   Found ${gateways.length} gateways:\n`);
    gateways.forEach(gw => {
      const status = gw.enabled ? 'ENABLED' : 'DISABLED';
      const mode = gw.test_mode ? '(TEST MODE)' : '(LIVE)';
      console.log(`   - ${gw.name} (${gw.provider}): ${status} ${mode}`);
    });

    // 2. Check environment variables
    console.log('\n2. Checking environment variables...\n');

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
        console.log(`   ${valid ? 'OK' : 'WARN'} ${check.name}: ${valid ? 'Configured' : 'Invalid format'}`);
        if (!valid && check.prefix) {
          console.log(`      Expected format: ${check.prefix}...`);
        }
      } else {
        console.log(`   MISSING ${check.name}: Not configured`);
      }
    });

    // 3. Test gateway service initialization
    console.log('\n3. Testing gateway service initialization...\n');

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
            console.log(`   OK ${gw.provider}: Gateway working (test intent created)`);
          } else {
            console.log(`   WARN ${gw.provider}: Gateway configured but test failed: ${result.error}`);
          }
        } else {
          console.log(`   OK ${gw.provider}: Gateway service initialized`);
        }
      } catch (error) {
        console.log(`   ERROR ${gw.provider}: Error - ${error.message}`);
      }
    }

    // 4. Check webhook endpoints
    console.log('\n4. Webhook Endpoint URLs:\n');
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
    const apiUrl = baseUrl.replace('5175', '3001');

    enabledGateways.forEach(gw => {
      console.log(`   ${gw.provider}: ${apiUrl}/api/payments/webhook/${gw.provider}`);
    });

    // 5. Summary
    console.log('\n5. Summary:\n');
    const configuredCount = envChecks.filter(check => {
      const value = process.env[check.var];
      return value && value !== `your_${check.var.toLowerCase()}_here` && value.length > 10;
    }).length;

    console.log(`   Environment Variables: ${configuredCount}/${envChecks.length} configured`);
    console.log(`   Enabled Gateways: ${enabledGateways.length}/${gateways.length}`);

    if (configuredCount === envChecks.length && enabledGateways.length > 0) {
      console.log('\n   Payment gateways are ready for testing!');
    } else {
      console.log('\n   Some gateways need configuration. See PAYMENT_GATEWAY_SETUP.md');
    }

  } catch (error) {
    console.error('\nError testing gateways:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

testPaymentGateways();
