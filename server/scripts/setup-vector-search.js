import { getDB, connectDB } from '../db/client.js';
import dotenv from 'dotenv';
dotenv.config();

async function setup() {
  await connectDB();
  const db = getDB();

  console.log('Setting up AI collections and indexes...');

  // Create knowledge_base_chunks collection with text index
  try {
    await db.createCollection('knowledge_base_chunks');
    console.log('Created knowledge_base_chunks collection');
  } catch (e) {
    if (e.codeName !== 'NamespaceExists') console.warn(e.message);
  }

  try {
    await db.collection('knowledge_base_chunks').createIndex(
      { content: 'text', 'metadata.title': 'text' },
      { name: 'chunks_text_index' }
    );
    console.log('Created text index on knowledge_base_chunks');
  } catch (e) { console.warn('Text index:', e.message); }

  try {
    await db.collection('knowledge_base_chunks').createIndex({ article_id: 1 });
    console.log('Created article_id index');
  } catch (e) { console.warn(e.message); }

  // Create ai_usage_logs collection
  try {
    await db.createCollection('ai_usage_logs');
    console.log('Created ai_usage_logs collection');
  } catch (e) {
    if (e.codeName !== 'NamespaceExists') console.warn(e.message);
  }

  try {
    await db.collection('ai_usage_logs').createIndex({ created_at: -1 });
    await db.collection('ai_usage_logs').createIndex({ feature: 1, created_at: -1 });
    console.log('Created ai_usage_logs indexes');
  } catch (e) { console.warn(e.message); }

  // Create detected_anomalies collection
  try {
    await db.createCollection('detected_anomalies');
    await db.collection('detected_anomalies').createIndex({ tenant_id: 1, detected_at: -1 });
    await db.collection('detected_anomalies').createIndex({ type: 1, severity: 1 });
    console.log('Created detected_anomalies collection and indexes');
  } catch (e) {
    if (e.codeName !== 'NamespaceExists') console.warn(e.message);
  }

  // Create ai_governance_logs collection
  try {
    await db.createCollection('ai_governance_logs');
    await db.collection('ai_governance_logs').createIndex({ tenant_id: 1, created_at: -1 });
    await db.collection('ai_governance_logs').createIndex({ model: 1 });
    console.log('Created ai_governance_logs collection and indexes');
  } catch (e) {
    if (e.codeName !== 'NamespaceExists') console.warn(e.message);
  }

  // Create maintenance_predictions collection
  try {
    await db.createCollection('maintenance_predictions');
    await db.collection('maintenance_predictions').createIndex({ tenant_id: 1, equipment_id: 1 });
    console.log('Created maintenance_predictions collection');
  } catch (e) {
    if (e.codeName !== 'NamespaceExists') console.warn(e.message);
  }

  // Create sla_predictions collection
  try {
    await db.createCollection('sla_predictions');
    await db.collection('sla_predictions').createIndex({ tenant_id: 1, work_order_id: 1 });
    console.log('Created sla_predictions collection');
  } catch (e) {
    if (e.codeName !== 'NamespaceExists') console.warn(e.message);
  }

  console.log('AI collections setup complete!');
  process.exit(0);
}

setup().catch(err => { console.error(err); process.exit(1); });
