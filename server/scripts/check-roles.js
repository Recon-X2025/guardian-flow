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

async function check() {
  const client = new MongoClient(MONGODB_URI);
  const userId = '4e639a20-7f45-4fd2-8c78-8ea68178fa1d';

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    // Check user_roles
    const roles = await db.collection('user_roles').find({ user_id: userId }).toArray();
    console.log('User roles:', roles);

    // List all distinct roles in the system
    const allRoles = await db.collection('user_roles').distinct('role');
    console.log('All roles in system:', allRoles);

    // If no roles, add admin
    if (roles.length === 0) {
      console.log('No roles found, adding admin role...');
      await db.collection('user_roles').insertOne({ user_id: userId, role: 'admin', created_at: new Date() });
      console.log('Admin role added');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

check();
