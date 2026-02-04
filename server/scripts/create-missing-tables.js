import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'guardianflow',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const missingTables = `
-- Technicians table
CREATE TABLE IF NOT EXISTS technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  employee_id VARCHAR(50),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  skills TEXT[],
  certifications TEXT[],
  status VARCHAR(50) DEFAULT 'active',
  availability VARCHAR(50) DEFAULT 'available',
  current_location JSONB,
  home_location JSONB,
  service_area JSONB,
  rating DECIMAL(3,2),
  completed_jobs INTEGER DEFAULT 0,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contracts table (if not exists with proper structure)
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number VARCHAR(50) UNIQUE,
  customer_id UUID,
  title VARCHAR(255),
  description TEXT,
  type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  value DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'USD',
  terms TEXT,
  sla_terms JSONB,
  auto_renew BOOLEAN DEFAULT false,
  tenant_id UUID,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  category VARCHAR(100),
  file_path VARCHAR(500),
  file_size INTEGER,
  mime_type VARCHAR(100),
  description TEXT,
  tags TEXT[],
  entity_type VARCHAR(50),
  entity_id UUID,
  uploaded_by UUID,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Maintenance predictions table
CREATE TABLE IF NOT EXISTS maintenance_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID,
  prediction_date DATE,
  failure_probability DECIMAL(5,4),
  predicted_failure_date DATE,
  confidence DECIMAL(5,4),
  factors JSONB,
  recommended_action TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Fraud alerts table
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(100),
  severity VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id UUID,
  description TEXT,
  evidence JSONB,
  status VARCHAR(50) DEFAULT 'open',
  assigned_to UUID,
  resolution TEXT,
  resolved_at TIMESTAMP,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Detected anomalies table
CREATE TABLE IF NOT EXISTS detected_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100),
  severity VARCHAR(50),
  confidence DECIMAL(5,4),
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  status VARCHAR(50) DEFAULT 'new',
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  tenant_id UUID,
  detected_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_technicians_status ON technicians(status);
CREATE INDEX IF NOT EXISTS idx_technicians_tenant ON technicians(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_predictions_equipment ON maintenance_predictions(equipment_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_detected_anomalies_status ON detected_anomalies(status);
`;

async function createTables() {
  try {
    console.log('Creating missing tables...');
    await pool.query(missingTables);
    console.log('Tables created successfully');

    // Seed some demo technicians
    const technicianCount = await pool.query('SELECT COUNT(*) FROM technicians');
    if (parseInt(technicianCount.rows[0].count) === 0) {
      console.log('Seeding demo technicians...');
      await pool.query(`
        INSERT INTO technicians (full_name, email, phone, skills, status, availability) VALUES
        ('John Smith', 'john.smith@techcorp.com', '+1-555-0101', ARRAY['HVAC', 'Electrical'], 'active', 'available'),
        ('Sarah Johnson', 'sarah.johnson@techcorp.com', '+1-555-0102', ARRAY['Plumbing', 'HVAC'], 'active', 'available'),
        ('Mike Williams', 'mike.williams@techcorp.com', '+1-555-0103', ARRAY['Electrical', 'Solar'], 'active', 'busy'),
        ('Emily Davis', 'emily.davis@techcorp.com', '+1-555-0104', ARRAY['HVAC', 'Refrigeration'], 'active', 'available'),
        ('David Brown', 'david.brown@techcorp.com', '+1-555-0105', ARRAY['Plumbing', 'Gas'], 'active', 'offline')
      `);
      console.log('Demo technicians seeded');
    }

    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

createTables();
