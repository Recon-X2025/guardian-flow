import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate internal secret for automated penalty application
  const internalSecret = req.headers.get('x-internal-secret');
  const expectedSecret = Deno.env.get('INTERNAL_API_SECRET');
  
  if (!internalSecret || internalSecret !== expectedSecret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[Penalty Application] Starting automated penalty check');

    // Get all active penalty rules
    const { data: rules, error: rulesError } = await supabase
      .from('penalty_matrix')
      .select('*')
      .eq('active', true);

    if (rulesError) throw rulesError;

    const appliedPenalties = [];

    // Check SLA breach penalties
    const slaViolations = await checkSLABreaches(supabase);
    for (const violation of slaViolations) {
      const rule = rules.find(r => r.violation_type === 'sla_breach' && r.auto_bill);
      if (rule) {
        const penalty = await applyPenalty(supabase, rule, violation);
        appliedPenalties.push(penalty);
      }
    }

    // Check skill violations
    const skillViolations = await checkSkillViolations(supabase);
    for (const violation of skillViolations) {
      const rule = rules.find(r => r.violation_type === 'skill_violation' && r.auto_bill);
      if (rule) {
        const penalty = await applyPenalty(supabase, rule, violation);
        appliedPenalties.push(penalty);
      }
    }

    // Check capacity violations
    const capacityViolations = await checkCapacityViolations(supabase);
    for (const violation of capacityViolations) {
      const rule = rules.find(r => r.violation_type === 'capacity_exceeded' && r.auto_bill);
      if (rule) {
        const penalty = await applyPenalty(supabase, rule, violation);
        appliedPenalties.push(penalty);
      }
    }

    console.log(`[Penalty Application] Applied ${appliedPenalties.length} penalties`);

    return new Response(
      JSON.stringify({
        success: true,
        penalties_applied: appliedPenalties.length,
        details: appliedPenalties
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Penalty Application] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal processing error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkSLABreaches(supabase: any) {
  const { data: workOrders } = await supabase
    .from('work_orders')
    .select(`
      id,
      wo_number,
      created_at,
      completed_at,
      technician_id,
      tickets!inner(provisional_sla)
    `)
    .not('completed_at', 'is', null)
    .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const violations = [];
  for (const wo of workOrders || []) {
    if (!wo.tickets?.provisional_sla) continue;
    
    const created = new Date(wo.created_at).getTime();
    const completed = new Date(wo.completed_at).getTime();
    const slaMs = parseSLA(wo.tickets.provisional_sla);
    
    if (completed - created > slaMs) {
      violations.push({
        work_order_id: wo.id,
        wo_number: wo.wo_number,
        technician_id: wo.technician_id,
        violation_type: 'sla_breach',
        breach_duration_hours: Math.floor((completed - created - slaMs) / (1000 * 60 * 60))
      });
    }
  }
  
  return violations;
}

async function checkSkillViolations(supabase: any) {
  const { data: assignments } = await supabase
    .from('work_orders')
    .select(`
      id,
      wo_number,
      technician_id,
      tickets!inner(symptom)
    `)
    .not('technician_id', 'is', null)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const violations = [];
  
  for (const wo of assignments || []) {
    const { data: tech } = await supabase
      .from('technicians')
      .select('certifications, certification_level')
      .eq('id', wo.technician_id)
      .single();
      
    if (!tech || !tech.certifications || tech.certifications.length === 0) {
      violations.push({
        work_order_id: wo.id,
        wo_number: wo.wo_number,
        technician_id: wo.technician_id,
        violation_type: 'skill_violation',
        reason: 'uncertified_technician'
      });
    }
  }
  
  return violations;
}

async function checkCapacityViolations(supabase: any) {
  const { data: technicians } = await supabase
    .from('technicians')
    .select('id, employee_id');

  const violations = [];
  const maxConcurrent = 5;

  for (const tech of technicians || []) {
    const { count } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .eq('technician_id', tech.id)
      .in('status', ['assigned', 'in_progress']);
      
    if (count && count > maxConcurrent) {
      violations.push({
        technician_id: tech.id,
        employee_id: tech.employee_id,
        violation_type: 'capacity_exceeded',
        concurrent_orders: count,
        max_allowed: maxConcurrent
      });
    }
  }
  
  return violations;
}

async function applyPenalty(supabase: any, rule: any, violation: any) {
  // Calculate penalty amount
  let baseAmount = 0;
  
  if (rule.base_reference === 'work_order_value') {
    const { data: wo } = await supabase
      .from('work_orders')
      .select('cost_to_customer')
      .eq('id', violation.work_order_id)
      .single();
    baseAmount = wo?.cost_to_customer || 0;
  } else if (rule.base_reference === 'monthly_payout') {
    baseAmount = 10000; // Default monthly payout for calculation
  }

  const penaltyAmount = (baseAmount * rule.percentage_value) / 100;

  // Insert penalty record
  const { data: penalty, error } = await supabase
    .from('applied_penalties')
    .insert({
      penalty_code: rule.penalty_code,
      work_order_id: violation.work_order_id,
      technician_id: violation.technician_id,
      severity_level: rule.severity_level,
      violation_type: rule.violation_type,
      base_amount: baseAmount,
      penalty_percentage: rule.percentage_value,
      penalty_amount: penaltyAmount,
      auto_applied: true,
      dispute_allowed: rule.dispute_allowed,
      status: 'applied',
      metadata: violation
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to insert penalty:', error);
    return null;
  }

  // Create audit log
  await supabase
    .from('audit_logs')
    .insert({
      action: 'penalty_applied',
      resource_type: 'penalty',
      resource_id: penalty.id,
      changes: {
        rule_id: rule.id,
        violation,
        amount: penaltyAmount
      },
      reason: `Auto-applied penalty: ${rule.penalty_code}`
    });

  return penalty;
}

function parseSLA(slaInterval: string): number {
  // Parse PostgreSQL interval to milliseconds
  const match = slaInterval.match(/(\d+)\s*(hour|day|minute)/i);
  if (!match) return 24 * 60 * 60 * 1000; // Default 24 hours
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 'minute':
      return value * 60 * 1000;
    case 'hour':
      return value * 60 * 60 * 1000;
    case 'day':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}
