import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentConfig {
  agent_id: string;
  goal: string;
  capabilities: string[];
  config: any;
  tools: string[];
}

interface AgentContext {
  agent_id: string;
  goal: string;
  tools: any[];
  memory: any[];
  current_state: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { agent_id, action, parameters } = await req.json();

    console.log('Agent runtime invoked:', { agent_id, action });

    // Fetch agent configuration
    const { data: agent, error: agentError } = await supabase
      .from('agent_registry')
      .select('*, agent_tool_assignments!inner(tool_name, agent_tools(*))')
      .eq('agent_id', agent_id)
      .eq('status', 'active')
      .single();

    if (agentError || !agent) {
      console.error('Agent not found or inactive:', agentError);
      return new Response(
        JSON.stringify({ error: 'Agent not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch recent memory
    const { data: memory } = await supabase
      .from('agent_memory')
      .select('*')
      .eq('agent_id', agent_id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build agent context
    const context: AgentContext = {
      agent_id: agent.agent_id,
      goal: agent.goal,
      tools: agent.agent_tool_assignments.map((a: any) => a.agent_tools),
      memory: memory || [],
      current_state: parameters
    };

    // Execute agent cognitive loop
    const result = await executeCognitiveLoop(supabase, context, action);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Agent runtime error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function executeCognitiveLoop(
  supabase: any,
  context: AgentContext,
  action: string
): Promise<any> {
  const correlationId = crypto.randomUUID();
  const startTime = Date.now();

  console.log('Starting cognitive loop:', { agent_id: context.agent_id, action, correlationId });

  try {
    // Step 1: Observe - Gather current system state
    const observations = await observe(supabase, context);
    console.log('Observations:', observations);

    // Step 2: Plan - Use AI to determine actions
    const actionPlan = await planActions(supabase, context, observations, action);
    console.log('Plan:', actionPlan);

    // Step 3: Execute - Run planned actions
    const results = await execute(supabase, context, actionPlan, correlationId);
    console.log('Execution results:', results);

    // Step 4: Reflect - Update memory with learnings
    await reflect(supabase, context, observations, actionPlan, results);

    const executionTime = Date.now() - startTime;

    // Log agent action
    await supabase.from('agent_actions').insert({
      agent_id: context.agent_id,
      action_type: action,
      input_data: { observations, action },
      output_data: results,
      status: 'completed',
      reasoning: actionPlan.reasoning,
      execution_time_ms: executionTime,
      correlation_id: correlationId
    });

    return {
      success: true,
      plan: actionPlan,
      results: results,
      execution_time_ms: executionTime,
      correlation_id: correlationId
    };
  } catch (error: any) {
    console.error('Cognitive loop error:', error);
    
    // Log failed action
    await supabase.from('agent_actions').insert({
      agent_id: context.agent_id,
      action_type: action,
      input_data: context.current_state,
      status: 'failed',
      error_message: error.message,
      correlation_id: correlationId,
      execution_time_ms: Date.now() - startTime
    });

    throw error;
  }
}

async function observe(supabase: any, context: AgentContext): Promise<any> {
  // Gather relevant data based on agent type
  const observations: any = {};

  if (context.agent_id === 'ops_agent') {
    // Get unassigned work orders
    const { data: unassigned } = await supabase
      .from('work_orders')
      .select('id, wo_number, status, created_at')
      .is('technician_id', null)
      .eq('status', 'ready_to_release')
      .limit(50);

    // Get SLA violations
    const { data: violations } = await supabase
      .from('work_orders')
      .select('id, wo_number, status, created_at, released_at')
      .eq('status', 'in_progress')
      .limit(50);

    observations.unassigned_work_orders = unassigned || [];
    observations.sla_risks = violations || [];
  } else if (context.agent_id === 'fraud_agent') {
    // Get recent completed work orders for fraud analysis
    const { data: recent } = await supabase
      .from('work_orders')
      .select('id, wo_number, cost_to_customer, completed_at, technician_id')
      .eq('status', 'completed')
      .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(100);

    observations.recent_completions = recent || [];
  } else if (context.agent_id === 'finance_agent') {
    // Get work orders needing invoicing
    const { data: toInvoice } = await supabase
      .from('work_orders')
      .select('id, wo_number, status, cost_to_customer, completed_at')
      .eq('status', 'completed')
      .limit(50);

    observations.pending_invoices = toInvoice || [];
  }

  return observations;
}

async function planActions(
  supabase: any,
  context: AgentContext,
  observations: any,
  action: string
): Promise<any> {
  // Use AI model to create action plan
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return {
      actions: [],
      reasoning: 'AI planning unavailable - API key not configured'
    };
  }

  const prompt = buildPlanningPrompt(context, observations, action);

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: getSystemPrompt(context) },
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_action_plan',
              description: 'Create a structured action plan for the agent',
              parameters: {
                type: 'object',
                properties: {
                  actions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        tool_name: { type: 'string' },
                        parameters: { type: 'object' },
                        priority: { type: 'number' }
                      }
                    }
                  },
                  reasoning: { type: 'string' }
                },
                required: ['actions', 'reasoning']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_action_plan' } }
      })
    });

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall) {
      const plan = JSON.parse(toolCall.function.arguments);
      console.log('AI generated plan:', plan);
      return plan;
    }

    return {
      actions: [],
      reasoning: 'No actions needed at this time'
    };
  } catch (error: any) {
    console.error('Planning error:', error);
    return {
      actions: [],
      reasoning: `Planning failed: ${error.message}`
    };
  }
}

