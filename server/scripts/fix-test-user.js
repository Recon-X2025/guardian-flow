#!/usr/bin/env node
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
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
  const email = 'admin@techcorp.com';
  const password = 'TestAdmin123!';
  const fullName = 'Test Admin';

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    // Get user
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      console.log('User not found in users collection');
      return;
    }

    const userId = user.id;
    console.log('User ID:', userId);

    // Check if profile exists
    const profile = await db.collection('profiles').findOne({ id: userId });
    if (!profile) {
      console.log('Profile not found, creating...');
      await db.collection('profiles').insertOne({ id: userId, email, full_name: fullName, created_at: new Date() });
      console.log('Profile created');
    } else {
      console.log('Profile exists');
    }

    // Check roles
    const roles = await db.collection('user_roles').find({ user_id: userId }).toArray();
    console.log('Current roles:', roles);

    if (roles.length === 0) {
      console.log('No roles, adding sys_admin...');
      await db.collection('user_roles').insertOne({ user_id: userId, role: 'sys_admin', created_at: new Date() });
      console.log('Role added');
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection('users').updateOne({ id: userId }, { $set: { password_hash: hashedPassword } });
    console.log('Password updated');

    // Final verification
    const finalRoles = await db.collection('user_roles').find({ user_id: userId }).toArray();
    console.log('Final roles:', finalRoles);

    console.log('\nSUCCESS: Test user ready');
    console.log('Email:', email);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

fix();
