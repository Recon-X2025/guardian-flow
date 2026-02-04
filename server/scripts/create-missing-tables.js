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

-- Compliance controls table
CREATE TABLE IF NOT EXISTS compliance_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework VARCHAR(50) NOT NULL,
  control_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'not_applicable',
  evidence_count INTEGER DEFAULT 0,
  last_reviewed TIMESTAMP,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Compliance evidence table
CREATE TABLE IF NOT EXISTS compliance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID REFERENCES compliance_controls(id),
  type VARCHAR(100),
  description TEXT,
  file_path VARCHAR(500),
  collected_at TIMESTAMP DEFAULT NOW(),
  verified BOOLEAN DEFAULT false,
  verified_by UUID,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  payment_terms VARCHAR(100),
  lead_time_days INTEGER DEFAULT 7,
  rating DECIMAL(3,2),
  status VARCHAR(50) DEFAULT 'active',
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Frontend error logs table (for auth audit)
CREATE TABLE IF NOT EXISTS frontend_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100),
  event VARCHAR(100),
  module VARCHAR(100),
  path VARCHAR(500),
  details JSONB,
  user_id UUID,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_compliance_controls_framework ON compliance_controls(framework);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_control ON compliance_evidence(control_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_frontend_error_logs_category ON frontend_error_logs(category);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
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

    // Seed compliance controls
    const complianceCount = await pool.query('SELECT COUNT(*) FROM compliance_controls');
    if (parseInt(complianceCount.rows[0].count) === 0) {
      console.log('Seeding compliance controls...');
      await pool.query(`
        INSERT INTO compliance_controls (framework, control_id, title, description, status, evidence_count, last_reviewed) VALUES
        ('SOC2', 'SOC2-CC1.1', 'Access Control Policy', 'Organization has defined access control policies and procedures', 'compliant', 5, NOW()),
        ('SOC2', 'SOC2-CC1.2', 'Authentication Mechanisms', 'Multi-factor authentication is implemented for all users', 'compliant', 3, NOW()),
        ('SOC2', 'SOC2-CC2.1', 'Data Encryption at Rest', 'All sensitive data is encrypted at rest using AES-256', 'compliant', 4, NOW()),
        ('SOC2', 'SOC2-CC2.2', 'Data Encryption in Transit', 'All data in transit is encrypted using TLS 1.3', 'compliant', 2, NOW()),
        ('SOC2', 'SOC2-CC3.1', 'Audit Logging', 'All system access and changes are logged', 'partial', 2, NOW()),
        ('SOC2', 'SOC2-CC3.2', 'Log Retention', 'Logs are retained for minimum 90 days', 'compliant', 1, NOW()),
        ('ISO27001', 'ISO-A.5.1', 'Information Security Policy', 'Security policy documented and communicated', 'compliant', 3, NOW()),
        ('ISO27001', 'ISO-A.6.1', 'Organization of Security', 'Security roles and responsibilities defined', 'compliant', 2, NOW()),
        ('ISO27001', 'ISO-A.8.1', 'Asset Management', 'Asset inventory maintained and classified', 'partial', 1, NOW()),
        ('ISO27001', 'ISO-A.9.1', 'Access Control', 'Access control policy implemented', 'compliant', 4, NOW()),
        ('HIPAA', 'HIPAA-164.312(a)', 'Access Control', 'Technical policies for PHI access', 'compliant', 3, NOW()),
        ('HIPAA', 'HIPAA-164.312(b)', 'Audit Controls', 'Hardware, software audit mechanisms', 'partial', 2, NOW()),
        ('HIPAA', 'HIPAA-164.312(c)', 'Integrity Controls', 'PHI integrity protection mechanisms', 'compliant', 2, NOW()),
        ('HIPAA', 'HIPAA-164.312(e)', 'Transmission Security', 'PHI transmission protection', 'compliant', 3, NOW()),
        ('GDPR', 'GDPR-Art.5', 'Data Processing Principles', 'Lawfulness, fairness, transparency', 'compliant', 4, NOW()),
        ('GDPR', 'GDPR-Art.6', 'Lawful Basis', 'Legal basis for processing documented', 'compliant', 2, NOW()),
        ('GDPR', 'GDPR-Art.17', 'Right to Erasure', 'Data deletion procedures implemented', 'partial', 1, NOW()),
        ('GDPR', 'GDPR-Art.32', 'Security of Processing', 'Appropriate security measures', 'compliant', 3, NOW())
      `);
      console.log('Compliance controls seeded');
    }

    // Seed suppliers
    const supplierCount = await pool.query('SELECT COUNT(*) FROM suppliers');
    if (parseInt(supplierCount.rows[0].count) === 0) {
      console.log('Seeding suppliers...');
      await pool.query(`
        INSERT INTO suppliers (name, contact_name, email, phone, payment_terms, lead_time_days, rating, status) VALUES
        ('HVAC Parts Direct', 'Tom Wilson', 'sales@hvacpartsdirect.com', '+1-800-555-0201', 'Net 30', 5, 4.8, 'active'),
        ('Electrical Supply Co', 'Lisa Chen', 'orders@electricalsupplyco.com', '+1-800-555-0202', 'Net 45', 3, 4.5, 'active'),
        ('Plumbing Wholesale', 'Bob Martinez', 'bob@plumbingwholesale.com', '+1-800-555-0203', 'Net 30', 7, 4.2, 'active'),
        ('Tools & Equipment Inc', 'Jane Smith', 'procurement@toolsequip.com', '+1-800-555-0204', 'Net 60', 10, 4.6, 'active'),
        ('Safety Gear Pro', 'Mike Johnson', 'orders@safetygear.com', '+1-800-555-0205', 'COD', 2, 4.9, 'active')
      `);
      console.log('Suppliers seeded');
    }

    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

createTables();
