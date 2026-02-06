#!/usr/bin/env node
/**
 * Setup MongoDB database - verify connection and run initial setup
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

async function setupDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);

    // Verify connection
    await db.admin().ping();
    console.log(`Connected to MongoDB database: ${DB_NAME}`);

    // List existing collections
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} existing collections`);

    if (collections.length === 0) {
      console.log('No collections found. Run init-mongodb.js to create indexes.');
      console.log('Collections will be auto-created on first insert.');
    }

    console.log('Database setup complete!');
  } catch (error) {
    console.error('Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupDatabase();
