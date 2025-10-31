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
  }> = [
    // Core platform accounts
    { email: 'admin@techcorp.com', password: 'Admin123!', fullName: 'System Admin', role: 'sys_admin', tenantSlug: null },
    { email: 'ops@techcorp.com', password: 'Ops123!', fullName: 'Operations Manager', role: 'ops_manager', tenantSlug: null },
    { email: 'finance@techcorp.com', password: 'Finance123!', fullName: 'Finance Manager', role: 'finance_manager', tenantSlug: null },
    { email: 'fraud@techcorp.com', password: 'Fraud123!', fullName: 'Fraud Investigator', role: 'fraud_investigator', tenantSlug: null },
    { email: 'dispatch@techcorp.com', password: 'Dispatch123!', fullName: 'Dispatcher', role: 'dispatcher', tenantSlug: null },
    { email: 'customer@example.com', password: 'Customer123!', fullName: 'Customer User', role: 'customer', tenantSlug: null },
    { email: 'mlops@techcorp.com', password: 'MLOps123!', fullName: 'ML Operations', role: 'ml_ops', tenantSlug: null },
    { email: 'billing@techcorp.com', password: 'Billing123!', fullName: 'Billing Agent', role: 'billing_agent', tenantSlug: null },
    { email: 'auditor@techcorp.com', password: 'Auditor123!', fullName: 'Auditor', role: 'auditor', tenantSlug: null },
    { email: 'support@techcorp.com', password: 'Support123!', fullName: 'Support Agent', role: 'support_agent', tenantSlug: null },
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

    const results = {
      created: [] as string[],
      existing: [] as string[],
      errors: [] as { email: string; error: string }[],
      summary: {
        total_accounts: TEST_ACCOUNTS.length,
        partner_admins: 4,
        engineers: 160,
        platform_users: TEST_ACCOUNTS.length - 164,
      },
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
        message: 'Test accounts seeding complete',
        results,
        partner_admins: [
          { email: 'admin@servicepro.com', password: 'Partner123!', tenant: 'ServicePro Partners', engineers: 40 },
          { email: 'admin@techfield.com', password: 'Partner123!', tenant: 'TechField Solutions', engineers: 40 },
          { email: 'admin@repairhub.com', password: 'Partner123!', tenant: 'RepairHub Network', engineers: 40 },
          { email: 'admin@fixit.com', password: 'Partner123!', tenant: 'FixIt Partners', engineers: 40 },
        ],
        instructions: 'You can now log in with any partner admin account. Each partner admin can only see finance data for their 40 engineers.',
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
