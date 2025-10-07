import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowNode {
  id: string;
  type: 'tool' | 'decision' | 'action';
  tool?: string;
  action?: string;
  conditions?: any;
}

interface WorkflowEdge {
  from: string;
  to: string;
  condition?: string;
}

interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
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

    const { workflow_id, input_data, agent_id, correlation_id } = await req.json();

    console.log('Workflow executor invoked:', { workflow_id, agent_id });

    // Fetch workflow definition
    const { data: workflow, error: wfError } = await supabase
      .from('workflow_definitions')
      .select('*')
      .eq('workflow_id', workflow_id)
      .eq('active', true)
      .single();

    if (wfError || !workflow) {
      return new Response(
        JSON.stringify({ error: 'Workflow not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create execution record
    const executionId = `exec_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
    const traceId = correlation_id || crypto.randomUUID();

    await supabase.from('workflow_runtime').insert({
      workflow_id: workflow_id,
      execution_id: executionId,
      agent_id: agent_id,
      status: 'running',
      input_data: input_data,
      correlation_id: traceId
    });

    // Execute workflow
    const result = await executeWorkflow(
      supabase,
      workflow.graph as WorkflowGraph,
      input_data,
      executionId,
      traceId,
      agent_id
    );

    // Update execution record
    await supabase.from('workflow_runtime')
      .update({
        status: result.success ? 'completed' : 'failed',
        output_data: result.output,
        error_message: result.error,
        completed_at: new Date().toISOString()
      })
      .eq('execution_id', executionId);

    return new Response(
      JSON.stringify({
        success: result.success,
        execution_id: executionId,
        output: result.output,
        trace_id: traceId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Workflow executor error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function executeWorkflow(
  supabase: any,
  graph: WorkflowGraph,
  inputData: any,
  executionId: string,
  traceId: string,
  agentId?: string
): Promise<{ success: boolean; output?: any; error?: string }> {
  const state: any = { ...inputData };
  const results: Record<string, any> = {};
  const startNode = graph.nodes[0];

  try {
    // Execute nodes in topological order (simplified BFS)
    const queue: string[] = ['start'];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);

      // Get outgoing edges
      const outgoingEdges = graph.edges.filter(e => e.from === currentNodeId);

      for (const edge of outgoingEdges) {
        const targetNode = graph.nodes.find(n => n.id === edge.to);
        if (!targetNode) continue;

        // Check edge condition if present
        if (edge.condition && !evaluateCondition(edge.condition, results, state)) {
          continue;
        }

        // Create trace span
        const spanId = crypto.randomUUID();
        const spanStart = Date.now();

        await supabase.from('observability_traces').insert({
          trace_id: traceId,
          span_id: spanId,
          operation_name: `workflow_node_${targetNode.id}`,
          agent_id: agentId,
          service_name: 'workflow-executor',
          start_time: new Date(spanStart).toISOString(),
          attributes: {
            node_id: targetNode.id,
            node_type: targetNode.type,
            execution_id: executionId
          }
        });

        // Execute node
        let nodeResult;
        if (targetNode.type === 'tool') {
          nodeResult = await executeTool(supabase, targetNode.tool!, state, traceId);
        } else if (targetNode.type === 'decision') {
          nodeResult = evaluateDecision(targetNode.conditions, results);
        } else if (targetNode.type === 'action') {
          nodeResult = await executeAction(supabase, targetNode.action!, state);
        }

        results[targetNode.id] = nodeResult;
        Object.assign(state, nodeResult || {});

        // Update trace span
        const spanEnd = Date.now();
        await supabase.from('observability_traces')
          .update({
            end_time: new Date(spanEnd).toISOString(),
            duration_ms: spanEnd - spanStart,
            status: 'ok',
            attributes: {
              node_id: targetNode.id,
              node_type: targetNode.type,
              execution_id: executionId,
              result: nodeResult
            }
          })
          .eq('span_id', spanId);

        // Add to queue
        queue.push(targetNode.id);
      }
    }

    return { success: true, output: state };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Workflow execution failed';
    console.error('Workflow execution error:', message);
    return { success: false, error: message };
  }
}

async function executeTool(
  supabase: any,
  toolName: string,
  state: any,
  traceId: string
): Promise<any> {
  // Map tool names to edge function endpoints
  const toolMap: Record<string, string> = {
    'validate-photos': '/functions/v1/validate-photos',
    'check-warranty': '/functions/v1/check-warranty',
    'check-inventory': '/functions/v1/check-inventory',
    'calculate-penalties': '/functions/v1/calculate-penalties',
    'fraud-pattern-analysis': '/functions/v1/fraud-detection',
    'anomaly-detection': '/functions/v1/anomaly-detection',
    'create-invoice': '/functions/v1/create-invoice',
  };

  const endpoint = toolMap[toolName];
  if (!endpoint) {
    console.log(`Tool ${toolName} not mapped, skipping`);
    return { status: 'skipped', tool: toolName };
  }

  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...state, trace_id: traceId })
    });

    if (!response.ok) {
      throw new Error(`Tool ${toolName} failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return { status: 'error', tool: toolName, error: String(error) };
  }
}

function evaluateDecision(conditions: any, results: Record<string, any>): any {
  // Simple decision evaluation
  if (conditions.all_passed) {
    const allPassed = Object.values(results).every(r => 
      r && (r.status === 'success' || r.status === 'passed')
    );
    return { decision: allPassed, reason: allPassed ? 'all_checks_passed' : 'some_checks_failed' };
  }
  return { decision: true };
}

async function executeAction(supabase: any, actionName: string, state: any): Promise<any> {
  // Execute specific actions
  if (actionName === 'create_fraud_alert') {
    await supabase.from('fraud_alerts').insert({
      resource_type: 'work_order',
      resource_id: state.work_order_id,
      anomaly_type: 'pattern_match',
      severity: 'high',
      description: 'Automated fraud detection triggered',
      confidence_score: state.confidence_score || 0.8
    });
    return { action: 'fraud_alert_created' };
  }
  return { action: actionName, status: 'completed' };
}

function evaluateCondition(condition: string, results: Record<string, any>, state: any): boolean {
  // Simple condition evaluation (e.g., "score > 0.7")
  try {
    const parts = condition.split(' ');
    if (parts.length === 3) {
      const [field, operator, value] = parts;
      const actualValue = state[field] || results[field];
      
      switch (operator) {
        case '>': return actualValue > parseFloat(value);
        case '<': return actualValue < parseFloat(value);
        case '>=': return actualValue >= parseFloat(value);
        case '<=': return actualValue <= parseFloat(value);
        case '==': return actualValue == value;
        case '!=': return actualValue != value;
      }
    }
  } catch (e) {
    console.error('Condition evaluation error:', e);
  }
  return true;
}
