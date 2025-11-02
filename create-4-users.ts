// Simple script to create 4 test users via Supabase Admin API
// Run: deno run --allow-net --allow-env create-4-users.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabaseUrl = 'https://srbvopyexztcoxcayydn.supabase.co';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!serviceRoleKey) {
  console.error('❌ Set SUPABASE_SERVICE_ROLE_KEY environment variable');
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const users = [
  { email: 'ops@techcorp.com', password: 'Ops123!', role: 'ops_manager', name: 'Operations Manager' },
  { email: 'finance@techcorp.com', password: 'Finance123!', role: 'finance_manager', name: 'Finance Manager' },
  { email: 'fraud@techcorp.com', password: 'Fraud123!', role: 'fraud_investigator', name: 'Fraud Investigator' },
  { email: 'auditor@techcorp.com', password: 'Auditor123!', role: 'auditor', name: 'Auditor' },
];

console.log('🚀 Creating 4 test users...\n');

for (const user of users) {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.name }
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log(`✓ ${user.email} already exists`);
        
        // Get existing user and assign role
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users.find(u => u.email === user.email);
        
        if (existingUser) {
          // Assign role
          const { error: roleError } = await supabase
            .from('user_roles')
            .upsert({ 
              user_id: existingUser.id, 
              role: user.role, 
              tenant_id: null 
            }, { onConflict: 'user_id,role,tenant_id' });
          
          if (!roleError) {
            console.log(`  ✓ Assigned ${user.role} role`);
          } else {
            console.error(`  ✗ Failed to assign role: ${roleError.message}`);
          }
        }
        continue;
      }
      throw authError;
    }

    console.log(`✓ Created ${user.email}`);

    // Assign role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({ 
        user_id: authData.user.id, 
        role: user.role, 
        tenant_id: null 
      }, { onConflict: 'user_id,role,tenant_id' });

    if (roleError) {
      console.error(`  ✗ Failed to assign role: ${roleError.message}`);
    } else {
      console.log(`  ✓ Assigned ${user.role} role`);
    }

  } catch (error) {
    console.error(`✗ ${user.email}:`, error.message);
  }
}

console.log('\n✅ Done!');

