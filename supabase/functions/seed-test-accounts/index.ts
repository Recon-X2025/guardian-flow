import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEST_ACCOUNTS = [
  { email: 'admin@techcorp.com', password: 'Admin123!', fullName: 'System Admin', role: 'sys_admin', tenantId: '11111111-1111-1111-1111-111111111111' },
  { email: 'tenant.admin@techcorp.com', password: 'Admin123!', fullName: 'Tenant Admin', role: 'tenant_admin', tenantId: '11111111-1111-1111-1111-111111111111' },
  { email: 'ops@techcorp.com', password: 'Ops123!', fullName: 'Operations Manager', role: 'ops_manager', tenantId: '11111111-1111-1111-1111-111111111111' },
  { email: 'finance@techcorp.com', password: 'Finance123!', fullName: 'Finance Manager', role: 'finance_manager', tenantId: '11111111-1111-1111-1111-111111111111' },
  { email: 'fraud@techcorp.com', password: 'Fraud123!', fullName: 'Fraud Investigator', role: 'fraud_investigator', tenantId: '11111111-1111-1111-1111-111111111111' },
  { email: 'partner.admin@servicepro.com', password: 'Partner123!', fullName: 'Partner Admin', role: 'partner_admin', tenantId: '22222222-2222-2222-2222-222222222222' },
  { email: 'partner@servicepro.com', password: 'Partner123!', fullName: 'Partner User', role: 'partner_user', tenantId: '22222222-2222-2222-2222-222222222222' },
  { email: 'tech1@servicepro.com', password: 'Tech123!', fullName: 'Technician One', role: 'technician', tenantId: '22222222-2222-2222-2222-222222222222' },
  { email: 'tech2@servicepro.com', password: 'Tech123!', fullName: 'Technician Two', role: 'technician', tenantId: '22222222-2222-2222-2222-222222222222' },
  { email: 'dispatch@techcorp.com', password: 'Dispatch123!', fullName: 'Dispatcher', role: 'dispatcher', tenantId: '11111111-1111-1111-1111-111111111111' },
  { email: 'customer@example.com', password: 'Customer123!', fullName: 'Customer User', role: 'customer', tenantId: null },
  { email: 'mlops@techcorp.com', password: 'MLOps123!', fullName: 'ML Operations', role: 'ml_ops', tenantId: '11111111-1111-1111-1111-111111111111' },
  { email: 'billing@techcorp.com', password: 'Billing123!', fullName: 'Billing Agent', role: 'billing_agent', tenantId: '11111111-1111-1111-1111-111111111111' },
  { email: 'auditor@techcorp.com', password: 'Auditor123!', fullName: 'Auditor', role: 'auditor', tenantId: '11111111-1111-1111-1111-111111111111' },
  { email: 'support@techcorp.com', password: 'Support123!', fullName: 'Support Agent', role: 'support_agent', tenantId: '11111111-1111-1111-1111-111111111111' },
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results = {
      created: [] as string[],
      existing: [] as string[],
      errors: [] as { email: string; error: string }[],
    };

    for (const account of TEST_ACCOUNTS) {
      try {
        console.log(`Creating account: ${account.email}`);

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            full_name: account.fullName,
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
                  tenant_id: account.tenantId,
                });
                console.log(`Assigned role ${account.role} to existing user ${account.email}`);
              }
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
            tenant_id: account.tenantId,
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
            tenant_id: account.tenantId,
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
        instructions: 'You can now log in with any of the created accounts using their email and password.',
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
