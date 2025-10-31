import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate internal secret for admin operations
    const INTERNAL_SECRET = Deno.env.get('INTERNAL_API_SECRET');
    const providedSecret = req.headers.get('x-internal-secret');
    
    if (!INTERNAL_SECRET || providedSecret !== INTERNAL_SECRET) {
      console.error('[create-demo-workorders] Unauthorized: Invalid or missing internal secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: This endpoint requires internal authentication' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting creation of 2000 work orders...');

    // Get technicians
    const { data: techs } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'technician')
      .limit(162);

    if (!techs || techs.length === 0) {
      throw new Error('No technicians found');
    }

    console.log(`Found ${techs.length} technicians`);

    // Get tenants
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id');

    if (!tenants || tenants.length === 0) {
      throw new Error('No tenants found');
    }

    console.log(`Found ${tenants.length} tenants`);

    // Get customer
    const { data: customer } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', 'customer@example.com')
      .single();

    if (!customer) {
      throw new Error('Customer not found');
    }

    const symptoms = [
      'Printer not printing, paper jam error',
      'Computer won\'t boot, blue screen error',
      'Intermittent shutdown, overheating warning',
      'Laptop screen flickering, display issues',
      'Printer showing offline status',
      'Desktop slow performance, frequent freezing',
      'Printer ink cartridge not recognized',
      'Computer fan making loud noise',
      'Laptop battery not charging',
      'Printer producing smudged prints',
      'Desktop no video output',
      'Laptop keyboard keys not responding',
      'Printer network connectivity issues',
      'Computer random restarts',
      'Printer color calibration problems',
      'Desktop memory errors detected',
      'Laptop touchpad not working',
      'Printer spooler service errors',
      'Computer USB ports not functioning',
      'Printer driver installation failure'
    ];

    const statuses = ['draft', 'pending_validation', 'released', 'in_progress', 'completed'];
    const partStatuses = ['not_required', 'reserved', 'issued', 'received', 'consumed', 'unutilized'];

    let created = 0;
    const batchSize = 100;

    // Create in batches
    for (let batch = 0; batch < 20; batch++) {
      const ticketBatch = [];
      const workOrderBatch = [];
      const precheckBatch = [];

      for (let i = 0; i < batchSize; i++) {
        const n = batch * batchSize + i + 1;
        const techId = techs[n % techs.length].user_id;
        const tenantId = tenants[n % tenants.length].id;
        const symptom = symptoms[n % symptoms.length];
        const status = statuses[n % statuses.length];
        const partStatus = partStatuses[n % partStatuses.length];
        const repairType = (n % 2 === 0) ? 'in_warranty' : 'out_of_warranty';
        const cost = Math.floor(Math.random() * 500 * 100) / 100;
        const daysAgo = Math.floor(Math.random() * 90);
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

        const ticketStatus = ['draft', 'pending_validation'].includes(status) ? 'open' :
                            ['released', 'in_progress'].includes(status) ? 'assigned' : 'closed';

        // Create ticket
        const { data: ticket, error: ticketError } = await supabaseAdmin
          .from('tickets')
          .insert({
            tenant_id: tenantId,
            customer_id: customer.id,
            customer_name: `Customer ${n}`,
            unit_serial: `PC-${String(n).padStart(6, '0')}`,
            site_address: `${n} Tech Street, Suite ${n % 100}`,
            symptom: symptom,
            status: ticketStatus,
            created_at: createdAt,
            updated_at: createdAt
          })
          .select('id')
          .single();

        if (ticketError || !ticket) {
          console.error(`Failed to create ticket ${n}:`, ticketError);
          continue;
        }

        // Create work order
        const woNumber = `WO-2025-${String(n).padStart(4, '0')}`;
        const releasedAt = ['released', 'in_progress', 'completed'].includes(status) 
          ? new Date(new Date(createdAt).getTime() + 60 * 60 * 1000).toISOString() 
          : null;
        const completedAt = status === 'completed' 
          ? new Date(new Date(createdAt).getTime() + 4 * 60 * 60 * 1000).toISOString() 
          : null;

        const { data: wo, error: woError } = await supabaseAdmin
          .from('work_orders')
          .insert({
            wo_number: woNumber,
            ticket_id: ticket.id,
            technician_id: techId,
            status: status,
            part_status: partStatus,
            repair_type: ['released', 'in_progress', 'completed'].includes(status) ? repairType : null,
            cost_to_customer: status === 'completed' ? cost : 0,
            warranty_checked: ['released', 'in_progress', 'completed'].includes(status),
            warranty_result: ['released', 'in_progress', 'completed'].includes(status) ? {
              covered: repairType === 'in_warranty',
              warranty_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              parts_coverage: []
            } : null,
            parts_reserved: ['released', 'in_progress', 'completed'].includes(status),
            released_at: releasedAt,
            completed_at: completedAt,
            created_at: createdAt,
            updated_at: new Date(new Date(createdAt).getTime() + 30 * 60 * 1000).toISOString()
          })
          .select('id')
          .single();

        if (woError || !wo) {
          console.error(`Failed to create work order ${n}:`, woError);
          continue;
        }

        // Create precheck if needed
        if (['released', 'in_progress', 'completed'].includes(status)) {
          await supabaseAdmin
            .from('work_order_prechecks')
            .insert({
              work_order_id: wo.id,
              inventory_status: 'passed',
              warranty_status: 'passed',
              photo_status: 'passed',
              inventory_result: { all_available: true, parts: [] },
              warranty_result: {
                covered: repairType === 'in_warranty',
                warranty_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              },
              photo_result: { 
                before_photos: 2, 
                after_photos: status === 'completed' ? 2 : 0 
              },
              can_release: true,
              created_at: createdAt,
              updated_at: createdAt
            });
        }

        created++;
      }

      console.log(`Batch ${batch + 1}/20 complete. Total created: ${created}`);
    }

    // Verify final count
    const { count } = await supabaseAdmin
      .from('work_orders')
      .select('*', { count: 'exact', head: true });

    console.log(`FINAL VERIFICATION: ${count} work orders in database`);

    return new Response(
      JSON.stringify({
        success: true,
        created: created,
        total_in_db: count,
        message: `Successfully created ${created} work orders. Total in DB: ${count}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error creating demo work orders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
