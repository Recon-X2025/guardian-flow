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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...params } = await req.json();

    console.log('[Compliance Enforcer] Action:', action);

    switch (action) {
      case 'validate': {
        const { entity_type, entity_id, entity_data, tenant_id } = params;

        // Fetch active policies
        const { data: policies, error: policiesError } = await supabase
          .from('compliance_policies')
          .select('*')
          .eq('active', true);

        if (policiesError) throw policiesError;

        const violations = [];
        const warnings = [];

        for (const policy of policies) {
          const result = evaluatePolicy(policy, entity_data);
          
          if (!result.passed) {
            const auditEntry = {
              policy_id: policy.id,
              tenant_id,
              entity_type,
              entity_id,
              action: 'validation',
              user_id: entity_data.user_id,
              result: result.severity === 'critical' ? 'fail' : 'warning',
              violation_details: result.details,
              remediation_actions: result.remediation
            };

            // Log to audit trail
            await supabase
              .from('compliance_audit_trails')
              .insert(auditEntry);

            if (policy.enforcement_level === 'block') {
              violations.push({
                policy: policy.name,
                details: result.details,
                remediation: result.remediation
              });
            } else {
              warnings.push({
                policy: policy.name,
                details: result.details
              });
            }
          }
        }

        const shouldBlock = violations.length > 0;

        console.log('[Compliance Enforcer] Validation complete:', {
          violations: violations.length,
          warnings: warnings.length,
          blocked: shouldBlock
        });

        return new Response(JSON.stringify({
          success: !shouldBlock,
          blocked: shouldBlock,
          violations,
          warnings
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'check_policy': {
        const { policy_id, entity_data } = params;

        const { data: policy, error } = await supabase
          .from('compliance_policies')
          .select('*')
          .eq('id', policy_id)
          .single();

        if (error) throw error;

        const result = evaluatePolicy(policy, entity_data);

        return new Response(JSON.stringify({
          success: true,
          policy: policy.name,
          passed: result.passed,
          details: result.details
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_audit_trail': {
        const { tenant_id, entity_type, start_date, end_date } = params;

        let query = supabase
          .from('compliance_audit_trails')
          .select('*, policy:compliance_policies(name, policy_type)')
          .eq('tenant_id', tenant_id);

        if (entity_type) query = query.eq('entity_type', entity_type);
        if (start_date) query = query.gte('created_at', start_date);
        if (end_date) query = query.lte('created_at', end_date);

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, audit_trail: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_policy': {
        const { name, description, policy_type, industry_standard, rules, severity, enforcement_level } = params;

        const { data, error } = await supabase
          .from('compliance_policies')
          .insert({
            name,
            description,
            policy_type,
            industry_standard,
            rules,
            severity,
            enforcement_level,
            active: true
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[Compliance Enforcer] Policy created:', data.id);
        return new Response(JSON.stringify({ success: true, policy: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[Compliance Enforcer] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function evaluatePolicy(policy: any, entityData: any) {
  const rules = policy.rules;
  const violations = [];

  for (const rule of (rules.checks || [])) {
    const value = getNestedValue(entityData, rule.field);
    
    if (rule.required && (value === null || value === undefined)) {
      violations.push(`Missing required field: ${rule.field}`);
    }

    if (rule.type === 'regex' && value && !new RegExp(rule.pattern).test(value)) {
      violations.push(`Field ${rule.field} doesn't match required pattern`);
    }

    if (rule.type === 'range' && value) {
      if (rule.min !== undefined && value < rule.min) {
        violations.push(`Field ${rule.field} below minimum: ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        violations.push(`Field ${rule.field} exceeds maximum: ${rule.max}`);
      }
    }

    if (rule.type === 'enum' && value && !rule.allowed_values.includes(value)) {
      violations.push(`Field ${rule.field} has invalid value. Allowed: ${rule.allowed_values.join(', ')}`);
    }
  }

  return {
    passed: violations.length === 0,
    severity: policy.severity,
    details: violations,
    remediation: violations.map(v => `Fix: ${v}`)
  };
}

function getNestedValue(obj: any, path: string) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
