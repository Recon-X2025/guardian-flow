import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, trigger_type, parameters } = await req.json();

    console.log('Agent orchestrator invoked:', { action, trigger_type });

    if (action === 'trigger_agents') {
      // Trigger all active agents based on event type
      return await triggerAgents(supabase, trigger_type, parameters);
    } else if (action === 'activate_agent') {
      return await activateAgent(supabase, parameters.agent_id);
    } else if (action === 'deactivate_agent') {
      return await deactivateAgent(supabase, parameters.agent_id);
    } else if (action === 'get_agent_status') {
      return await getAgentStatus(supabase, parameters.agent_id);
    } else {
      return new Response(
        JSON.stringify({ error: 'Unknown action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Agent orchestrator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function triggerAgents(
  supabase: any,
  triggerType: string,
  parameters: any
): Promise<Response> {
  // Determine which agents should be triggered based on the event type
  const agentMapping: Record<string, string[]> = {
    'work_order_created': ['ops_agent', 'fraud_agent'],
    'work_order_completed': ['finance_agent', 'fraud_agent', 'quality_agent'],
    'sla_violation': ['ops_agent', 'quality_agent'],
    'fraud_detected': ['fraud_agent'],
    'invoice_generated': ['finance_agent'],
    'technician_feedback': ['quality_agent', 'knowledge_agent']
  };

  const agentsToTrigger = agentMapping[triggerType] || [];
  const results = [];

  for (const agentId of agentsToTrigger) {
    try {
      // Check if agent is active
      const { data: agent } = await supabase
        .from('agent_registry')
        .select('status')
        .eq('agent_id', agentId)
        .single();

      if (agent?.status !== 'active') {
        console.log(`Agent ${agentId} is not active, skipping`);
        continue;
      }

      // Call agent runtime
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/agent-runtime`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
          action: triggerType,
          parameters: parameters
        })
      });

      if (response.ok) {
        const result = await response.json();
        results.push({
          agent_id: agentId,
          status: 'triggered',
          result: result
        });
      } else {
        results.push({
          agent_id: agentId,
          status: 'failed',
          error: await response.text()
        });
      }
    } catch (error: any) {
      console.error(`Error triggering agent ${agentId}:`, error);
      results.push({
        agent_id: agentId,
        status: 'error',
        error: error.message
      });
    }
  }

  return new Response(
    JSON.stringify({
      trigger_type: triggerType,
      agents_triggered: results
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function activateAgent(supabase: any, agentId: string): Promise<Response> {
  const { data, error } = await supabase
    .from('agent_registry')
    .update({ status: 'active' })
    .eq('agent_id', agentId)
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Log activation
  console.log(`Agent ${agentId} activated`);

  // Create initial goal if not exists
  const { data: existingGoal } = await supabase
    .from('agent_goals')
    .select('id')
    .eq('agent_id', agentId)
    .eq('status', 'active')
    .single();

  if (!existingGoal) {
    await supabase.from('agent_goals').insert({
      agent_id: agentId,
      goal_description: data.goal,
      priority: 5,
      status: 'active'
    });
  }

  return new Response(
    JSON.stringify({ success: true, agent: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deactivateAgent(supabase: any, agentId: string): Promise<Response> {
  const { data, error } = await supabase
    .from('agent_registry')
    .update({ status: 'inactive' })
    .eq('agent_id', agentId)
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Agent ${agentId} deactivated`);

  // Pause all active goals
  await supabase
    .from('agent_goals')
    .update({ status: 'paused' })
    .eq('agent_id', agentId)
    .eq('status', 'active');

  return new Response(
    JSON.stringify({ success: true, agent: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getAgentStatus(supabase: any, agentId: string): Promise<Response> {
  // Get agent info
  const { data: agent } = await supabase
    .from('agent_registry')
    .select('*')
    .eq('agent_id', agentId)
    .single();

  if (!agent) {
    return new Response(
      JSON.stringify({ error: 'Agent not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get recent actions (last 24 hours)
  const { data: recentActions } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('agent_id', agentId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  // Get metrics
  const { data: metrics } = await supabase
    .from('agent_metrics')
    .select('*')
    .eq('agent_id', agentId)
    .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('recorded_at', { ascending: false });

  // Get current goals
  const { data: goals } = await supabase
    .from('agent_goals')
    .select('*')
    .eq('agent_id', agentId)
    .eq('status', 'active');

  // Calculate success rate
  const totalActions = recentActions?.length || 0;
  const successfulActions = recentActions?.filter((a: any) => a.status === 'completed').length || 0;
  const successRate = totalActions > 0 ? (successfulActions / totalActions) * 100 : 0;

  return new Response(
    JSON.stringify({
      agent: agent,
      status: {
        is_active: agent.status === 'active',
        total_actions_24h: totalActions,
        successful_actions: successfulActions,
        failed_actions: recentActions?.filter((a: any) => a.status === 'failed').length || 0,
        pending_approval: recentActions?.filter((a: any) => a.requires_approval && !a.approved_by).length || 0,
        success_rate: successRate.toFixed(2),
        avg_execution_time_ms: calculateAvgExecutionTime(recentActions)
      },
      recent_actions: recentActions?.slice(0, 10),
      goals: goals,
      metrics: aggregateMetrics(metrics)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function calculateAvgExecutionTime(actions: any[]): number {
  if (!actions || actions.length === 0) return 0;
  
  const validActions = actions.filter(a => a.execution_time_ms != null);
  if (validActions.length === 0) return 0;
  
  const sum = validActions.reduce((acc, a) => acc + (a.execution_time_ms || 0), 0);
  return Math.round(sum / validActions.length);
}

function aggregateMetrics(metrics: any[]): any {
  if (!metrics || metrics.length === 0) return {};
  
  const aggregated: Record<string, any> = {};
  
  for (const metric of metrics) {
    if (!aggregated[metric.metric_type]) {
      aggregated[metric.metric_type] = {
        total: 0,
        count: 0,
        avg: 0,
        min: metric.metric_value,
        max: metric.metric_value
      };
    }
    
    const agg = aggregated[metric.metric_type];
    agg.total += metric.metric_value;
    agg.count += 1;
    agg.min = Math.min(agg.min, metric.metric_value);
    agg.max = Math.max(agg.max, metric.metric_value);
    agg.avg = agg.total / agg.count;
  }
  
  return aggregated;
}
