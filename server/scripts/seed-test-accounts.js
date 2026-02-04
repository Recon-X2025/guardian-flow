/**
 * Seed test accounts into MongoDB for Playwright E2E tests.
 * Run: node server/scripts/seed-test-accounts.js
 */
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'guardianflow';

const TEST_ACCOUNTS = [
  // rbac.spec.ts accounts
  { email: 'admin@techcorp.com', password: 'TestAdmin123!', fullName: 'Admin User', roles: ['admin'] },
  { email: 'ops@techcorp.com', password: 'TestOps123!', fullName: 'Ops Manager', roles: ['ops_manager'] },
  { email: 'finance@techcorp.com', password: 'TestFinance123!', fullName: 'Finance Manager', roles: ['finance_manager'] },
  { email: 'fraud@techcorp.com', password: 'TestFraud123!', fullName: 'Fraud Investigator', roles: ['fraud_investigator'] },
  { email: 'tech1@servicepro.com', password: 'TestTech123!', fullName: 'Tech One', roles: ['technician'] },
  { email: 'dispatch@techcorp.com', password: 'TestDispatch123!', fullName: 'Dispatcher', roles: ['dispatcher'] },
  { email: 'customer@example.com', password: 'TestCustomer123!', fullName: 'Customer User', roles: ['customer'] },
  { email: 'guest@example.com', password: 'TestGuest123!', fullName: 'Guest User', roles: ['guest'] },

  // comprehensive-functionality.spec.ts
  { email: 'test@example.com', password: 'testpassword123', fullName: 'Test User', roles: ['admin'] },

  // tenant-isolation.spec.ts
  { email: 'partner@acme.com', password: 'testpass123', fullName: 'Acme Partner', roles: ['partner_admin'], tenantId: 'tenant-acme' },
  { email: 'partner@techcorp.com', password: 'testpass123', fullName: 'TechCorp Partner', roles: ['partner_admin'], tenantId: 'tenant-techcorp' },
];

async function seed() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    for (const acct of TEST_ACCOUNTS) {
      const existing = await db.collection('users').findOne({ email: acct.email });
      if (existing) {
        console.log(`  skip  ${acct.email} (exists)`);
        continue;
      }

      const userId = randomUUID();
      const hash = await bcrypt.hash(acct.password, 10);

      await db.collection('users').insertOne({
        _id: userId,
        email: acct.email,
        password_hash: hash,
        full_name: acct.fullName,
        active: true,
        created_at: new Date(),
      });

      await db.collection('profiles').insertOne({
        _id: userId,
        email: acct.email,
        full_name: acct.fullName,
        tenant_id: acct.tenantId || null,
        created_at: new Date(),
      });

      for (const role of acct.roles) {
        await db.collection('user_roles').insertOne({
          user_id: userId,
          role,
          created_at: new Date(),
        });
      }

      console.log(`  seed  ${acct.email} → [${acct.roles.join(', ')}]`);
    }

    console.log('Done.');
  } finally {
    await client.close();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
