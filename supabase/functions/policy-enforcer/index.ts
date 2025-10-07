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

    const { agent_id, action_type, context } = await req.json();

    console.log('Policy enforcer invoked:', { agent_id, action_type });

    // Fetch policies bound to this agent
    const { data: bindings } = await supabase
      .from('agent_policy_bindings')
      .select('policy_id, policy_registry(*)')
      .eq('agent_id', agent_id)
      .eq('active', true)
      .order('priority', { ascending: true });

    if (!bindings || bindings.length === 0) {
      return new Response(
        JSON.stringify({ 
          allowed: true, 
          reason: 'No policies bound to agent' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Evaluate policies in priority order
    for (const binding of bindings) {
      const policy = (binding as any).policy_registry;
      if (!policy || !policy.active) continue;

      const evaluation = evaluatePolicy(policy, context);
      
      if (!evaluation.matches) continue;

      // Policy matches, check actions
      const actions = policy.actions as any;
      
      if (!actions.allow) {
        // Policy denies action
        if (actions.suspend_agent) {
          await supabase
            .from('agent_registry')
            .update({ status: 'suspended' })
            .eq('agent_id', agent_id);
        }

        if (actions.notify && Array.isArray(actions.notify)) {
          await notifyRoles(supabase, actions.notify, {
            agent_id,
            action_type,
            policy_id: policy.policy_id,
            reason: evaluation.reason
          });
        }

        return new Response(
          JSON.stringify({
            allowed: false,
            reason: `Policy ${policy.name} denies action`,
            policy_id: policy.policy_id,
            require_mfa: false
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Policy allows but may require MFA
      if (actions.require_mfa) {
        return new Response(
          JSON.stringify({
            allowed: true,
            require_mfa: true,
            policy_id: policy.policy_id,
            reason: `Policy ${policy.name} requires MFA approval`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Policy allows without conditions
      return new Response(
        JSON.stringify({
          allowed: true,
          require_mfa: false,
          policy_id: policy.policy_id,
          reason: `Policy ${policy.name} allows action`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No matching policies, default allow
    return new Response(
      JSON.stringify({
        allowed: true,
        require_mfa: false,
        reason: 'No matching policies, default allow'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Policy enforcer error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function evaluatePolicy(policy: any, context: any, depth = 0): { matches: boolean; reason?: string } {
  // Prevent infinite recursion
  const MAX_RECURSION_DEPTH = 5;
  if (depth > MAX_RECURSION_DEPTH) {
    throw new Error(`Policy recursion limit exceeded (max ${MAX_RECURSION_DEPTH})`);
  }
  const conditions = policy.conditions as any;
  
  if (!conditions || !conditions.rules) {
    return { matches: true };
  }

  const operator = conditions.operator || 'AND';
  const rules = conditions.rules as any[];

  const results = rules.map(rule => evaluateRule(rule, context));

  if (operator === 'AND') {
    const matches = results.every(r => r);
    return { 
      matches, 
      reason: matches ? 'All conditions met' : 'Some conditions not met' 
    };
  } else if (operator === 'OR') {
    const matches = results.some(r => r);
    return { 
      matches, 
      reason: matches ? 'At least one condition met' : 'No conditions met' 
    };
  }

  return { matches: false, reason: 'Unknown operator' };
}

function evaluateRule(rule: any, context: any): boolean {
  const { field, operator, value } = rule;
  const actualValue = context[field];

  if (actualValue === undefined) return false;

  switch (operator) {
    case '>': return actualValue > value;
    case '<': return actualValue < value;
    case '>=': return actualValue >= value;
    case '<=': return actualValue <= value;
    case '=':
    case '==': return actualValue === value;
    case '!=': return actualValue !== value;
    case 'in': return Array.isArray(value) && value.includes(actualValue);
    case 'contains': return String(actualValue).includes(String(value));
    default: return false;
  }
}

async function notifyRoles(
  supabase: any,
  roles: string[],
  notification: any
): Promise<void> {
  // Log notification to events
  await supabase.from('events_log').insert({
    event_id: `notify_${Date.now()}`,
    event_type: 'policy_violation',
    entity_type: 'agent',
    entity_id: notification.agent_id,
    agent_id: notification.agent_id,
    payload: {
      notification_type: 'policy_violation',
      roles: roles,
      ...notification
    }
  });

  console.log('Notification sent to roles:', roles, notification);
}
