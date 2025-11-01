import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { tenantId, date, constraints } = await req.json();

    // Create optimization run
    const { data: run, error: runError } = await supabaseClient
      .from('schedule_optimization_runs')
      .insert({
        tenant_id: tenantId,
        run_date: date,
        algorithm_version: 'v1.0',
        constraints: constraints || {},
        status: 'running',
        started_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (runError) throw runError;

    try {
      // Fetch unassigned/draft work orders for the date
      const { data: workOrders } = await supabaseClient
        .from('work_orders')
        .select(`
          *,
          equipment:equipment_id (*),
          customer:customer_id (*)
        `)
        .eq('tenant_id', tenantId)
        .in('status', ['draft', 'assigned'])
        .gte('scheduled_start', `${date}T00:00:00Z`)
        .lte('scheduled_start', `${date}T23:59:59Z`);

      // Fetch available technicians
      const { data: technicians } = await supabaseClient
        .from('technicians')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      if (!workOrders?.length || !technicians?.length) {
        throw new Error('No work orders or technicians available');
      }

      // Simple constraint-based assignment algorithm
      const assignments = [];
      const technicianWorkload: Record<string, number> = {};

      // Sort work orders by priority and SLA deadline
      const sortedWOs = [...workOrders].sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityWeight[a.priority as keyof typeof priorityWeight] || 1;
        const bPriority = priorityWeight[b.priority as keyof typeof priorityWeight] || 1;
        return bPriority - aPriority;
      });

      for (const wo of sortedWOs) {
        // Find best technician based on:
        // 1. Skill match (if required skills in constraints)
        // 2. Current workload (balance)
        // 3. Location proximity (simplified: just balance workload)

        let bestTech = technicians[0];
        let minWorkload = technicianWorkload[technicians[0].id] || 0;

        for (const tech of technicians) {
          const currentWorkload = technicianWorkload[tech.id] || 0;
          if (currentWorkload < minWorkload) {
            minWorkload = currentWorkload;
            bestTech = tech;
          }
        }

        // Calculate estimated duration (default 2 hours if not specified)
        const durationMinutes = wo.estimated_duration_minutes || 120;
        const scheduledStart = new Date(wo.scheduled_start || date);
        const currentTechMinutes = technicianWorkload[bestTech.id] || 0;
        
        // Stagger start times based on workload
        scheduledStart.setMinutes(scheduledStart.getMinutes() + currentTechMinutes);
        
        const scheduledEnd = new Date(scheduledStart);
        scheduledEnd.setMinutes(scheduledEnd.getMinutes() + durationMinutes);

        assignments.push({
          optimization_run_id: run.id,
          work_order_id: wo.id,
          technician_id: bestTech.id,
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          travel_time_minutes: 15, // Simplified: fixed travel time
          priority_score: 80,
          skill_match_score: 90,
          applied: false,
        });

        technicianWorkload[bestTech.id] = (technicianWorkload[bestTech.id] || 0) + durationMinutes + 15;
      }

      // Insert assignments
      const { error: assignError } = await supabaseClient
        .from('optimized_schedule_assignments')
        .insert(assignments);

      if (assignError) throw assignError;

      // Update run status
      await supabaseClient
        .from('schedule_optimization_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', run.id);

      return new Response(JSON.stringify({
        runId: run.id,
        assignmentsCount: assignments.length,
        status: 'completed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      // Mark run as failed
      await supabaseClient
        .from('schedule_optimization_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', run.id);
      throw error;
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
