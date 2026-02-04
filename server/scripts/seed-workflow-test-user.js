import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'guardianflow',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seedTestUser() {
  try {
    const email = 'admin@techcorp.com';
    const newPassword = 'TestAdmin123!';

    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Check if user exists
    const userResult = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      console.log('User not found, creating...');
      const userId = randomUUID();

      // Create user
      await pool.query(
        `INSERT INTO users (id, email, password_hash, full_name, active, created_at)
         VALUES ($1, $2, $3, $4, true, now())`,
        [userId, email, hashedPassword, 'Test Admin']
      );

      // Create profile
      await pool.query(
        `INSERT INTO profiles (id, email, full_name, created_at)
         VALUES ($1, $2, $3, now())`,
        [userId, email, 'Test Admin']
      );

      // Assign admin role
      await pool.query(
        `INSERT INTO user_roles (user_id, role, created_at)
         VALUES ($1, 'admin', now())`,
        [userId]
      );

      console.log('User created with admin role');
    } else {
      const userId = userResult.rows[0].id;
      console.log('User found:', userId);

      // Update password
      await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, email]);
      console.log('Password updated');

      // Ensure admin role (upsert - handle potential unique constraint)
      try {
        await pool.query(
          `INSERT INTO user_roles (user_id, role, created_at)
           VALUES ($1, 'admin', now())
           ON CONFLICT (user_id, role) DO NOTHING`,
          [userId]
        );
      } catch (e) {
        // If there's no unique constraint, just ignore duplicates
        console.log('Admin role may already exist');
      }
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
    await pool.end();
  }
}

seedTestUser();
