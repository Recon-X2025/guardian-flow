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
      case 'create_rule':
        result = await createQualityRule(supabase, user.id, payload);
        break;
      case 'get_rules':
        result = await getQualityRules(supabase, payload.workspaceId);
        break;
      case 'run_quality_check':
        result = await runQualityCheck(supabase, payload.ruleId);
        break;
      case 'get_quality_results':
        result = await getQualityResults(supabase, payload.workspaceId);
        break;
      case 'profile_data':
        result = await profileData(supabase, payload);
        break;
      case 'get_data_profiles':
        result = await getDataProfiles(supabase, payload.workspaceId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-data-quality:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createQualityRule(supabase: any, userId: string, payload: any) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  const { data: rule, error } = await supabase
    .from('analytics_data_quality_rules')
    .insert({
      workspace_id: payload.workspace_id,
      tenant_id: profile.tenant_id,
      name: payload.name,
      description: payload.description,
      rule_type: payload.rule_type,
      data_source_id: payload.data_source_id,
      table_name: payload.table_name,
      column_name: payload.column_name,
      rule_definition: payload.rule_definition,
      severity: payload.severity,
      threshold_value: payload.threshold_value,
      schedule_cron: payload.schedule_cron,
      created_by: userId
    })
    .select()
    .single();

  if (error) throw error;

  return { rule };
}

async function getQualityRules(supabase: any, workspaceId: string) {
  const { data: rules, error } = await supabase
    .from('analytics_data_quality_rules')
    .select(`
      *,
      data_source:analytics_data_sources(name, source_type),
      creator:profiles!analytics_data_quality_rules_created_by_fkey(full_name, email)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return { rules };
}

async function runQualityCheck(supabase: any, ruleId: string) {
  // Get rule details
  const { data: rule } = await supabase
    .from('analytics_data_quality_rules')
    .select('*')
    .eq('id', ruleId)
    .single();

  // Simulate quality check (in production, this would execute actual validation)
  const recordsTested = Math.floor(Math.random() * 10000) + 1000;
  const recordsFailed = Math.floor(recordsTested * (Math.random() * 0.1));
  const score = ((recordsTested - recordsFailed) / recordsTested) * 100;
  const passed = score >= (rule.threshold_value || 95);

  const { data: result, error } = await supabase
    .from('analytics_data_quality_results')
    .insert({
      rule_id: ruleId,
      workspace_id: rule.workspace_id,
      passed,
      score,
      records_tested: recordsTested,
      records_failed: recordsFailed,
      details: {
        rule_type: rule.rule_type,
        threshold: rule.threshold_value
      },
      error_samples: recordsFailed > 0 ? [
        { row_id: 'sample_1', issue: 'Missing required field' },
        { row_id: 'sample_2', issue: 'Invalid format' }
      ] : [],
      remediation_suggestions: passed ? null : 'Review data source validation rules'
    })
    .select()
    .single();

  if (error) throw error;

  // Update rule last run
  await supabase
    .from('analytics_data_quality_rules')
    .update({ last_run_at: new Date().toISOString() })
    .eq('id', ruleId);

  return { result };
}

async function getQualityResults(supabase: any, workspaceId: string) {
  const { data: results, error } = await supabase
    .from('analytics_data_quality_results')
    .select(`
      *,
      rule:analytics_data_quality_rules(name, rule_type, severity)
    `)
    .eq('workspace_id', workspaceId)
    .order('execution_time', { ascending: false })
    .limit(100);

  if (error) throw error;

  return { results };
}

async function profileData(supabase: any, payload: any) {
  const { workspaceId, dataSourceId, tableName, columnName } = payload;

  // Simulate data profiling (in production, this would analyze actual data)
  const rowCount = Math.floor(Math.random() * 1000000) + 10000;
  const nullCount = Math.floor(rowCount * Math.random() * 0.05);
  const distinctCount = Math.floor(rowCount * (0.3 + Math.random() * 0.6));

  const { data: profile, error } = await supabase
    .from('analytics_data_profiles')
    .insert({
      workspace_id: workspaceId,
      data_source_id: dataSourceId,
      table_name: tableName,
      column_name: columnName,
      data_type: 'VARCHAR',
      row_count: rowCount,
      null_count: nullCount,
      null_percentage: (nullCount / rowCount) * 100,
      distinct_count: distinctCount,
      distinct_percentage: (distinctCount / rowCount) * 100,
      value_distribution: {
        top_values: [
          { value: 'A', count: 1500 },
          { value: 'B', count: 1200 },
          { value: 'C', count: 900 }
        ]
      },
      pattern_analysis: {
        common_patterns: ['[A-Z]{3}-[0-9]{4}', '[0-9]{10}']
      }
    })
    .select()
    .single();

  if (error) throw error;

  return { profile };
}

async function getDataProfiles(supabase: any, workspaceId: string) {
  const { data: profiles, error } = await supabase
    .from('analytics_data_profiles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('profiled_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return { profiles };
}
