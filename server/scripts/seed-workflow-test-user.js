#!/usr/bin/env node
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

async function seedTestUser() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    const email = 'admin@techcorp.com';
    const newPassword = 'TestAdmin123!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Check if user exists
    const existingUser = await db.collection('users').findOne({ email });

    if (!existingUser) {
      console.log('User not found, creating...');
      const userId = randomUUID();

      await db.collection('users').insertOne({
        id: userId, email, password_hash: hashedPassword,
        full_name: 'Test Admin', active: true, created_at: new Date(),
      });

      await db.collection('profiles').insertOne({
        id: userId, email, full_name: 'Test Admin', created_at: new Date(),
      });

      await db.collection('user_roles').insertOne({
        user_id: userId, role: 'admin', created_at: new Date(),
      });

      console.log('User created with admin role');
    } else {
      const userId = existingUser.id;
      console.log('User found:', userId);

      await db.collection('users').updateOne({ email }, { $set: { password_hash: hashedPassword } });
      console.log('Password updated');

      // Ensure admin role (upsert)
      await db.collection('user_roles').updateOne(
        { user_id: userId, role: 'admin' },
        { $set: { user_id: userId, role: 'admin', created_at: new Date() } },
        { upsert: true }
      );
      console.log('Admin role ensured');
    }

    console.log('');
    console.log('SUCCESS: Test user ready');
    console.log('Email:', email);
    console.log('Password:', newPassword);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedTestUser();
