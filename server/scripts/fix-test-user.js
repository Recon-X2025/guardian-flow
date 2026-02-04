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

async function fix() {
  const email = 'admin@techcorp.com';
  const password = 'TestAdmin123!';
  const fullName = 'Test Admin';

  try {
    // Get user from users table
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      console.log('User not found in users table');
      return;
    }

    const userId = userResult.rows[0].id;
    console.log('User ID:', userId);

    // Check if profile exists
    const profileResult = await pool.query('SELECT id FROM profiles WHERE id = $1', [userId]);

    if (profileResult.rows.length === 0) {
      console.log('Profile not found, creating...');
      await pool.query(
        `INSERT INTO profiles (id, email, full_name, created_at) VALUES ($1, $2, $3, now())`,
        [userId, email, fullName]
      );
      console.log('Profile created');
    } else {
      console.log('Profile exists');
    }

    // Check roles
    const rolesResult = await pool.query('SELECT * FROM user_roles WHERE user_id = $1', [userId]);
    console.log('Current roles:', rolesResult.rows);

    if (rolesResult.rows.length === 0) {
      console.log('No roles, adding sys_admin...');
      await pool.query(
        `INSERT INTO user_roles (user_id, role, created_at) VALUES ($1, 'sys_admin', now())`,
        [userId]
      );
      console.log('Role added');
    }

    // Update password to be sure
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);
    console.log('Password updated');

    // Final verification
    const finalRoles = await pool.query('SELECT * FROM user_roles WHERE user_id = $1', [userId]);
    console.log('Final roles:', finalRoles.rows);

    console.log('\nSUCCESS: Test user ready');
    console.log('Email:', email);
    console.log('Password:', password);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

fix();
