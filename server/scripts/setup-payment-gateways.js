/**
 * Setup Payment Gateways
 * Enables payment gateways in the database for testing
 */

import { query } from '../db/query.js';
import pool from '../db/client.js';
import dotenv from 'dotenv';

dotenv.config();

async function setupGateways() {
  try {
    console.log('🔧 Setting up payment gateways...');

    // Enable Stripe (test mode)
    await query(`
      UPDATE payment_gateways 
      SET enabled = true, test_mode = true
      WHERE provider = 'stripe'
    `);
    console.log('✅ Stripe enabled (test mode)');

    // Enable Razorpay (test mode)
    await query(`
      UPDATE payment_gateways 
      SET enabled = true, test_mode = true
      WHERE provider = 'razorpay'
    `);
    console.log('✅ Razorpay enabled (test mode)');

    // Enable Manual and Bank Transfer (always enabled)
    await query(`
      UPDATE payment_gateways 
      SET enabled = true, test_mode = false
      WHERE provider IN ('manual', 'bank_transfer')
    `);
    console.log('✅ Manual/Bank Transfer enabled');

    // Verify gateways
    const result = await query(`
      SELECT provider, name, enabled, test_mode 
      FROM payment_gateways 
      WHERE enabled = true
      ORDER BY provider
    `);

    console.log('\n📊 Enabled Gateways:');
    result.rows.forEach(gw => {
      console.log(`  - ${gw.name} (${gw.provider}) - ${gw.test_mode ? 'TEST MODE' : 'LIVE'}`);
    });

    console.log('\n✅ Payment gateway setup complete!');
  } catch (error) {
    console.error('❌ Error setting up gateways:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupGateways();

