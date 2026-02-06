#!/usr/bin/env node
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vivekkumar787067_db_user:Vivek09876@cluster0.xdkbkkd.mongodb.net/';
const DB_NAME = process.env.DB_NAME || 'guardianflow';

async function fix() {
  const client = new MongoClient(MONGODB_URI);
  const userId = '4e639a20-7f45-4fd2-8c78-8ea68178fa1d';

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    // Get all roles
    const allRoles = await db.collection('user_roles').distinct('role');
    console.log('Available roles:', allRoles);

    const adminRole = allRoles.find(r => r === 'sys_admin') ||
                      allRoles.find(r => r.includes('admin')) ||
                      'sys_admin';

    console.log('Using role:', adminRole);

    // Upsert role
    await db.collection('user_roles').updateOne(
      { user_id: userId, role: adminRole },
      { $set: { user_id: userId, role: adminRole, created_at: new Date() } },
      { upsert: true }
    );
    console.log('Role assigned');

    // Verify
    const check = await db.collection('user_roles').find({ user_id: userId }).toArray();
    console.log('Current roles:', check);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

fix();
