#!/usr/bin/env node
/**
 * Create collections and seed demo data in MongoDB
 * Seeds demo data into MongoDB collections
 */

import { MongoClient } from 'mongodb';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vivekkumar787067_db_user:Vivek09876@cluster0.xdkbkkd.mongodb.net/';
const DB_NAME = process.env.DB_NAME || 'guardianflow';

async function createCollectionsAndSeed() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log('Connected to MongoDB');

    // Seed demo technicians
    const techCount = await db.collection('technicians').countDocuments();
    if (techCount === 0) {
      console.log('Seeding demo technicians...');
      await db.collection('technicians').insertMany([
        { id: randomUUID(), full_name: 'John Smith', email: 'john.smith@techcorp.com', phone: '+1-555-0101', skills: ['HVAC', 'Electrical'], status: 'active', availability: 'available', created_at: new Date(), updated_at: new Date() },
        { id: randomUUID(), full_name: 'Sarah Johnson', email: 'sarah.johnson@techcorp.com', phone: '+1-555-0102', skills: ['Plumbing', 'HVAC'], status: 'active', availability: 'available', created_at: new Date(), updated_at: new Date() },
        { id: randomUUID(), full_name: 'Mike Williams', email: 'mike.williams@techcorp.com', phone: '+1-555-0103', skills: ['Electrical', 'Solar'], status: 'active', availability: 'busy', created_at: new Date(), updated_at: new Date() },
        { id: randomUUID(), full_name: 'Emily Davis', email: 'emily.davis@techcorp.com', phone: '+1-555-0104', skills: ['HVAC', 'Refrigeration'], status: 'active', availability: 'available', created_at: new Date(), updated_at: new Date() },
        { id: randomUUID(), full_name: 'David Brown', email: 'david.brown@techcorp.com', phone: '+1-555-0105', skills: ['Plumbing', 'Gas'], status: 'active', availability: 'offline', created_at: new Date(), updated_at: new Date() },
      ]);
      console.log('Demo technicians seeded');
    }

    // Seed compliance controls
    const complianceCount = await db.collection('compliance_controls').countDocuments();
    if (complianceCount === 0) {
      console.log('Seeding compliance controls...');
      const controls = [
        { framework: 'SOC2', control_id: 'SOC2-CC1.1', title: 'Access Control Policy', description: 'Organization has defined access control policies and procedures', status: 'compliant', evidence_count: 5, last_reviewed: new Date() },
        { framework: 'SOC2', control_id: 'SOC2-CC1.2', title: 'Authentication Mechanisms', description: 'Multi-factor authentication is implemented for all users', status: 'compliant', evidence_count: 3, last_reviewed: new Date() },
        { framework: 'SOC2', control_id: 'SOC2-CC2.1', title: 'Data Encryption at Rest', description: 'All sensitive data is encrypted at rest using AES-256', status: 'compliant', evidence_count: 4, last_reviewed: new Date() },
        { framework: 'SOC2', control_id: 'SOC2-CC2.2', title: 'Data Encryption in Transit', description: 'All data in transit is encrypted using TLS 1.3', status: 'compliant', evidence_count: 2, last_reviewed: new Date() },
        { framework: 'SOC2', control_id: 'SOC2-CC3.1', title: 'Audit Logging', description: 'All system access and changes are logged', status: 'partial', evidence_count: 2, last_reviewed: new Date() },
        { framework: 'SOC2', control_id: 'SOC2-CC3.2', title: 'Log Retention', description: 'Logs are retained for minimum 90 days', status: 'compliant', evidence_count: 1, last_reviewed: new Date() },
        { framework: 'ISO27001', control_id: 'ISO-A.5.1', title: 'Information Security Policy', description: 'Security policy documented and communicated', status: 'compliant', evidence_count: 3, last_reviewed: new Date() },
        { framework: 'ISO27001', control_id: 'ISO-A.6.1', title: 'Organization of Security', description: 'Security roles and responsibilities defined', status: 'compliant', evidence_count: 2, last_reviewed: new Date() },
        { framework: 'ISO27001', control_id: 'ISO-A.8.1', title: 'Asset Management', description: 'Asset inventory maintained and classified', status: 'partial', evidence_count: 1, last_reviewed: new Date() },
        { framework: 'ISO27001', control_id: 'ISO-A.9.1', title: 'Access Control', description: 'Access control policy implemented', status: 'compliant', evidence_count: 4, last_reviewed: new Date() },
        { framework: 'HIPAA', control_id: 'HIPAA-164.312(a)', title: 'Access Control', description: 'Technical policies for PHI access', status: 'compliant', evidence_count: 3, last_reviewed: new Date() },
        { framework: 'HIPAA', control_id: 'HIPAA-164.312(b)', title: 'Audit Controls', description: 'Hardware, software audit mechanisms', status: 'partial', evidence_count: 2, last_reviewed: new Date() },
        { framework: 'HIPAA', control_id: 'HIPAA-164.312(c)', title: 'Integrity Controls', description: 'PHI integrity protection mechanisms', status: 'compliant', evidence_count: 2, last_reviewed: new Date() },
        { framework: 'HIPAA', control_id: 'HIPAA-164.312(e)', title: 'Transmission Security', description: 'PHI transmission protection', status: 'compliant', evidence_count: 3, last_reviewed: new Date() },
        { framework: 'GDPR', control_id: 'GDPR-Art.5', title: 'Data Processing Principles', description: 'Lawfulness, fairness, transparency', status: 'compliant', evidence_count: 4, last_reviewed: new Date() },
        { framework: 'GDPR', control_id: 'GDPR-Art.6', title: 'Lawful Basis', description: 'Legal basis for processing documented', status: 'compliant', evidence_count: 2, last_reviewed: new Date() },
        { framework: 'GDPR', control_id: 'GDPR-Art.17', title: 'Right to Erasure', description: 'Data deletion procedures implemented', status: 'partial', evidence_count: 1, last_reviewed: new Date() },
        { framework: 'GDPR', control_id: 'GDPR-Art.32', title: 'Security of Processing', description: 'Appropriate security measures', status: 'compliant', evidence_count: 3, last_reviewed: new Date() },
      ].map(c => ({ ...c, id: randomUUID(), created_at: new Date(), updated_at: new Date() }));
      await db.collection('compliance_controls').insertMany(controls);
      console.log('Compliance controls seeded');
    }

    // Seed suppliers
    const supplierCount = await db.collection('suppliers').countDocuments();
    if (supplierCount === 0) {
      console.log('Seeding suppliers...');
      await db.collection('suppliers').insertMany([
        { id: randomUUID(), name: 'HVAC Parts Direct', contact_name: 'Tom Wilson', email: 'sales@hvacpartsdirect.com', phone: '+1-800-555-0201', payment_terms: 'Net 30', lead_time_days: 5, rating: 4.8, status: 'active', created_at: new Date(), updated_at: new Date() },
        { id: randomUUID(), name: 'Electrical Supply Co', contact_name: 'Lisa Chen', email: 'orders@electricalsupplyco.com', phone: '+1-800-555-0202', payment_terms: 'Net 45', lead_time_days: 3, rating: 4.5, status: 'active', created_at: new Date(), updated_at: new Date() },
        { id: randomUUID(), name: 'Plumbing Wholesale', contact_name: 'Bob Martinez', email: 'bob@plumbingwholesale.com', phone: '+1-800-555-0203', payment_terms: 'Net 30', lead_time_days: 7, rating: 4.2, status: 'active', created_at: new Date(), updated_at: new Date() },
        { id: randomUUID(), name: 'Tools & Equipment Inc', contact_name: 'Jane Smith', email: 'procurement@toolsequip.com', phone: '+1-800-555-0204', payment_terms: 'Net 60', lead_time_days: 10, rating: 4.6, status: 'active', created_at: new Date(), updated_at: new Date() },
        { id: randomUUID(), name: 'Safety Gear Pro', contact_name: 'Mike Johnson', email: 'orders@safetygear.com', phone: '+1-800-555-0205', payment_terms: 'COD', lead_time_days: 2, rating: 4.9, status: 'active', created_at: new Date(), updated_at: new Date() },
      ]);
      console.log('Suppliers seeded');
    }

    // Seed forgery model metrics
    const forgeryCount = await db.collection('forgery_model_metrics').countDocuments();
    if (forgeryCount === 0) {
      console.log('Seeding forgery model metrics...');
      await db.collection('forgery_model_metrics').insertMany([
        { id: randomUUID(), model_type: 'statistical', model_version: 'v1.0.0', precision_score: 0.82, recall_score: 0.78, f1_score: 0.80, accuracy: 0.85, drift_detected: false, drift_score: 0.02, is_active: true, deployed_at: new Date() },
        { id: randomUUID(), model_type: 'ai_vision', model_version: 'v1.0.0', precision_score: 0.91, recall_score: 0.88, f1_score: 0.89, accuracy: 0.92, drift_detected: false, drift_score: 0.01, is_active: true, deployed_at: new Date() },
      ]);
      console.log('Forgery model metrics seeded');
    }

    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

createCollectionsAndSeed();
