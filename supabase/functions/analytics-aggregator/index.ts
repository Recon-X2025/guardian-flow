import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { metric_type, time_range = '7d', tenant_id } = await req.json();

    // Calculate date range
    const now = new Date();
    const daysAgo = parseInt(time_range);
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    let result: any = {};

    switch (metric_type) {
      case 'revenue_trend':
        result = await calculateRevenueTrend(supabase, tenant_id, startDate, now);
        break;
      case 'sla_compliance':
        result = await calculateSLACompliance(supabase, tenant_id, startDate, now);
        break;
      case 'workforce_utilization':
        result = await calculateWorkforceUtilization(supabase, tenant_id, startDate, now);
        break;
      case 'penalty_analysis':
        result = await calculatePenaltyAnalysis(supabase, tenant_id, startDate, now);
        break;
      case 'technician_performance':
        result = await calculateTechnicianPerformance(supabase, tenant_id, startDate, now);
        break;
      default:
        throw new Error(`Unknown metric type: ${metric_type}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Analytics aggregation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function calculateRevenueTrend(supabase: any, tenant_id: string, start: Date, end: Date) {
  const { data: workOrders } = await supabase
    .from('work_orders')
    .select('cost_to_customer, completed_at')
    .eq('tenant_id', tenant_id)
    .eq('status', 'completed')
    .gte('completed_at', start.toISOString())
    .lte('completed_at', end.toISOString());

  const dailyRevenue: Record<string, number> = {};
  workOrders?.forEach((wo: any) => {
    const date = new Date(wo.completed_at).toISOString().split('T')[0];
    dailyRevenue[date] = (dailyRevenue[date] || 0) + Number(wo.cost_to_customer || 0);
  });

  return {
    trend: Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue })),
    total: Object.values(dailyRevenue).reduce((sum, v) => sum + v, 0),
    average: Object.values(dailyRevenue).reduce((sum, v) => sum + v, 0) / Object.keys(dailyRevenue).length
  };
}

async function calculateSLACompliance(supabase: any, tenant_id: string, start: Date, end: Date) {
  const { data: workOrders } = await supabase
    .from('work_orders')
    .select('created_at, completed_at')
    .eq('tenant_id', tenant_id)
    .eq('status', 'completed')
    .gte('completed_at', start.toISOString())
    .lte('completed_at', end.toISOString());

  const SLA_HOURS = 48;
  let withinSLA = 0;
  let total = workOrders?.length || 0;

  workOrders?.forEach((wo: any) => {
    const created = new Date(wo.created_at);
    const completed = new Date(wo.completed_at);
    const hoursDiff = (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
    if (hoursDiff <= SLA_HOURS) withinSLA++;
  });

  return {
    compliance_rate: total > 0 ? (withinSLA / total) * 100 : 0,
    within_sla: withinSLA,
    total: total,
    breached: total - withinSLA
  };
}

async function calculateWorkforceUtilization(supabase: any, tenant_id: string, start: Date, end: Date) {
  const { data: technicians } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'technician');

  const { data: workOrders } = await supabase
    .from('work_orders')
    .select('technician_id, status')
    .in('technician_id', technicians?.map((t: any) => t.user_id) || [])
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  const utilization: Record<string, number> = {};
  workOrders?.forEach((wo: any) => {
    utilization[wo.technician_id] = (utilization[wo.technician_id] || 0) + 1;
  });

  return {
    total_technicians: technicians?.length || 0,
    active_technicians: Object.keys(utilization).length,
    average_jobs_per_tech: Object.values(utilization).reduce((sum, v) => sum + v, 0) / (technicians?.length || 1)
  };
}

async function calculatePenaltyAnalysis(supabase: any, tenant_id: string, start: Date, end: Date) {
  const { data: penalties } = await supabase
    .from('penalty_applications')
    .select('amount, applied_at, penalty_rules(name, rule_type)')
    .eq('tenant_id', tenant_id)
    .gte('applied_at', start.toISOString())
    .lte('applied_at', end.toISOString());

  const totalAmount = penalties?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const byType: Record<string, number> = {};

  penalties?.forEach((p: any) => {
    const type = p.penalty_rules?.rule_type || 'unknown';
    byType[type] = (byType[type] || 0) + Number(p.amount);
  });

  return {
    total_penalties: penalties?.length || 0,
    total_amount: totalAmount,
    by_type: byType,
    average_penalty: totalAmount / (penalties?.length || 1)
  };
}

async function calculateTechnicianPerformance(supabase: any, tenant_id: string, start: Date, end: Date) {
  const { data: workOrders } = await supabase
    .from('work_orders')
    .select(`
      technician_id,
      status,
      completed_at,
      created_at,
      profiles!work_orders_technician_id_fkey(full_name)
    `)
    .eq('tenant_id', tenant_id)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  const performance: Record<string, any> = {};

  workOrders?.forEach((wo: any) => {
    if (!performance[wo.technician_id]) {
      performance[wo.technician_id] = {
        name: wo.profiles?.full_name || 'Unknown',
        total_jobs: 0,
        completed_jobs: 0,
        avg_completion_time: 0,
        completion_times: []
      };
    }

    performance[wo.technician_id].total_jobs++;
    if (wo.status === 'completed' && wo.completed_at) {
      performance[wo.technician_id].completed_jobs++;
      const hours = (new Date(wo.completed_at).getTime() - new Date(wo.created_at).getTime()) / (1000 * 60 * 60);
      performance[wo.technician_id].completion_times.push(hours);
    }
  });

  // Calculate averages
  Object.values(performance).forEach((perf: any) => {
    if (perf.completion_times.length > 0) {
      perf.avg_completion_time = perf.completion_times.reduce((sum: number, t: number) => sum + t, 0) / perf.completion_times.length;
    }
    delete perf.completion_times;
  });

  return { technicians: Object.entries(performance).map(([id, data]) => ({ id, ...data as any })) };
}
