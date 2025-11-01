import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, ...payload } = await req.json();

    let result;
    switch (action) {
      case 'create_alert_rule':
        result = await createAlertRule(supabase, user.id, payload);
        break;
      case 'get_alert_rules':
        result = await getAlertRules(supabase, payload.workspaceId);
        break;
      case 'get_alert_instances':
        result = await getAlertInstances(supabase, payload.workspaceId);
        break;
      case 'acknowledge_alert':
        result = await acknowledgeAlert(supabase, user.id, payload.alertId);
        break;
      case 'resolve_alert':
        result = await resolveAlert(supabase, user.id, payload.alertId, payload.notes);
        break;
      case 'check_alerts':
        result = await checkAlerts(supabase, payload.workspaceId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-alert-manager:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createAlertRule(supabase: any, userId: string, payload: any) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  const { data: rule, error } = await supabase
    .from('analytics_alert_rules')
    .insert({
      workspace_id: payload.workspace_id,
      tenant_id: profile.tenant_id,
      name: payload.name,
      description: payload.description,
      alert_type: payload.alert_type,
      condition_config: payload.condition_config,
      severity: payload.severity,
      notification_channels: payload.notification_channels || ['email'],
      cooldown_minutes: payload.cooldown_minutes || 60,
      created_by: userId
    })
    .select()
    .single();

  if (error) throw error;

  return { rule };
}

async function getAlertRules(supabase: any, workspaceId: string) {
  const { data: rules, error } = await supabase
    .from('analytics_alert_rules')
    .select(`
      *,
      creator:profiles!analytics_alert_rules_created_by_fkey(full_name, email)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return { rules };
}

async function getAlertInstances(supabase: any, workspaceId: string) {
  const { data: instances, error } = await supabase
    .from('analytics_alert_instances')
    .select(`
      *,
      rule:analytics_alert_rules(name, severity, alert_type),
      acknowledged_by_profile:profiles!analytics_alert_instances_acknowledged_by_fkey(full_name, email)
    `)
    .in('rule_id', 
      supabase
        .from('analytics_alert_rules')
        .select('id')
        .eq('workspace_id', workspaceId)
    )
    .order('triggered_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return { instances };
}

async function acknowledgeAlert(supabase: any, userId: string, alertId: string) {
  const { data: alert, error } = await supabase
    .from('analytics_alert_instances')
    .update({
      status: 'acknowledged',
      acknowledged_by: userId
    })
    .eq('id', alertId)
    .select()
    .single();

  if (error) throw error;

  return { alert };
}

async function resolveAlert(supabase: any, userId: string, alertId: string, notes: string) {
  const { data: alert, error } = await supabase
    .from('analytics_alert_instances')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolution_notes: notes
    })
    .eq('id', alertId)
    .select()
    .single();

  if (error) throw error;

  return { alert };
}

async function checkAlerts(supabase: any, workspaceId: string) {
  // Get active alert rules
  const { data: rules } = await supabase
    .from('analytics_alert_rules')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true);

  const triggeredAlerts = [];

  // Simulate alert checking (in production, this would evaluate actual conditions)
  for (const rule of rules || []) {
    // Random chance of triggering
    if (Math.random() > 0.8) {
      const { data: alert } = await supabase
        .from('analytics_alert_instances')
        .insert({
          rule_id: rule.id,
          trigger_value: {
            threshold: 100,
            actual: 150,
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      triggeredAlerts.push(alert);
    }
  }

  return { triggered_count: triggeredAlerts.length, alerts: triggeredAlerts };
}
