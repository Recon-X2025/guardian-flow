#!/usr/bin/env node
/**
 * MongoDB Setup Script
 * Creates indexes for all collections
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'guardianflow';

async function setup() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log(`Connected to MongoDB: ${DB_NAME}`);
  console.log('Creating indexes...\n');

  const indexes = [
    ['users', { email: 1 }, { unique: true }],
    ['user_roles', { user_id: 1, role: 1 }, { unique: true }],
    ['user_roles', { user_id: 1 }, {}],
    ['profiles', { email: 1 }, {}],
    ['tickets', { tenant_id: 1, status: 1 }, {}],
    ['work_orders', { tenant_id: 1, status: 1 }, {}],
    ['work_orders', { wo_number: 1 }, { unique: true }],
    ['work_orders', { created_at: 1 }, {}],
    ['invoices', { tenant_id: 1, status: 1 }, {}],
    ['invoices', { invoice_number: 1 }, { unique: true }],
    ['stock_levels', { item_id: 1, location_id: 1 }, { unique: true }],
    ['knowledge_base_articles', { title: 'text', content: 'text' }, {}],
    ['knowledge_base_tags', { name: 1 }, { unique: true }],
    ['knowledge_base_article_tags', { article_id: 1, tag_id: 1 }, { unique: true }],
    ['knowledge_base_article_tags', { tag_id: 1 }, {}],
    ['knowledge_base_article_feedback', { article_id: 1, user_id: 1 }, { unique: true }],
    ['mfa_tokens', { expires_at: 1 }, { expireAfterSeconds: 0 }],
    ['health_check_logs', { checked_at: 1 }, { expireAfterSeconds: 86400 * 7 }],
    ['payment_transactions', { invoice_id: 1 }, {}],
    ['payment_transactions', { gateway_transaction_id: 1 }, {}],
    ['faq_feedback', { faq_id: 1, user_id: 1 }, { unique: true }],
    ['faqs', { category_id: 1 }, {}],
    ['customers', { email: 1 }, {}],
    ['customers', { tenant_id: 1 }, {}],
    ['equipment', { tenant_id: 1 }, {}],
    ['equipment', { serial_number: 1 }, {}],
    ['geography_hierarchy', { country: 1, state: 1, city: 1, partner_hub: 1, pin_code: 1 }, { unique: true }],
    ['forecast_queue', { tenant_id: 1, trace_id: 1, status: 1 }, {}],
    ['forecast_outputs', { tenant_id: 1, forecast_type: 1, target_date: 1, geography_key: 1 }, { unique: true }],
    ['permissions', { name: 1 }, { unique: true }],
    ['role_permissions', { role: 1, permission_id: 1 }, { unique: true }],
  ];

  for (const [collection, keys, options] of indexes) {
    try {
      await db.collection(collection).createIndex(keys, options);
      console.log(`  Created index on ${collection}: ${JSON.stringify(keys)}`);
    } catch (error) {
      if (error.code === 85 || error.code === 86) {
        console.log(`  Index already exists on ${collection}: ${JSON.stringify(keys)}`);
      } else {
        console.warn(`  Warning creating index on ${collection}: ${error.message}`);
      }
    }
  }

  console.log('\nSetup complete!');
  await client.close();
}

setup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
