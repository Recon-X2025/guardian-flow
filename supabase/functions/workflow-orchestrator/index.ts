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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, workOrderId, templateId, stepData } = await req.json();

    console.log('[Workflow Orchestrator] Action:', action, 'Work Order:', workOrderId);

    switch (action) {
      case 'start_workflow':
        return await startWorkflow(supabase, workOrderId, templateId);
      
      case 'execute_step':
        return await executeStep(supabase, workOrderId, stepData);
      
      case 'get_status':
        return await getWorkflowStatus(supabase, workOrderId);
      
      case 'validate_compliance':
        return await validateCompliance(supabase, workOrderId);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[Workflow Orchestrator] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function startWorkflow(supabase: any, workOrderId: string, templateId: string) {
  // Fetch workflow template
  const { data: template, error: templateError } = await supabase
    .from('workflow_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError) throw templateError;

  // Create workflow execution
  const { data: execution, error: executionError } = await supabase
    .from('workflow_executions')
    .insert({
      work_order_id: workOrderId,
      template_id: templateId,
      current_step: 0,
      status: 'in_progress',
      step_history: []
    })
    .select()
    .single();

  if (executionError) throw executionError;

  // Update work order with workflow config
  const { error: woError } = await supabase
    .from('work_orders')
    .update({
      workflow_config: {
        template_id: templateId,
        execution_id: execution.id,
        started_at: new Date().toISOString()
      }
    })
    .eq('id', workOrderId);

  if (woError) throw woError;

  console.log('[Workflow] Started execution:', execution.id);

  return new Response(JSON.stringify({
    success: true,
    execution_id: execution.id,
    template: template.name,
    total_steps: template.steps.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function executeStep(supabase: any, workOrderId: string, stepData: any) {
  // Fetch current execution
  const { data: execution, error: execError } = await supabase
    .from('workflow_executions')
    .select('*, template:workflow_templates(*)')
    .eq('work_order_id', workOrderId)
    .eq('status', 'in_progress')
    .single();

  if (execError) throw execError;

  const currentStep = execution.current_step;
  const steps = execution.template.steps;

  if (currentStep >= steps.length) {
    throw new Error('All workflow steps completed');
  }

  const step = steps[currentStep];

  // Validate step execution
  const validationResult = await validateStep(step, stepData);
  
  if (!validationResult.valid) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Step validation failed',
      details: validationResult.errors
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update step history
  const stepHistory = execution.step_history || [];
  stepHistory.push({
    step_number: currentStep,
    step_name: step.name,
    completed_at: new Date().toISOString(),
    data: stepData
  });

  // Move to next step or complete
  const nextStep = currentStep + 1;
  const isComplete = nextStep >= steps.length;

  const { error: updateError } = await supabase
    .from('workflow_executions')
    .update({
      current_step: nextStep,
      step_history: stepHistory,
      status: isComplete ? 'completed' : 'in_progress',
      completed_at: isComplete ? new Date().toISOString() : null
    })
    .eq('id', execution.id);

  if (updateError) throw updateError;

  console.log('[Workflow] Step executed:', currentStep, 'Next:', nextStep);

  return new Response(JSON.stringify({
    success: true,
    current_step: nextStep,
    completed: isComplete,
    next_step: isComplete ? null : steps[nextStep]
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getWorkflowStatus(supabase: any, workOrderId: string) {
  const { data: execution, error } = await supabase
    .from('workflow_executions')
    .select('*, template:workflow_templates(*)')
    .eq('work_order_id', workOrderId)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return new Response(JSON.stringify({
      success: true,
      has_workflow: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const totalSteps = execution.template.steps.length;
  const progress = (execution.current_step / totalSteps) * 100;

  return new Response(JSON.stringify({
    success: true,
    has_workflow: true,
    execution_id: execution.id,
    status: execution.status,
    current_step: execution.current_step,
    total_steps: totalSteps,
    progress: Math.round(progress),
    step_history: execution.step_history
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function validateCompliance(supabase: any, workOrderId: string) {
  // Fetch work order with compliance data
  const { data: wo, error: woError } = await supabase
    .from('work_orders')
    .select('*, workflow_config, compliance_data, industry_type')
    .eq('id', workOrderId)
    .single();

  if (woError) throw woError;

  // Fetch compliance requirements for industry
  const { data: template } = await supabase
    .from('workflow_templates')
    .select('compliance_requirements')
    .eq('industry_type', wo.industry_type)
    .single();

  if (!template || !template.compliance_requirements) {
    return new Response(JSON.stringify({
      compliant: true,
      message: 'No compliance requirements for this industry'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const requirements = template.compliance_requirements;
  const complianceData = wo.compliance_data || {};
  const violations = [];

  // Check required fields
  if (requirements.required_fields) {
    for (const field of requirements.required_fields) {
      if (!complianceData[field]) {
        violations.push({
          type: 'missing_field',
          field: field,
          message: `Required field '${field}' is missing`
        });
      }
    }
  }

  // Check data validation rules
  if (requirements.validation_rules) {
    for (const [field, rule] of Object.entries(requirements.validation_rules)) {
      const value = complianceData[field];
      if (value && !validateRule(value, rule as any)) {
        violations.push({
          type: 'validation_error',
          field: field,
          message: `Field '${field}' does not meet validation requirements`
        });
      }
    }
  }

  return new Response(JSON.stringify({
    compliant: violations.length === 0,
    violations: violations,
    checked_at: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function validateStep(step: any, data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (step.required_fields) {
    for (const field of step.required_fields) {
      if (!data[field]) {
        errors.push(`Required field missing: ${field}`);
      }
    }
  }

  if (step.validation) {
    for (const [field, rule] of Object.entries(step.validation)) {
      if (data[field] && !validateRule(data[field], rule)) {
        errors.push(`Validation failed for field: ${field}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateRule(value: any, rule: any): boolean {
  if (rule.type === 'string' && typeof value !== 'string') return false;
  if (rule.type === 'number' && typeof value !== 'number') return false;
  if (rule.type === 'boolean' && typeof value !== 'boolean') return false;
  if (rule.min && value < rule.min) return false;
  if (rule.max && value > rule.max) return false;
  if (rule.pattern && !new RegExp(rule.pattern).test(value)) return false;
  
  return true;
}
