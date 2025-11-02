import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate test accounts dynamically
function generateTestAccounts() {
  const accounts: Array<{
    email: string;
    password: string;
    fullName: string;
    role: string;
    tenantSlug: string | null;
    userStory?: string;
    module?: string;
  }> = [
    // Core platform accounts
    { email: 'admin@techcorp.com', password: 'Admin123!', fullName: 'System Admin', role: 'sys_admin', tenantSlug: null },
    
    // Operations Manager Module - Work Orders & Dispatch
    { email: 'ops@techcorp.com', password: 'Ops123!', fullName: 'Operations Manager', role: 'ops_manager', tenantSlug: null, module: 'Operations', userStory: 'US-OP-001: Create and Assign Work Order' },
    { email: 'ops.sla@techcorp.com', password: 'Ops123!', fullName: 'Ops SLA Monitor', role: 'ops_manager', tenantSlug: null, module: 'Operations', userStory: 'US-OP-002: Monitor SLA Compliance' },
    { email: 'ops.dispatch@techcorp.com', password: 'Ops123!', fullName: 'Ops Dispatcher', role: 'ops_manager', tenantSlug: null, module: 'Operations', userStory: 'US-OP-003: Dispatch with Route Optimization' },
    { email: 'ops.reports@techcorp.com', password: 'Ops123!', fullName: 'Ops Report Analyst', role: 'ops_manager', tenantSlug: null, module: 'Operations', userStory: 'US-OP-004: Generate Performance Reports' },
    
    // Finance Manager Module - Billing & Forecasting
    { email: 'finance@techcorp.com', password: 'Finance123!', fullName: 'Finance Manager', role: 'finance_manager', tenantSlug: null, module: 'Finance', userStory: 'US-FIN-001: Automated Penalty Calculation' },
    { email: 'finance.invoicing@techcorp.com', password: 'Finance123!', fullName: 'Finance Invoicing', role: 'finance_manager', tenantSlug: null, module: 'Finance', userStory: 'US-FIN-002: Generate Accurate Invoices' },
    { email: 'finance.forecast@techcorp.com', password: 'Finance123!', fullName: 'Finance Forecast Analyst', role: 'finance_manager', tenantSlug: null, module: 'Finance', userStory: 'US-FIN-003: Revenue Forecasting Dashboard' },
    { email: 'finance.disputes@techcorp.com', password: 'Finance123!', fullName: 'Finance Dispute Resolver', role: 'finance_manager', tenantSlug: null, module: 'Finance', userStory: 'US-FIN-004: Handle Billing Disputes' },
    
    // Compliance/Audit Module - Access Reviews & Evidence
    { email: 'auditor@techcorp.com', password: 'Auditor123!', fullName: 'Auditor', role: 'auditor', tenantSlug: null, module: 'Compliance', userStory: 'US-COMP-001: Conduct Access Reviews' },
    { email: 'auditor.evidence@techcorp.com', password: 'Auditor123!', fullName: 'Auditor Evidence', role: 'auditor', tenantSlug: null, module: 'Compliance', userStory: 'US-COMP-002: Collect Compliance Evidence' },
    { email: 'auditor.vuln@techcorp.com', password: 'Auditor123!', fullName: 'Auditor Vulnerability', role: 'auditor', tenantSlug: null, module: 'Compliance', userStory: 'US-COMP-003: Monitor Vulnerability SLAs' },
    { email: 'auditor.logs@techcorp.com', password: 'Auditor123!', fullName: 'Auditor Log Reviewer', role: 'auditor', tenantSlug: null, module: 'Compliance', userStory: 'US-COMP-004: Review Audit Logs' },
    
    // Fraud Investigator Module - Detection & Investigation
    { email: 'fraud@techcorp.com', password: 'Fraud123!', fullName: 'Fraud Investigator', role: 'fraud_investigator', tenantSlug: null, module: 'Fraud', userStory: 'US-FRAUD-001: Detect Document Forgery' },
    { email: 'fraud.anomaly@techcorp.com', password: 'Fraud123!', fullName: 'Fraud Anomaly Analyst', role: 'fraud_investigator', tenantSlug: null, module: 'Fraud', userStory: 'US-FRAUD-002: Investigate Anomalous Behavior' },
    { email: 'fraud.cases@techcorp.com', password: 'Fraud123!', fullName: 'Fraud Case Manager', role: 'fraud_investigator', tenantSlug: null, module: 'Fraud', userStory: 'US-FRAUD-003: Manage Fraud Cases' },
    
    // Technician Module - Field Operations
    { email: 'tech.mobile@techcorp.com', password: 'Tech123!', fullName: 'Tech Mobile User', role: 'technician', tenantSlug: null, module: 'Field Operations', userStory: 'US-TECH-001: View and Accept Work Orders' },
    { email: 'tech.photos@techcorp.com', password: 'Tech123!', fullName: 'Tech Photo Specialist', role: 'technician', tenantSlug: null, module: 'Field Operations', userStory: 'US-TECH-002: Capture and Upload Photos' },
    { email: 'tech.complete@techcorp.com', password: 'Tech123!', fullName: 'Tech Completion Specialist', role: 'technician', tenantSlug: null, module: 'Field Operations', userStory: 'US-TECH-003: Mark Work Orders Complete' },
    
    // System Administrator Module - Platform Management
    { email: 'admin.rbac@techcorp.com', password: 'Admin123!', fullName: 'Admin RBAC Manager', role: 'sys_admin', tenantSlug: null, module: 'Platform Admin', userStory: 'US-ADMIN-001: Manage Roles and Permissions' },
    { email: 'admin.jit@techcorp.com', password: 'Admin123!', fullName: 'Admin JIT Access', role: 'sys_admin', tenantSlug: null, module: 'Platform Admin', userStory: 'US-ADMIN-002: Grant JIT Privileged Access' },
    { email: 'admin.health@techcorp.com', password: 'Admin123!', fullName: 'Admin System Monitor', role: 'sys_admin', tenantSlug: null, module: 'Platform Admin', userStory: 'US-ADMIN-003: Monitor System Health' },
    
    // Product Owner / Developer Module - Integration & APIs
    { email: 'product.api@techcorp.com', password: 'Product123!', fullName: 'Product API Specialist', role: 'product_owner', tenantSlug: null, module: 'Developer', userStory: 'US-DEV-001: Access API Documentation' },
    { email: 'product.webhooks@techcorp.com', password: 'Product123!', fullName: 'Product Webhook Manager', role: 'product_owner', tenantSlug: null, module: 'Developer', userStory: 'US-DEV-002: Create Webhooks' },
    { email: 'product.marketplace@techcorp.com', password: 'Product123!', fullName: 'Product Marketplace Publisher', role: 'product_owner', tenantSlug: null, module: 'Developer', userStory: 'US-DEV-003: Deploy to Marketplace' },
    
    // Support roles (no specific user stories)
    { email: 'dispatch@techcorp.com', password: 'Dispatch123!', fullName: 'Dispatcher', role: 'dispatcher', tenantSlug: null },
    { email: 'customer@example.com', password: 'Customer123!', fullName: 'Customer User', role: 'customer', tenantSlug: null },
    { email: 'tenant.admin@techcorp.com', password: 'Admin123!', fullName: 'Tenant Admin', role: 'tenant_admin', tenantSlug: null },
    { email: 'ops@techcorp.com', password: 'Ops123!', fullName: 'Operations Manager', role: 'ops_manager', tenantSlug: null },
    
    // Finance & Analytics
    { email: 'finance@techcorp.com', password: 'Finance123!', fullName: 'Finance Manager', role: 'finance_manager', tenantSlug: null },
    { email: 'analyst@techcorp.com', password: 'Analyst123!', fullName: 'Data Analyst', role: 'data_analyst', tenantSlug: null },
    
    // Fraud & Compliance
    { email: 'fraud@techcorp.com', password: 'Fraud123!', fullName: 'Fraud Investigator', role: 'fraud_investigator', tenantSlug: null },
    { email: 'auditor@techcorp.com', password: 'Auditor123!', fullName: 'Compliance Auditor', role: 'auditor', tenantSlug: null },
    
    // Field Service
    { email: 'dispatch@techcorp.com', password: 'Dispatch123!', fullName: 'Service Dispatcher', role: 'dispatcher', tenantSlug: null },
    
    // Developer & Marketplace
    { email: 'developer@techcorp.com', password: 'Dev123!', fullName: 'Platform Developer', role: 'developer', tenantSlug: null },
    
    // AI & ML
    { email: 'mlops@techcorp.com', password: 'MLOps123!', fullName: 'ML Operations', role: 'ml_ops', tenantSlug: null },
    
    // Billing & Support
    { email: 'billing@techcorp.com', password: 'Billing123!', fullName: 'Billing Agent', role: 'billing_agent', tenantSlug: null },
    { email: 'support@techcorp.com', password: 'Support123!', fullName: 'Support Agent', role: 'support_agent', tenantSlug: null },
    
    // ========== CLIENT ROLES (Enterprise Customers) ==========
    
    // Technology Manufacturing - OEM Client 1
    { email: 'oem1.admin@client.com', password: 'Client123!', fullName: 'OEM Client 1 Admin', role: 'client_admin', tenantSlug: 'oem-client-1', module: 'Field Service', userStory: 'UC-CLIENT-FSM-001: Monitor Multi-Vendor Performance' },
    { email: 'oem1.ops@client.com', password: 'Client123!', fullName: 'OEM Client 1 Operations Manager', role: 'client_operations_manager', tenantSlug: 'oem-client-1', module: 'Field Service', userStory: 'UC-CLIENT-FSM-002: Approve Service Orders' },
    { email: 'oem1.finance@client.com', password: 'Client123!', fullName: 'OEM Client 1 Finance Manager', role: 'client_finance_manager', tenantSlug: 'oem-client-1', module: 'Analytics', userStory: 'UC-CLIENT-FSM-003: Vendor Cost Analysis' },
    { email: 'oem1.procurement@client.com', password: 'Client123!', fullName: 'OEM Client 1 Procurement Manager', role: 'client_procurement_manager', tenantSlug: 'oem-client-1', module: 'Vendor Management', userStory: 'UC-CLIENT-ASSET-002: Vendor Selection & Contracts' },
    
    // Consumer Electronics - OEM Client 2
    { email: 'oem2.admin@client.com', password: 'Client123!', fullName: 'OEM Client 2 Admin', role: 'client_admin', tenantSlug: 'oem-client-2', module: 'Asset Lifecycle', userStory: 'UC-CLIENT-ASSET-001: Track Equipment Maintenance' },
    { email: 'oem2.ops@client.com', password: 'Client123!', fullName: 'OEM Client 2 Operations', role: 'client_operations_manager', tenantSlug: 'oem-client-2', module: 'Asset Lifecycle', userStory: 'UC-CLIENT-ASSET-001: Production Line Equipment' },
    { email: 'oem2.compliance@client.com', password: 'Client123!', fullName: 'OEM Client 2 Compliance Officer', role: 'client_compliance_officer', tenantSlug: 'oem-client-2', module: 'Compliance', userStory: 'UC-CLIENT-FRAUD-002: Quality & Safety Compliance' },
    
    // Insurance - Insurance Client 1
    { email: 'insurance1.admin@client.com', password: 'Client123!', fullName: 'Insurance Client 1 Admin', role: 'client_admin', tenantSlug: 'insurance-client-1', module: 'Fraud Detection', userStory: 'UC-CLIENT-FRAUD-001: Manage Fraud Detection Vendors' },
    { email: 'insurance1.fraud@client.com', password: 'Client123!', fullName: 'Insurance Client 1 Fraud Manager', role: 'client_fraud_manager', tenantSlug: 'insurance-client-1', module: 'Fraud Detection', userStory: 'UC-CLIENT-FRAUD-002: Coordinate Investigations' },
    { email: 'insurance1.compliance@client.com', password: 'Client123!', fullName: 'Insurance Client 1 Compliance Officer', role: 'client_compliance_officer', tenantSlug: 'insurance-client-1', module: 'Compliance', userStory: 'UC-CLIENT-ASSET-002: Regulatory Compliance Monitoring' },
    
    // Tech Manufacturing - OEM Client 2 (Executive)
    { email: 'oem2.executive@client.com', password: 'Client123!', fullName: 'OEM Client 2 Executive', role: 'client_executive', tenantSlug: 'oem-client-2', module: 'Analytics', userStory: 'UC-CLIENT-ANALYTICS-001: Executive Vendor Dashboards' },
    
    // Telecom - Telecom Client 1
    { email: 'telecom1.admin@client.com', password: 'Client123!', fullName: 'Telecom Client 1 Admin', role: 'client_admin', tenantSlug: 'telecom-client-1', module: 'Field Service', userStory: 'UC-CLIENT-FSM-001: Network Maintenance Vendors' },
    { email: 'telecom1.ops@client.com', password: 'Client123!', fullName: 'Telecom Client 1 Operations', role: 'client_operations_manager', tenantSlug: 'telecom-client-1', module: 'Field Service', userStory: 'UC-CLIENT-FSM-003: Tower & Fiber Vendor Management' },
    { email: 'telecom1.finance@client.com', password: 'Client123!', fullName: 'Telecom Client 1 Finance Manager', role: 'client_finance_manager', tenantSlug: 'telecom-client-1', module: 'Analytics', userStory: 'UC-CLIENT-ANALYTICS-002: Vendor Cost Optimization' },
    
    // Retail - Retail Client 1
    { email: 'retail1.admin@client.com', password: 'Client123!', fullName: 'Retail Client 1 Admin', role: 'client_admin', tenantSlug: 'retail-client-1', module: 'Field Service', userStory: 'UC-CLIENT-FSM-001: Supply Chain Vendor Management' },
    { email: 'retail1.ops@client.com', password: 'Client123!', fullName: 'Retail Client 1 Operations', role: 'client_operations_manager', tenantSlug: 'retail-client-1', module: 'Field Service', userStory: 'UC-CLIENT-FSM-003: Delivery Partner Oversight' },
    { email: 'retail1.procurement@client.com', password: 'Client123!', fullName: 'Retail Client 1 Procurement', role: 'client_procurement_manager', tenantSlug: 'retail-client-1', module: 'Vendor Management', userStory: 'UC-CLIENT-ASSET-002: Logistics Vendor Selection' },
    
    // Healthcare - Healthcare Client 1
    { email: 'healthcare1.admin@client.com', password: 'Client123!', fullName: 'Healthcare Client 1 Admin', role: 'client_admin', tenantSlug: 'healthcare-client-1', module: 'Asset Lifecycle', userStory: 'UC-CLIENT-ASSET-001: Medical Equipment Maintenance' },
    { email: 'healthcare1.compliance@client.com', password: 'Client123!', fullName: 'Healthcare Client 1 Compliance Officer', role: 'client_compliance_officer', tenantSlug: 'healthcare-client-1', module: 'Compliance', userStory: 'UC-CLIENT-FRAUD-002: Regulatory Compliance & Audits' },
    { email: 'healthcare1.executive@client.com', password: 'Client123!', fullName: 'Healthcare Client 1 Executive', role: 'client_executive', tenantSlug: 'healthcare-client-1', module: 'Analytics', userStory: 'UC-CLIENT-ANALYTICS-001: Healthcare Vendor Dashboard' },
    // Training
    { email: 'trainer@techcorp.com', password: 'Trainer123!', fullName: 'Training Coordinator', role: 'trainer', tenantSlug: null },
    
    // Customer
    { email: 'customer@example.com', password: 'Customer123!', fullName: 'Customer User', role: 'customer', tenantSlug: null },
  ];

  // 4 Partner organizations with 1 admin + 40 engineers each
  const partners = [
    { name: 'ServicePro', slug: 'servicepro', domain: 'servicepro.com' },
    { name: 'TechField', slug: 'techfield', domain: 'techfield.com' },
    { name: 'RepairHub', slug: 'repairhub', domain: 'repairhub.com' },
    { name: 'FixIt', slug: 'fixit', domain: 'fixit.com' },
  ];

  partners.forEach(partner => {
    // Partner admin
    accounts.push({
      email: `admin@${partner.domain}`,
      password: 'Partner123!',
      fullName: `${partner.name} Admin`,
      role: 'partner_admin',
      tenantSlug: partner.slug,
    });

    // 40 engineers per partner
    for (let i = 1; i <= 40; i++) {
      accounts.push({
        email: `engineer${i}@${partner.domain}`,
        password: 'Tech123!',
        fullName: `${partner.name} Engineer ${i}`,
        role: 'technician',
        tenantSlug: partner.slug,
      });
    }
  });

  return accounts;
}