function getSystemPrompt(context: AgentContext): string {
  const basePrompt = `You are ${context.agent_id}, an autonomous AI agent in the ReconX Guardian Flow system.

Your goal: ${context.goal}

Available tools: ${context.tools.map(t => t.tool_name).join(', ')}

You must:
1. Analyze the current observations
2. Determine the best actions to achieve your goal
3. Consider RBAC permissions and safety policies
4. Prioritize actions by impact
5. Provide clear reasoning for your decisions

Always act within your role scope and follow governance policies.`;

  return basePrompt;
}

function buildPlanningPrompt(context: AgentContext, observations: any, action: string): string {
  return `Current Action Request: ${action}

Observations:
${JSON.stringify(observations, null, 2)}

Recent Memory:
${context.memory.slice(0, 3).map(m => JSON.stringify(m.content)).join('\n')}

Based on these observations and your goal, what actions should you take?
Consider:
- Priority and urgency
- Resource availability
- Safety constraints
- Expected outcomes

Create a structured action plan using the create_action_plan tool.`;
}

async function execute(
  supabase: any,
  context: AgentContext,
  plan: any,
  correlationId: string
): Promise<any> {
  const results = [];

  for (const action of plan.actions || []) {
    console.log('Executing action:', action);

    try {
      // Find the tool
      const tool = context.tools.find(t => t.tool_name === action.tool_name);
      if (!tool) {
        console.error('Tool not found:', action.tool_name);
        results.push({
          action: action.tool_name,
          status: 'failed',
          error: 'Tool not found'
        });
        continue;
      }

      // Check if tool requires approval
      if (tool.requires_mfa) {
        results.push({
          action: action.tool_name,
          status: 'pending_approval',
          parameters: action.parameters
        });
        continue;
      }

      // Execute based on tool type
      if (tool.tool_type === 'edge_function') {
        const result = await executeEdgeFunction(tool.endpoint, action.parameters);
        results.push({
          action: action.tool_name,
          status: 'completed',
          result: result
        });
      } else if (tool.tool_type === 'database_query') {
        // For database queries, we'd need to implement safe execution
        results.push({
          action: action.tool_name,
          status: 'not_implemented',
          note: 'Database query execution requires additional safety measures'
        });
      }

      // Update tool usage count
      await supabase
        .from('agent_tool_assignments')
        .update({
          usage_count: supabase.raw('usage_count + 1'),
          last_used_at: new Date().toISOString()
        })
        .eq('agent_id', context.agent_id)
        .eq('tool_name', action.tool_name);

    } catch (error: any) {
      console.error('Action execution error:', error);
      results.push({
        action: action.tool_name,
        status: 'failed',
        error: error.message
      });
    }
  }

  return results;
}

async function executeEdgeFunction(endpoint: string, parameters: any): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  const url = `${supabaseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(parameters)
  });

  if (!response.ok) {
    throw new Error(`Edge function failed: ${response.statusText}`);
  }

  return await response.json();
}

async function reflect(
  supabase: any,
  context: AgentContext,
  observations: any,
  plan: any,
  results: any
): Promise<void> {
  // Store episodic memory of this interaction
  await supabase.from('agent_memory').insert({
    agent_id: context.agent_id,
    memory_type: 'episodic',
    content: {
      observations: observations,
      plan: plan,
      results: results,
      timestamp: new Date().toISOString()
    },
    context_data: {
      success_rate: results.filter((r: any) => r.status === 'completed').length / results.length
    },
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  });

  // Extract learnings for semantic memory
  if (results.length > 0) {
    const successful = results.filter((r: any) => r.status === 'completed');
    if (successful.length > 0) {
      await supabase.from('agent_memory').insert({
        agent_id: context.agent_id,
        memory_type: 'semantic',
        content: {
          pattern: 'successful_actions',
          actions: successful.map((r: any) => r.action),
          context: observations
        },
        relevance_score: successful.length / results.length
      });
    }
  }

  // Record metrics
  await supabase.from('agent_metrics').insert([
    {
      agent_id: context.agent_id,
      metric_type: 'actions_executed',
      metric_value: results.length
    },
    {
      agent_id: context.agent_id,
      metric_type: 'success_rate',
      metric_value: results.filter((r: any) => r.status === 'completed').length / results.length
    }
  ]);
}
