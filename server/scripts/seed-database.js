#!/usr/bin/env node
/**
 * Seed MongoDB with essential data for GuardianFlow
 * Creates admin user, test data, and sample records for all core collections.
 */
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vivekkumar787067_db_user:Vivek09876@cluster0.xdkbkkd.mongodb.net/';
const DB_NAME = process.env.DB_NAME || 'guardianflow';

async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Connected to MongoDB: ${DB_NAME}\n`);

    // ============================================================
    // 1. ADMIN USER
    // ============================================================
    console.log('📦 Seeding admin user...');
    const adminId = randomUUID();
    const adminEmail = 'admin@guardian.dev';
    const adminPassword = 'admin123';
    const adminHash = await bcrypt.hash(adminPassword, 10);

    const existingAdmin = await db.collection('users').findOne({ email: adminEmail });
    if (!existingAdmin) {
      await db.collection('users').insertOne({
        id: adminId,
        email: adminEmail,
        password_hash: adminHash,
        full_name: 'System Administrator',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.collection('profiles').insertOne({
        id: adminId,
        email: adminEmail,
        full_name: 'System Administrator',
        tenant_id: adminId,
        currency: 'USD',
        timezone: 'America/New_York',
        created_at: new Date(),
      });

      await db.collection('user_roles').insertOne({
        user_id: adminId,
        role: 'admin',
        created_at: new Date(),
      });

      console.log(`   ✅ Created admin user: ${adminEmail} / ${adminPassword}`);
    } else {
      // Update password to ensure it matches
      await db.collection('users').updateOne(
        { email: adminEmail },
        { $set: { password_hash: adminHash, active: true, updated_at: new Date() } }
      );
      console.log(`   ✅ Admin user exists, password reset to: ${adminPassword}`);
    }

    // ============================================================
    // 2. SAMPLE CUSTOMERS
    // ============================================================
    console.log('📦 Seeding customers...');
    const customers = [
      { id: 'cust-001', name: 'Acme Corporation', email: 'contact@acme.com', phone: '+1-555-0101', company_name: 'Acme Corp', status: 'active' },
      { id: 'cust-002', name: 'TechStart Inc', email: 'info@techstart.io', phone: '+1-555-0102', company_name: 'TechStart', status: 'active' },
      { id: 'cust-003', name: 'GlobalServ Ltd', email: 'support@globalserv.com', phone: '+1-555-0103', company_name: 'GlobalServ', status: 'active' },
    ];
    for (const c of customers) {
      await db.collection('customers').updateOne(
        { id: c.id },
        { $set: { ...c, created_at: new Date(), updated_at: new Date() } },
        { upsert: true }
      );
    }
    console.log(`   ✅ Seeded ${customers.length} customers`);

    // ============================================================
    // 3. SAMPLE EQUIPMENT
    // ============================================================
    console.log('📦 Seeding equipment...');
    const equipment = [
      { id: 'equip-001', name: 'Industrial Printer A1', serial_number: 'SN-PRT-001', model: 'PrintMaster 5000', manufacturer: 'HP', status: 'active', customer_id: 'cust-001' },
      { id: 'equip-002', name: 'Server Rack Unit B2', serial_number: 'SN-SRV-002', model: 'PowerEdge R740', manufacturer: 'Dell', status: 'active', customer_id: 'cust-001' },
      { id: 'equip-003', name: 'Network Switch C3', serial_number: 'SN-NET-003', model: 'Catalyst 9300', manufacturer: 'Cisco', status: 'active', customer_id: 'cust-002' },
    ];
    for (const e of equipment) {
      await db.collection('equipment').updateOne(
        { id: e.id },
        { $set: { ...e, created_at: new Date(), updated_at: new Date() } },
        { upsert: true }
      );
    }
    console.log(`   ✅ Seeded ${equipment.length} equipment records`);

    // ============================================================
    // 4. SAMPLE WORK ORDERS
    // ============================================================
    console.log('📦 Seeding work orders...');
    const workOrders = [
      { id: '00000000-0000-4000-c000-000000000001', wo_number: 'WO-2024-0001', title: 'Printer Maintenance', description: 'Quarterly maintenance for Industrial Printer', status: 'pending', priority: 'medium', customer_id: 'cust-001', equipment_id: 'equip-001' },
      { id: '00000000-0000-4000-c000-000000000002', wo_number: 'WO-2024-0002', title: 'Server Diagnostics', description: 'Performance issues reported', status: 'in_progress', priority: 'high', customer_id: 'cust-001', equipment_id: 'equip-002' },
      { id: '00000000-0000-4000-c000-000000000003', wo_number: 'WO-2024-0003', title: 'Network Configuration', description: 'VLAN setup and configuration', status: 'completed', priority: 'low', customer_id: 'cust-002', equipment_id: 'equip-003' },
    ];
    for (const wo of workOrders) {
      await db.collection('work_orders').updateOne(
        { id: wo.id },
        { $set: { ...wo, tenant_id: adminId, created_at: new Date(), updated_at: new Date() } },
        { upsert: true }
      );
    }
    console.log(`   ✅ Seeded ${workOrders.length} work orders`);

    // ============================================================
    // 5. SAMPLE TECHNICIANS
    // ============================================================
    console.log('📦 Seeding technicians...');
    const technicians = [
      { id: 'tech-001', name: 'John Smith', email: 'john.smith@guardian.dev', phone: '+1-555-0201', status: 'active', availability: 'available', skills: ['printer', 'copier'] },
      { id: 'tech-002', name: 'Jane Doe', email: 'jane.doe@guardian.dev', phone: '+1-555-0202', status: 'active', availability: 'available', skills: ['server', 'network'] },
      { id: 'tech-003', name: 'Bob Wilson', email: 'bob.wilson@guardian.dev', phone: '+1-555-0203', status: 'active', availability: 'busy', skills: ['network', 'security'] },
    ];
    for (const t of technicians) {
      await db.collection('technicians').updateOne(
        { id: t.id },
        { $set: { ...t, tenant_id: adminId, created_at: new Date(), updated_at: new Date() } },
        { upsert: true }
      );
    }
    console.log(`   ✅ Seeded ${technicians.length} technicians`);

    // ============================================================
    // 6. SAMPLE TICKETS
    // ============================================================
    console.log('📦 Seeding tickets...');
    const tickets = [
      { id: 'ticket-001', ticket_number: 'TKT-2024-0001', subject: 'Printer not working', description: 'Paper jam issue', status: 'open', priority: 'high', customer_id: 'cust-001', customer_name: 'Acme Corporation' },
      { id: 'ticket-002', ticket_number: 'TKT-2024-0002', subject: 'Slow network', description: 'Network latency issues', status: 'in_progress', priority: 'medium', customer_id: 'cust-002', customer_name: 'TechStart Inc' },
    ];
    for (const t of tickets) {
      await db.collection('tickets').updateOne(
        { id: t.id },
        { $set: { ...t, tenant_id: adminId, created_at: new Date(), updated_at: new Date() } },
        { upsert: true }
      );
    }
    console.log(`   ✅ Seeded ${tickets.length} tickets`);

    // ============================================================
    // 7. SAMPLE INVOICES
    // ============================================================
    console.log('📦 Seeding invoices...');
    const invoices = [
      { id: 'inv-001', invoice_number: 'INV-2024-0001', customer_id: 'cust-001', amount: 1500.00, status: 'paid', due_date: new Date('2024-02-15') },
      { id: 'inv-002', invoice_number: 'INV-2024-0002', customer_id: 'cust-002', amount: 2500.00, status: 'pending', due_date: new Date('2024-03-01') },
    ];
    for (const i of invoices) {
      await db.collection('invoices').updateOne(
        { id: i.id },
        { $set: { ...i, tenant_id: adminId, created_at: new Date(), updated_at: new Date() } },
        { upsert: true }
      );
    }
    console.log(`   ✅ Seeded ${invoices.length} invoices`);

    // ============================================================
    // 8. SAMPLE CONTRACTS
    // ============================================================
    console.log('📦 Seeding contracts...');
    const contracts = [
      { id: 'contract-001', contract_number: 'CON-2024-0001', customer_id: 'cust-001', title: 'Annual Maintenance Agreement', status: 'active', start_date: new Date('2024-01-01'), end_date: new Date('2024-12-31'), value: 12000.00 },
    ];
    for (const c of contracts) {
      await db.collection('contracts').updateOne(
        { id: c.id },
        { $set: { ...c, tenant_id: adminId, created_at: new Date(), updated_at: new Date() } },
        { upsert: true }
      );
    }
    console.log(`   ✅ Seeded ${contracts.length} contracts`);

    // ============================================================
    // 9. SAMPLE WARRANTIES
    // ============================================================
    console.log('📦 Seeding warranties...');
    const warranties = [
      { id: 'warranty-001', equipment_id: 'equip-001', unit_serial: 'SN-PRT-001', warranty_start: new Date('2023-01-01'), warranty_end: new Date('2026-01-01'), coverage_type: 'full', status: 'active' },
      { id: 'warranty-002', equipment_id: 'equip-002', unit_serial: 'SN-SRV-002', warranty_start: new Date('2023-06-01'), warranty_end: new Date('2025-06-01'), coverage_type: 'parts_only', status: 'active' },
    ];
    for (const w of warranties) {
      await db.collection('warranties').updateOne(
        { id: w.id },
        { $set: { ...w, created_at: new Date(), updated_at: new Date() } },
        { upsert: true }
      );
    }
    // Also add to warranty_records for the check-warranty function
    for (const w of warranties) {
      await db.collection('warranty_records').updateOne(
        { unit_serial: w.unit_serial },
        { $set: { ...w, created_at: new Date() } },
        { upsert: true }
      );
    }
    console.log(`   ✅ Seeded ${warranties.length} warranties`);

    // ============================================================
    // 10. SAMPLE KNOWLEDGE ARTICLES & FAQS
    // ============================================================
    console.log('📦 Seeding knowledge base & FAQs...');
    const articles = [
      { id: 'kb-001', title: 'How to Reset Printer', content: 'Step 1: Turn off the printer. Step 2: Wait 30 seconds. Step 3: Turn it back on.', summary: 'Quick guide to reset printers', status: 'published' },
      { id: 'kb-002', title: 'Network Troubleshooting', content: 'Check cable connections, restart router, verify IP settings.', summary: 'Basic network troubleshooting steps', status: 'published' },
    ];
    for (const a of articles) {
      await db.collection('knowledge_articles').updateOne(
        { id: a.id },
        { $set: { ...a, created_at: new Date(), updated_at: new Date() } },
        { upsert: true }
      );
    }

    const faqs = [
      { id: 'faq-001', question: 'How do I submit a service request?', answer: 'Navigate to Service Requests and click "New Request".', published: true, category: 'General' },
      { id: 'faq-002', question: 'What are your support hours?', answer: 'We provide 24/7 support for critical issues, 9-5 for standard requests.', published: true, category: 'Support' },
    ];
    for (const f of faqs) {
      await db.collection('faqs').updateOne(
        { id: f.id },
        { $set: { ...f, created_at: new Date(), updated_at: new Date() } },
        { upsert: true }
      );
    }
    console.log(`   ✅ Seeded ${articles.length} articles and ${faqs.length} FAQs`);

    // ============================================================
    // 11. EMPTY PLACEHOLDER COLLECTIONS
    // ============================================================
    console.log('📦 Ensuring other collections exist...');
    const collections = [
      'service_orders', 'service_requests', 'quotes', 'payments', 'penalties',
      'penalty_rules', 'disputes', 'partners', 'notifications', 'audit_log',
      'forecast_outputs', 'maintenance_predictions', 'sapos_offers', 'fraud_alerts',
      'forgery_detections', 'forgery_batch_jobs', 'forgery_monitoring_alerts',
      'forgery_model_metrics', 'marketplace_items', 'templates', 'webhooks',
      'ab_tests', 'geography_hierarchy', 'sla_configurations', 'sla_records',
      'purchase_orders', 'stock_adjustments', 'inventory_items',
      'training_modules', 'training_progress', 'documents', 'photos',
    ];
    for (const name of collections) {
      // Insert a placeholder and immediately delete to create the collection
      const exists = await db.listCollections({ name }).hasNext();
      if (!exists) {
        await db.createCollection(name).catch(() => {});
      }
    }
    console.log(`   ✅ Ensured ${collections.length} collections exist`);

    // ============================================================
    // DONE
    // ============================================================
    console.log('\n' + '='.repeat(50));
    console.log('DATABASE SEEDED SUCCESSFULLY');
    console.log('='.repeat(50));
    console.log('\nAdmin credentials:');
    console.log(`  Email:    ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    console.log('\n');

  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedDatabase();
