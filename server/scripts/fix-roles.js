import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'guardianflow',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function fix() {
  const userId = '4e639a20-7f45-4fd2-8c78-8ea68178fa1d';

  // Check what enum values exist
  const enumValues = await pool.query(`
    SELECT enumlabel FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  `);
  console.log('Allowed role values:', enumValues.rows.map(r => r.enumlabel));

  // Use sys_admin if available, otherwise first admin-like role
  const roles = enumValues.rows.map(r => r.enumlabel);
  const adminRole = roles.find(r => r === 'sys_admin') ||
                    roles.find(r => r.includes('admin')) ||
                    roles[0];

  console.log('Using role:', adminRole);

  // Insert role
  await pool.query(
    `INSERT INTO user_roles (user_id, role, created_at) VALUES ($1, $2, now())
     ON CONFLICT DO NOTHING`,
    [userId, adminRole]
  );
  console.log('Role assigned');

  // Verify
  const check = await pool.query('SELECT * FROM user_roles WHERE user_id = $1', [userId]);
  console.log('Current roles:', check.rows);

  await pool.end();
}

fix();
