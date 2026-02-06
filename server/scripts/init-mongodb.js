#!/usr/bin/env node
/**
 * Initialize MongoDB collections and indexes
 * Run this after first deployment to set up optimal indexes
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vivekkumar787067_db_user:Vivek09876@cluster0.xdkbkkd.mongodb.net/';
const DB_NAME = process.env.DB_NAME || 'guardianflow';

async function initMongoDB() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Connected to MongoDB: ${DB_NAME}`);

    // --- Users & Auth ---
    console.log('\nCreating indexes for users & auth...');
    await db.collection('users').createIndex({ email: 1 }, { unique: true }).catch(() => {});
    await db.collection('users').createIndex({ active: 1 }).catch(() => {});
    await db.collection('user_roles').createIndex({ user_id: 1, role: 1 }, { unique: true }).catch(() => {});
    await db.collection('user_roles').createIndex({ user_id: 1 }).catch(() => {});
    await db.collection('profiles').createIndex({ id: 1 }, { unique: true }).catch(() => {});
    await db.collection('profiles').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('refresh_tokens').createIndex({ token_hash: 1 }).catch(() => {});
    await db.collection('refresh_tokens').createIndex({ user_id: 1 }).catch(() => {});
    await db.collection('token_blacklist').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
    await db.collection('token_blacklist').createIndex({ jti: 1 }).catch(() => {});
    await db.collection('user_token_revocations').createIndex({ user_id: 1 }).catch(() => {});
    await db.collection('password_reset_tokens').createIndex({ token: 1 }, { unique: true }).catch(() => {});
    await db.collection('password_reset_tokens').createIndex({ user_id: 1 }).catch(() => {});
    console.log('  Users & auth indexes created');

    // --- Work Orders & Tickets ---
    console.log('Creating indexes for work orders & tickets...');
    await db.collection('work_orders').createIndex({ status: 1 }).catch(() => {});
    await db.collection('work_orders').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('work_orders').createIndex({ assigned_to: 1 }).catch(() => {});
    await db.collection('work_orders').createIndex({ wo_number: 1 }, { unique: true, sparse: true }).catch(() => {});
    await db.collection('work_orders').createIndex({ customer_id: 1 }).catch(() => {});
    await db.collection('work_orders').createIndex({ created_at: -1 }).catch(() => {});
    await db.collection('tickets').createIndex({ status: 1 }).catch(() => {});
    await db.collection('tickets').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('service_requests').createIndex({ status: 1 }).catch(() => {});
    await db.collection('service_orders').createIndex({ status: 1 }).catch(() => {});
    console.log('  Work orders & tickets indexes created');

    // --- Customers & Equipment ---
    console.log('Creating indexes for customers & equipment...');
    await db.collection('customers').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('customers').createIndex({ email: 1 }).catch(() => {});
    await db.collection('equipment').createIndex({ customer_id: 1 }).catch(() => {});
    await db.collection('equipment').createIndex({ tenant_id: 1 }).catch(() => {});
    console.log('  Customers & equipment indexes created');

    // --- Financial ---
    console.log('Creating indexes for financial...');
    await db.collection('invoices').createIndex({ customer_id: 1 }).catch(() => {});
    await db.collection('invoices').createIndex({ invoice_number: 1 }, { unique: true, sparse: true }).catch(() => {});
    await db.collection('invoices').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('invoices').createIndex({ created_at: -1 }).catch(() => {});
    await db.collection('payments').createIndex({ invoice_id: 1 }).catch(() => {});
    await db.collection('payments').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('quotes').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('penalties').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('payment_gateways').createIndex({ enabled: 1 }).catch(() => {});
    await db.collection('payment_history').createIndex({ payment_id: 1 }).catch(() => {});
    console.log('  Financial indexes created');

    // --- Technicians ---
    console.log('Creating indexes for technicians...');
    await db.collection('technicians').createIndex({ status: 1 }).catch(() => {});
    await db.collection('technicians').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('technicians').createIndex({ availability: 1 }).catch(() => {});
    console.log('  Technician indexes created');

    // --- Contracts & Warranties ---
    console.log('Creating indexes for contracts & warranties...');
    await db.collection('contracts').createIndex({ status: 1 }).catch(() => {});
    await db.collection('contracts').createIndex({ customer_id: 1 }).catch(() => {});
    await db.collection('contracts').createIndex({ contract_number: 1 }, { unique: true, sparse: true }).catch(() => {});
    await db.collection('warranties').createIndex({ equipment_id: 1 }).catch(() => {});
    console.log('  Contracts & warranties indexes created');

    // --- Knowledge Base & FAQs ---
    console.log('Creating indexes for knowledge base & FAQs...');
    await db.collection('knowledge_base_articles').createIndex(
      { title: 'text', content: 'text', summary: 'text' },
      { weights: { title: 10, summary: 5, content: 1 } }
    ).catch(() => {});
    await db.collection('knowledge_base_articles').createIndex({ status: 1 }).catch(() => {});
    await db.collection('knowledge_base_articles').createIndex({ category_id: 1 }).catch(() => {});
    await db.collection('faqs').createIndex(
      { question: 'text', answer: 'text' },
      { weights: { question: 10, answer: 1 } }
    ).catch(() => {});
    await db.collection('faqs').createIndex({ published: 1 }).catch(() => {});
    await db.collection('faqs').createIndex({ category_id: 1 }).catch(() => {});
    console.log('  Knowledge base & FAQs indexes created');

    // --- Documents ---
    console.log('Creating indexes for documents...');
    await db.collection('documents').createIndex({ entity_type: 1, entity_id: 1 }).catch(() => {});
    await db.collection('documents').createIndex({ tenant_id: 1 }).catch(() => {});
    console.log('  Documents indexes created');

    // --- ML & AI ---
    console.log('Creating indexes for ML & AI...');
    await db.collection('ml_models').createIndex({ model_type: 1, status: 1 }).catch(() => {});
    await db.collection('ml_models').createIndex({ model_name: 1, tenant_id: 1 }).catch(() => {});
    await db.collection('model_registry').createIndex({ active: 1 }).catch(() => {});
    await db.collection('maintenance_predictions').createIndex({ equipment_id: 1 }).catch(() => {});
    await db.collection('maintenance_predictions').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('asset_lifecycle_events').createIndex({ asset_id: 1 }).catch(() => {});
    await db.collection('asset_lifecycle_events').createIndex({ event_type: 1 }).catch(() => {});
    await db.collection('asset_lifecycle_events').createIndex({ event_time: -1 }).catch(() => {});
    console.log('  ML & AI indexes created');

    // --- Forecast ---
    console.log('Creating indexes for forecast...');
    await db.collection('forecast_models').createIndex({ model_type: 1, algorithm: 1 }).catch(() => {});
    await db.collection('forecast_models').createIndex({ model_key: 1 }, { unique: true, sparse: true }).catch(() => {});
    await db.collection('forecast_outputs').createIndex({ target_date: 1 }).catch(() => {});
    await db.collection('forecast_outputs').createIndex({ forecast_type: 1 }).catch(() => {});
    await db.collection('forecast_outputs').createIndex({ tenant_id: 1, target_date: 1 }).catch(() => {});
    await db.collection('forecast_outputs').createIndex({ tenant_id: 1, product_id: 1, geography_level: 1, geography_key: 1, forecast_type: 1, target_date: 1 }).catch(() => {});
    await db.collection('forecast_queue').createIndex({ status: 1, created_at: 1 }).catch(() => {});
    await db.collection('forecast_history').createIndex({ forecast_date: 1 }).catch(() => {});
    await db.collection('geography_hierarchy').createIndex({ country: 1, state: 1, city: 1, partner_hub: 1, pin_code: 1 }).catch(() => {});
    console.log('  Forecast indexes created');

    // --- Fraud & Security ---
    console.log('Creating indexes for fraud & security...');
    await db.collection('fraud_alerts').createIndex({ status: 1 }).catch(() => {});
    await db.collection('fraud_alerts').createIndex({ investigation_status: 1 }).catch(() => {});
    await db.collection('fraud_alerts').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('detected_anomalies').createIndex({ status: 1 }).catch(() => {});
    await db.collection('detected_anomalies').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('forgery_detections').createIndex({ work_order_id: 1 }).catch(() => {});
    await db.collection('forgery_detections').createIndex({ review_status: 1 }).catch(() => {});
    await db.collection('forgery_batch_jobs').createIndex({ status: 1 }).catch(() => {});
    await db.collection('forgery_model_metrics').createIndex({ model_type: 1, is_active: 1 }).catch(() => {});
    await db.collection('forgery_monitoring_alerts').createIndex({ status: 1 }).catch(() => {});
    console.log('  Fraud & security indexes created');

    // --- Compliance ---
    console.log('Creating indexes for compliance...');
    await db.collection('compliance_controls').createIndex({ framework: 1 }).catch(() => {});
    await db.collection('compliance_controls').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('compliance_evidence').createIndex({ control_id: 1 }).catch(() => {});
    console.log('  Compliance indexes created');

    // --- SLA ---
    console.log('Creating indexes for SLA...');
    await db.collection('sla_records').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('sla_configurations').createIndex({ tenant_id: 1 }).catch(() => {});
    console.log('  SLA indexes created');

    // --- Suppliers ---
    console.log('Creating indexes for suppliers...');
    await db.collection('suppliers').createIndex({ status: 1 }).catch(() => {});
    await db.collection('suppliers').createIndex({ tenant_id: 1 }).catch(() => {});
    console.log('  Suppliers indexes created');

    // --- Logging ---
    console.log('Creating indexes for logging...');
    await db.collection('frontend_error_logs').createIndex({ category: 1 }).catch(() => {});
    await db.collection('frontend_error_logs').createIndex({ created_at: -1 }).catch(() => {});
    await db.collection('governance_logs').createIndex({ tenant_id: 1, created_at: -1 }).catch(() => {});
    console.log('  Logging indexes created');

    // --- Partners & Marketplace ---
    console.log('Creating indexes for partners & marketplace...');
    await db.collection('partners').createIndex({ tenant_id: 1 }).catch(() => {});
    await db.collection('marketplace_apps').createIndex({ tenant_id: 1 }).catch(() => {});
    console.log('  Partners & marketplace indexes created');

    console.log('\nAll indexes created successfully!');
  } catch (err) {
    console.error('Error initializing MongoDB:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

initMongoDB();
