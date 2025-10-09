import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, name } = await req.json();

    console.log(`[Sandbox] Creating sandbox tenant for: ${email}`);

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: `${name} - Sandbox`,
        slug: `sandbox-${Date.now()}`,
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // Generate API key
    const apiKey = crypto.randomUUID();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    const { data: keyData, error: keyError } = await supabase
      .from('tenant_api_keys')
      .insert({
        tenant_id: tenant.id,
        api_key: apiKey,
        name: 'Sandbox API Key',
        expiry_date: expiryDate.toISOString(),
        rate_limit: 500, // Lower limit for sandbox
      })
      .select()
      .single();

    if (keyError) throw keyError;

    // Create sandbox tenant record
    const { error: sandboxError } = await supabase
      .from('sandbox_tenants')
      .insert({
        tenant_id: tenant.id,
        email,
        expires_at: expiryDate.toISOString(),
      });

    if (sandboxError) throw sandboxError;

    // Seed demo data
    await seedDemoData(supabase, tenant.id);

    // Send welcome email (you can integrate with Resend here)
    console.log(`[Sandbox] Created for ${email}, API Key: ${apiKey}`);

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenant.id,
        api_key: apiKey,
        expires_at: expiryDate.toISOString(),
        message: 'Sandbox environment created successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[Sandbox] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function seedDemoData(supabase: any, tenantId: string) {
  console.log(`[Sandbox] Seeding demo data for tenant: ${tenantId}`);

  // Create 10 demo work orders
  const workOrders = [];
  for (let i = 1; i <= 10; i++) {
    workOrders.push({
      wo_number: `WO-DEMO-${i}`,
      tenant_id: tenantId,
      issue_description: `Demo issue ${i}`,
      priority: ['low', 'medium', 'high'][i % 3] as any,
      status: ['draft', 'pending_validation', 'released'][i % 3] as any,
    });
  }

  await supabase.from('work_orders').insert(workOrders);

  console.log(`[Sandbox] Demo data seeded successfully`);
}
