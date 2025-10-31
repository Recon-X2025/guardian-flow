import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { recordFunctionCall } from '../_shared/telemetry.ts';
import { trackEvent } from '../_shared/analytics.ts';

interface SeedConfig {
  tenantId: string;
  seedType: 'demo' | 'test' | 'performance';
  counts: {
    customers?: number;
    technicians?: number;
    equipment?: number;
    tickets?: number;
    workOrders?: number;
    assets?: number;
  };
  includeCompliance?: boolean;
}

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) throw new Error('Unauthorized');

    const config: SeedConfig = await req.json();

    console.log('Starting validated data seeding:', config);

    const entitiesCreated: Record<string, number> = {};
    const validationErrors: string[] = [];

    // Seed customers
    if (config.counts.customers && config.counts.customers > 0) {
      const customerCount = await seedCustomers(supabase, config.tenantId, config.counts.customers);
      entitiesCreated.customers = customerCount;
    }

    // Seed technicians
    if (config.counts.technicians && config.counts.technicians > 0) {
      const techCount = await seedTechnicians(supabase, config.tenantId, config.counts.technicians);
      entitiesCreated.technicians = techCount;
    }

    // Seed equipment
    if (config.counts.equipment && config.counts.equipment > 0) {
      const equipCount = await seedEquipment(supabase, config.tenantId, config.counts.equipment);
      entitiesCreated.equipment = equipCount;
    }

    // Seed assets (Phase 1 prep)
    if (config.counts.assets && config.counts.assets > 0) {
      const assetCount = await seedAssets(supabase, config.tenantId, config.counts.assets);
      entitiesCreated.assets = assetCount;
    }

    // Validate referential integrity
    const validation = await validateSeedData(supabase, config.tenantId, entitiesCreated);
    
    // Record seed metadata
    await supabase.from('seed_metadata').insert({
      tenant_id: config.tenantId,
      seed_type: config.seedType,
      entities_created: entitiesCreated,
      validation_results: {
        success: validation.success,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      created_by: user.id,
    });

    // Track analytics event
    await trackEvent({
      tenantId: config.tenantId,
      eventType: 'seed_data.completed',
      eventCategory: 'operational',
      userId: user.id,
      metadata: { entitiesCreated, seedType: config.seedType },
    });

    await recordFunctionCall({
      functionName: 'seed-validated-data',
      startTime,
      status: 'success',
      tenantId: config.tenantId,
      userId: user.id,
      securityLevel: 'privileged',
      req,
    });

    return new Response(
      JSON.stringify({
        success: true,
        entitiesCreated,
        validation: validation,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Seed validation error:', error);
    
    await recordFunctionCall({
      functionName: 'seed-validated-data',
      startTime,
      status: 'error',
      error: error instanceof Error ? error : new Error('Unknown error'),
      securityLevel: 'privileged',
      req,
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function seedCustomers(supabase: any, tenantId: string, count: number): Promise<number> {
  const customers = [];
  for (let i = 0; i < count; i++) {
    customers.push({
      tenant_id: tenantId,
      name: `Customer ${i + 1}`,
      email: `customer${i + 1}@example.com`,
      phone: `+1${String(i).padStart(10, '0')}`,
      status: 'active',
    });
  }
  
  const { error } = await supabase.from('customers').insert(customers);
  if (error) throw error;
  
  return customers.length;
}

async function seedTechnicians(supabase: any, tenantId: string, count: number): Promise<number> {
  const technicians = [];
  for (let i = 0; i < count; i++) {
    technicians.push({
      tenant_id: tenantId,
      first_name: `Tech`,
      last_name: `${i + 1}`,
      email: `tech${i + 1}@example.com`,
      phone: `+1${String(i + 5000).padStart(10, '0')}`,
      status: 'active',
      certification_level: 'certified',
    });
  }
  
  const { error } = await supabase.from('technicians').insert(technicians);
  if (error) throw error;
  
  return technicians.length;
}

async function seedEquipment(supabase: any, tenantId: string, count: number): Promise<number> {
  // Get customers for FK relationship
  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(10);
  
  if (!customers || customers.length === 0) {
    throw new Error('No customers found for equipment seeding');
  }
  
  const equipment = [];
  for (let i = 0; i < count; i++) {
    equipment.push({
      tenant_id: tenantId,
      customer_id: customers[i % customers.length].id,
      name: `Equipment ${i + 1}`,
      category: 'hvac',
      status: 'active',
      serial_number: `SN${String(i).padStart(6, '0')}`,
    });
  }
  
  const { error } = await supabase.from('equipment').insert(equipment);
  if (error) throw error;
  
  return equipment.length;
}

async function seedAssets(supabase: any, tenantId: string, count: number): Promise<number> {
  const assets = [];
  for (let i = 0; i < count; i++) {
    assets.push({
      tenant_id: tenantId,
      asset_number: `AST-${String(i + 1).padStart(6, '0')}`,
      asset_name: `Asset ${i + 1}`,
      asset_type: 'equipment',
      status: 'active',
      lifecycle_stage: 'operation',
      purchase_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
  }
  
  const { error } = await supabase.from('assets').insert(assets);
  if (error) throw error;
  
  return assets.length;
}

async function validateSeedData(
  supabase: any,
  tenantId: string,
  entitiesCreated: Record<string, number>
): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate customer count
  const { count: customerCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  if (customerCount !== entitiesCreated.customers) {
    errors.push(`Customer count mismatch: expected ${entitiesCreated.customers}, got ${customerCount}`);
  }

  // Validate technician count
  const { count: techCount } = await supabase
    .from('technicians')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  if (techCount !== entitiesCreated.technicians) {
    errors.push(`Technician count mismatch: expected ${entitiesCreated.technicians}, got ${techCount}`);
  }

  // Check for orphaned equipment (equipment without valid customers)
  const { data: orphanedEquipment } = await supabase
    .from('equipment')
    .select('id')
    .eq('tenant_id', tenantId)
    .is('customer_id', null);

  if (orphanedEquipment && orphanedEquipment.length > 0) {
    warnings.push(`Found ${orphanedEquipment.length} equipment records without customers`);
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}
