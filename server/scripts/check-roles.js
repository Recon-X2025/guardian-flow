import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'guardianflow',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function check() {
  const userId = '4e639a20-7f45-4fd2-8c78-8ea68178fa1d';

  // Check user_roles
  const roles = await pool.query('SELECT * FROM user_roles WHERE user_id = $1', [userId]);
  console.log('User roles:', roles.rows);

  // Check table structure
  const cols = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'user_roles'
  `);
  console.log('user_roles columns:', cols.rows.map(r => r.column_name));

  // If no roles, add admin
  if (roles.rows.length === 0) {
    console.log('No roles found, adding admin role...');
    await pool.query(
      `INSERT INTO user_roles (user_id, role, created_at) VALUES ($1, 'admin', now())`,
      [userId]
    );
    console.log('Admin role added');
  }

  await pool.end();
}

check();
