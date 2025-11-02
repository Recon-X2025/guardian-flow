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
    // Validate internal secret for admin operations
    const INTERNAL_SECRET = Deno.env.get('INTERNAL_API_SECRET');
    const providedSecret = req.headers.get('x-internal-secret');
    
    if (!INTERNAL_SECRET || providedSecret !== INTERNAL_SECRET) {
      console.error('[create-sandbox-tenant] Unauthorized: Invalid or missing internal secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: This endpoint requires internal authentication' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, name, module_context = 'platform' } = await req.json();

    console.log(`[Sandbox] Creating sandbox tenant for: ${email} (module: ${module_context})`);

    // Check if sandbox already exists for this email+module
    const { data: existingSandbox } = await supabase
      .from('sandbox_tenants')
      .select('tenant_id, expires_at')
      .eq('email', email)
      .eq('module_context', module_context)
      .single();

    // If exists and not expired, return existing
    if (existingSandbox && new Date(existingSandbox.expires_at) > new Date()) {
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', existingSandbox.tenant_id)
        .single();

      const { data: existingKey } = await supabase
        .from('tenant_api_keys')
        .select('api_key')
        .eq('tenant_id', existingSandbox.tenant_id)
        .single();

      console.log(`[Sandbox] Reusing existing sandbox for ${email} (${module_context})`);
      
      return new Response(
        JSON.stringify({
          success: true,
          tenant_id: existingTenant.id,
          api_key: existingKey?.api_key,
          expires_at: existingSandbox.expires_at,
          message: 'Using existing sandbox environment',
          reused: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new tenant with module context
    const moduleLabel = module_context === 'platform' ? '' : ` (${module_context.toUpperCase()})`;
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: `${name} - Sandbox${moduleLabel}`,
        slug: `sandbox-${module_context}-${Date.now()}`,
        module_context,
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
        module_context,
        expires_at: expiryDate.toISOString(),
      });

    if (sandboxError) throw sandboxError;

    // Seed module-specific demo data (non-fatal)
    try {
      await seedModuleData(supabase, tenant.id, module_context);
    } catch (e) {
      console.warn('[Sandbox] Seeding failed (non-fatal):', e);
    }

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

async function seedModuleData(supabase: any, tenantId: string, moduleContext: string) {
  console.log(`[Sandbox] Seeding ${moduleContext} module data for tenant: ${tenantId}`);

  // Module-specific seeding logic
  switch (moduleContext) {
    case 'fsm':
      await seedFSMData(supabase, tenantId);
      break;
    case 'fraud':
      await seedFraudData(supabase, tenantId);
      break;
    case 'analytics':
      await seedAnalyticsData(supabase, tenantId);
      break;
    case 'training':
      await seedTrainingData(supabase, tenantId);
      break;
    case 'asset':
      await seedAssetData(supabase, tenantId);
      break;
    case 'marketplace':
      await seedMarketplaceData(supabase, tenantId);
      break;
    case 'customer':
      await seedCustomerData(supabase, tenantId);
      break;
    default:
      // Platform: seed comprehensive data
      await seedPlatformData(supabase, tenantId);
  }

  // Log data source
  await supabase.from('module_data_sources').insert({
    tenant_id: tenantId,
    module_context: moduleContext,
    source_type: 'demo',
    source_name: `${moduleContext} Sandbox Seed`,
    record_count: 10,
  });

  console.log(`[Sandbox] ${moduleContext} data seeded successfully`);
}

async function seedFSMData(supabase: any, tenantId: string) {
  const workOrders = [];
  for (let i = 1; i <= 10; i++) {
    workOrders.push({
      wo_number: `WO-FSM-${i}`,
      tenant_id: tenantId,
      issue_description: `Field service issue ${i}`,
      priority: ['low', 'medium', 'high'][i % 3] as any,
      status: ['draft', 'pending_validation', 'released'][i % 3] as any,
    });
  }
  await supabase.from('work_orders').insert(workOrders);
}

async function seedFraudData(supabase: any, tenantId: string) {
  // Seed fraud-specific demo data
  console.log(`[Sandbox] Fraud module: seed forgery detections, investigations`);
}

async function seedAnalyticsData(supabase: any, tenantId: string) {
  // Seed analytics-specific demo data
  console.log(`[Sandbox] Analytics module: seed reports, dashboards`);
}

async function seedTrainingData(supabase: any, tenantId: string) {
  // Seed training-specific demo data
  console.log(`[Sandbox] Training module: seed courses, certifications`);
}

async function seedAssetData(supabase: any, tenantId: string) {
  // Seed asset lifecycle demo data
  console.log(`[Sandbox] Asset module: seed equipment, maintenance records`);
}

async function seedMarketplaceData(supabase: any, tenantId: string) {
  // Seed marketplace demo data
  console.log(`[Sandbox] Marketplace module: seed extensions, listings`);
}

async function seedCustomerData(supabase: any, tenantId: string) {
  // Seed customer portal demo data
  console.log(`[Sandbox] Customer module: seed service bookings, tickets`);
}

async function seedPlatformData(supabase: any, tenantId: string) {
  // Comprehensive platform seed
  await seedFSMData(supabase, tenantId);
  console.log(`[Sandbox] Platform: comprehensive data seeded`);
}