const TEST_ACCOUNTS = generateTestAccounts();

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[seed-test-accounts] Starting account seeding...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch tenant IDs from database
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenants')
      .select('id, slug');

    if (tenantsError) {
      throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
    }

    const tenantMap = new Map(tenants?.map(t => [t.slug, t.id]) || []);

    // Create missing tenants for partners and clients
    const requiredTenants = [
      // Partner tenants
      { name: 'ServicePro Partners', slug: 'servicepro' },
      { name: 'TechField Solutions', slug: 'techfield' },
      { name: 'RepairHub Network', slug: 'repairhub' },
      { name: 'FixIt Partners', slug: 'fixit' },
      // Client tenants
      { name: 'OEM Client 1', slug: 'oem-client-1' },
      { name: 'OEM Client 2', slug: 'oem-client-2' },
      { name: 'Insurance Client 1', slug: 'insurance-client-1' },
      { name: 'Telecom Client 1', slug: 'telecom-client-1' },
      { name: 'Retail Client 1', slug: 'retail-client-1' },
      { name: 'Healthcare Client 1', slug: 'healthcare-client-1' },
    ];

    console.log('[seed-test-accounts] Creating missing tenants...');
    for (const tenant of requiredTenants) {
      if (!tenantMap.has(tenant.slug)) {
        console.log(`Creating tenant: ${tenant.slug}`);
        const { data: newTenant, error: tenantCreateError } = await supabaseAdmin
          .from('tenants')
          .insert({ name: tenant.name, slug: tenant.slug })
          .select()
          .single();
        
        if (!tenantCreateError && newTenant) {
          tenantMap.set(tenant.slug, newTenant.id);
          console.log(`Created tenant ${tenant.slug} with ID: ${newTenant.id}`);
        } else {
          console.error(`Failed to create tenant ${tenant.slug}:`, tenantCreateError);
        }
      }
    }

    const results = {
      created: [] as string[],
      existing: [] as string[],
      errors: [] as { email: string; error: string }[],
      summary: {
        total_accounts: TEST_ACCOUNTS.length,
        partner_admins: 4,
        engineers: 160,
        client_accounts: TEST_ACCOUNTS.filter(acc => acc.role?.startsWith('client_')).length,
        platform_users: TEST_ACCOUNTS.filter(acc => !acc.tenantSlug && !acc.role?.startsWith('client_') && acc.role !== 'partner_admin').length,
        user_story_accounts: TEST_ACCOUNTS.filter(acc => acc.userStory).length,
        by_module: {
          operations: TEST_ACCOUNTS.filter(acc => acc.module === 'Operations').length,
          finance: TEST_ACCOUNTS.filter(acc => acc.module === 'Finance').length,
          compliance: TEST_ACCOUNTS.filter(acc => acc.module === 'Compliance').length,
          fraud: TEST_ACCOUNTS.filter(acc => acc.module === 'Fraud').length,
          field_ops: TEST_ACCOUNTS.filter(acc => acc.module === 'Field Operations').length,
          platform_admin: TEST_ACCOUNTS.filter(acc => acc.module === 'Platform Admin').length,
          developer: TEST_ACCOUNTS.filter(acc => acc.module === 'Developer').length,
        }
      },
      user_story_coverage: {
        total_user_stories: TEST_ACCOUNTS.filter(acc => acc.userStory).length,
      }
    };

    for (const account of TEST_ACCOUNTS) {
      try {
        // Resolve tenant_id from slug
        const tenantId = account.tenantSlug ? tenantMap.get(account.tenantSlug) || null : null;

        console.log(`Creating account: ${account.email} (tenant: ${account.tenantSlug || 'none'})`);

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            full_name: account.fullName,
            tenant_slug: account.tenantSlug,
          },
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            console.log(`Account ${account.email} already exists`);
            results.existing.push(account.email);
            
            // Get existing user to assign role if needed
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers.users.find(u => u.email === account.email);
            
            if (existingUser) {
              // Check if role already assigned
              const { data: existingRole } = await supabaseAdmin
                .from('user_roles')
                .select('id')
                .eq('user_id', existingUser.id)
                .eq('role', account.role)
                .maybeSingle();

              if (!existingRole) {
                // Assign role if not already assigned
                await supabaseAdmin.from('user_roles').insert({
                  user_id: existingUser.id,
                  role: account.role,
                  tenant_id: tenantId,
                });
                console.log(`Assigned role ${account.role} to existing user ${account.email}`);
              }

              // Update profile tenant_id if needed
              await supabaseAdmin
                .from('profiles')
                .update({ tenant_id: tenantId })
                .eq('id', existingUser.id);
            }
            continue;
          }
          throw authError;
        }

        if (!authData.user) {
          throw new Error('Failed to create user');
        }

        console.log(`Created user: ${account.email} with ID: ${authData.user.id}`);

        // Update profile with tenant_id
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            tenant_id: tenantId,
            full_name: account.fullName,
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error(`Profile update error for ${account.email}:`, profileError);
        }

        // Assign role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: account.role,
            tenant_id: tenantId,
          });

        if (roleError) {
          console.error(`Role assignment error for ${account.email}:`, roleError);
          throw roleError;
        }

        results.created.push(account.email);
        console.log(`Successfully created and configured: ${account.email}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error creating ${account.email}:`, errorMessage);
        results.errors.push({ 
          email: account.email, 
          error: errorMessage 
        });
      }
    }

    console.log('Seed complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test accounts seeding complete with user story coverage',
        results,
        partner_admins: [
          { email: 'admin@servicepro.com', password: 'Partner123!', tenant: 'ServicePro Partners', engineers: 40 },
          { email: 'admin@techfield.com', password: 'Partner123!', tenant: 'TechField Solutions', engineers: 40 },
          { email: 'admin@repairhub.com', password: 'Partner123!', tenant: 'RepairHub Network', engineers: 40 },
          { email: 'admin@fixit.com', password: 'Partner123!', tenant: 'FixIt Partners', engineers: 40 },
        ],
        user_story_coverage: {
          operations: [
            { email: 'ops@techcorp.com', user_story: 'US-OP-001: Create and Assign Work Order' },
            { email: 'ops.sla@techcorp.com', user_story: 'US-OP-002: Monitor SLA Compliance' },
            { email: 'ops.dispatch@techcorp.com', user_story: 'US-OP-003: Dispatch with Route Optimization' },
            { email: 'ops.reports@techcorp.com', user_story: 'US-OP-004: Generate Performance Reports' },
          ],
          finance: [
            { email: 'finance@techcorp.com', user_story: 'US-FIN-001: Automated Penalty Calculation' },
            { email: 'finance.invoicing@techcorp.com', user_story: 'US-FIN-002: Generate Accurate Invoices' },
            { email: 'finance.forecast@techcorp.com', user_story: 'US-FIN-003: Revenue Forecasting Dashboard' },
            { email: 'finance.disputes@techcorp.com', user_story: 'US-FIN-004: Handle Billing Disputes' },
          ],
          compliance: [
            { email: 'auditor@techcorp.com', user_story: 'US-COMP-001: Conduct Access Reviews' },
            { email: 'auditor.evidence@techcorp.com', user_story: 'US-COMP-002: Collect Compliance Evidence' },
            { email: 'auditor.vuln@techcorp.com', user_story: 'US-COMP-003: Monitor Vulnerability SLAs' },
            { email: 'auditor.logs@techcorp.com', user_story: 'US-COMP-004: Review Audit Logs' },
          ],
          fraud: [
            { email: 'fraud@techcorp.com', user_story: 'US-FRAUD-001: Detect Document Forgery' },
            { email: 'fraud.anomaly@techcorp.com', user_story: 'US-FRAUD-002: Investigate Anomalous Behavior' },
            { email: 'fraud.cases@techcorp.com', user_story: 'US-FRAUD-003: Manage Fraud Cases' },
          ],
        },
        instructions: 'Test accounts are now seeded by user story and module. See docs/TEST_ACCOUNTS_USER_STORIES.md for complete reference.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in seed-test-accounts:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
