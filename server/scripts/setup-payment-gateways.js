/**
 * Setup Payment Gateways
 * Enables payment gateways in the database for testing
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function setupGateways() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('guardianflow');
    console.log('Setting up payment gateways...');

    // Enable Stripe (test mode)
    await db.collection('payment_gateways').updateMany(
      { provider: 'stripe' },
      { $set: { enabled: true, test_mode: true } }
    );
    console.log('Stripe enabled (test mode)');

    // Enable Razorpay (test mode)
    await db.collection('payment_gateways').updateMany(
      { provider: 'razorpay' },
      { $set: { enabled: true, test_mode: true } }
    );
    console.log('Razorpay enabled (test mode)');

    // Enable Manual and Bank Transfer (always enabled)
    await db.collection('payment_gateways').updateMany(
      { provider: { $in: ['manual', 'bank_transfer'] } },
      { $set: { enabled: true, test_mode: false } }
    );
    console.log('Manual/Bank Transfer enabled');

    // Verify gateways
    const gateways = await db.collection('payment_gateways').find(
      { enabled: true },
      { projection: { provider: 1, name: 1, enabled: 1, test_mode: 1 } }
    ).sort({ provider: 1 }).toArray();

    console.log('\nEnabled Gateways:');
    gateways.forEach(gw => {
      console.log(`  - ${gw.name} (${gw.provider}) - ${gw.test_mode ? 'TEST MODE' : 'LIVE'}`);
    });

    console.log('\nPayment gateway setup complete!');
  } catch (error) {
    console.error('Error setting up gateways:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupGateways();
