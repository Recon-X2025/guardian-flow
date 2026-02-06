import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://vivekkumar787067_db_user:Vivek09876@cluster0.xdkbkkd.mongodb.net/guardianflow?retryWrites=true&w=majority';

async function fixAdmin() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db('guardianflow');

  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('=== Fixing Admin Users ===\n');

  // Update existing admin user password
  const result1 = await db.collection('users').updateOne(
    { email: 'admin@guardian.dev' },
    {
      $set: {
        password_hash: hashedPassword,
        active: true
      }
    }
  );
  console.log('Updated admin@guardian.dev:', result1.modifiedCount, 'docs');

  // Also create admin@guardianflow.com for compatibility
  const existingAdmin = await db.collection('users').findOne({ email: 'admin@guardianflow.com' });
  if (!existingAdmin) {
    const adminId = randomUUID();
    await db.collection('users').insertOne({
      id: adminId,
      email: 'admin@guardianflow.com',
      password_hash: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      active: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create profile for this user
    await db.collection('profiles').insertOne({
      id: adminId,
      email: 'admin@guardianflow.com',
      first_name: 'Admin',
      last_name: 'User',
      display_name: 'Admin User',
      created_at: new Date()
    });

    // Add admin role
    await db.collection('user_roles').insertOne({
      user_id: adminId,
      role: 'admin',
      created_at: new Date()
    });

    console.log('Created admin@guardianflow.com with ID:', adminId);
  } else {
    // Update password
    await db.collection('users').updateOne(
      { email: 'admin@guardianflow.com' },
      { $set: { password_hash: hashedPassword, active: true } }
    );
    console.log('Updated admin@guardianflow.com password');
  }

  // Verify users
  console.log('\n=== Verifying Users ===');
  const users = await db.collection('users').find({
    email: { $in: ['admin@guardian.dev', 'admin@guardianflow.com'] }
  }).toArray();

  users.forEach(u => {
    console.log(`Email: ${u.email} | Active: ${u.active} | Has Password: ${!!u.password_hash}`);
  });

  await client.close();
  console.log('\nDone! Both admin accounts ready with password: admin123');
}

fixAdmin().catch(console.error);
