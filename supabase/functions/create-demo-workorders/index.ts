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
    // Get JWT token from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client with user's JWT for auth check
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[create-demo-workorders] Authenticated user: ${user.email}`);

    // Use service role for admin operations
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

    // Get the highest existing WO number to avoid duplicates
    const { data: maxWO } = await supabaseAdmin
      .from('work_orders')
      .select('wo_number')
      .order('wo_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    let startNumber = 1;
    if (maxWO?.wo_number) {
      const match = maxWO.wo_number.match(/WO-\d+-(\d+)/);
      if (match) {
        startNumber = parseInt(match[1]) + 1;
      }
    }

    console.log(`Starting WO numbers from: WO-2025-${String(startNumber).padStart(4, '0')}`);

    let created = 0;

    // Batch planning numbers
    const totalToCreate = 2000;
    const batchSize = 500; // 4 batches x 500 = 2000
    const totalBatches = Math.ceil(totalToCreate / batchSize);

    for (let batch = 0; batch < totalBatches; batch++) {
      type Plan = {
        n: number;
        techId: string;
        tenantId: string;
        symptom: string;
        status: string;
        partStatus: string;
        repairType: 'in_warranty' | 'out_of_warranty';
        cost: number;
        createdAt: string;
        woNumber: string;
        releasedAt: string | null;
        completedAt: string | null;
      };

      const plans: Plan[] = [];

      for (let i = 0; i < batchSize; i++) {
        const globalIndex = batch * batchSize + i;
        if (globalIndex >= totalToCreate) break;

        const n = globalIndex + 1;
        const woIndex = startNumber + globalIndex;
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
                             ['released', 'in_progress'].includes(status) ? 'assigned' : 'completed';

        const woNumber = `WO-2025-${String(woIndex).padStart(4, '0')}`;
        const releasedAt = ['released', 'in_progress', 'completed'].includes(status)
          ? new Date(new Date(createdAt).getTime() + 60 * 60 * 1000).toISOString() : null;
        const completedAt = status === 'completed'
          ? new Date(new Date(createdAt).getTime() + 4 * 60 * 60 * 1000).toISOString() : null;

        plans.push({
          n,
          techId,
          tenantId,
          symptom,
          status,
          partStatus,
          repairType,
          cost,
          createdAt,
          woNumber,
          releasedAt,
          completedAt,
        });
      }

      // Bulk insert tickets
      const ticketRows = plans.map((p) => ({
        tenant_id: p.tenantId,
        customer_id: customer.id,
        customer_name: `Customer ${p.n}`,
        unit_serial: `PC-${String(p.n).padStart(6, '0')}`,
        site_address: `${p.n} Tech Street, Suite ${p.n % 100}`,
        symptom: p.symptom,
        status: ['draft', 'pending_validation'].includes(p.status) ? 'open'
              : ['released', 'in_progress'].includes(p.status) ? 'assigned' : 'completed',
        created_at: p.createdAt,
        updated_at: p.createdAt,
      }));

      const { data: ticketsInserted, error: ticketsErr } = await supabaseAdmin
        .from('tickets')
        .insert(ticketRows)
        .select('id');

      if (ticketsErr || !ticketsInserted) {
        console.error(`[create-demo-workorders] Ticket batch ${batch + 1}/${totalBatches} failed:`, ticketsErr);
        continue;
      }

      // Bulk insert work orders
      const workOrderRows = plans.map((p, idx) => ({
        wo_number: p.woNumber,
        ticket_id: ticketsInserted[idx].id,
        technician_id: p.techId,
        status: p.status,
        part_status: p.partStatus,
        repair_type: ['released', 'in_progress', 'completed'].includes(p.status) ? p.repairType : null,
        cost_to_customer: p.status === 'completed' ? p.cost : 0,
        warranty_checked: ['released', 'in_progress', 'completed'].includes(p.status),
        warranty_result: ['released', 'in_progress', 'completed'].includes(p.status) ? {
          covered: p.repairType === 'in_warranty',
          warranty_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          parts_coverage: []
        } : null,
        parts_reserved: ['released', 'in_progress', 'completed'].includes(p.status),
        released_at: p.releasedAt,
        completed_at: p.completedAt,
        created_at: p.createdAt,
        updated_at: new Date(new Date(p.createdAt).getTime() + 30 * 60 * 1000).toISOString(),
      }));

      const { data: workOrdersInserted, error: woErr } = await supabaseAdmin
        .from('work_orders')
        .insert(workOrderRows)
        .select('id, status');

      if (woErr || !workOrdersInserted) {
        console.error(`[create-demo-workorders] WO batch ${batch + 1}/${totalBatches} failed:`, woErr);
        continue;
      }

      // Bulk insert prechecks only for relevant statuses
      const precheckRows = workOrdersInserted
        .map((wo, idx) => ({ wo, plan: plans[idx] }))
        .filter(({ plan }) => ['released', 'in_progress', 'completed'].includes(plan.status))
        .map(({ wo, plan }) => ({
          work_order_id: wo.id,
          inventory_status: 'passed',
          warranty_status: 'passed',
          photo_status: 'passed',
          inventory_result: { all_available: true, parts: [] },
          warranty_result: {
            covered: plan.repairType === 'in_warranty',
            warranty_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          },
          photo_result: { before_photos: 2, after_photos: plan.status === 'completed' ? 2 : 0 },
          can_release: true,
          created_at: plan.createdAt,
          updated_at: plan.createdAt,
        }));

      if (precheckRows.length > 0) {
        const { error: preErr } = await supabaseAdmin
          .from('work_order_prechecks')
          .insert(precheckRows);
        if (preErr) {
          console.error(`[create-demo-workorders] Precheck batch ${batch + 1}/${totalBatches} failed:`, preErr);
        }
      }

      created += workOrdersInserted.length;
      console.log(`Batch ${batch + 1}/${totalBatches} complete. Total created so far: ${created}`);
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
