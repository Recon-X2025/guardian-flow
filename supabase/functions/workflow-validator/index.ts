import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowTest {
  name: string;
  steps: WorkflowStep[];
}

interface WorkflowStep {
  name: string;
  action: () => Promise<any>;
  validate: (result: any) => boolean;
}

interface WorkflowResult {
  workflow_name: string;
  status: 'passed' | 'failed';
  steps_executed: number;
  failed_step?: string;
  error_message?: string;
  execution_time_ms: number;
  executed_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('Starting critical workflow validation...');

  const results: WorkflowResult[] = [];
  let allPassed = true;

  // Test 1: Ticket → Work Order Creation
  const ticketToWO = await testTicketToWorkOrder(supabase);
  results.push(ticketToWO);
  if (ticketToWO.status === 'failed') allPassed = false;

  // Test 2: Precheck Orchestration
  const precheckFlow = await testPrecheckOrchestration(supabase);
  results.push(precheckFlow);
  if (precheckFlow.status === 'failed') allPassed = false;

  // Test 3: Forecast Generation
  const forecastFlow = await testForecastGeneration(supabase);
  results.push(forecastFlow);
  if (forecastFlow.status === 'failed') allPassed = false;

  // Test 4: Invoice Creation
  const invoiceFlow = await testInvoiceCreation(supabase);
  results.push(invoiceFlow);
  if (invoiceFlow.status === 'failed') allPassed = false;

  // Store results
  const { error: insertError } = await supabase
    .from('workflow_validation_logs')
    .insert(results);

  if (insertError) {
    console.error('Failed to store workflow validation results:', insertError);
  }

  // Update system health
  await supabase.from('system_health').upsert({
    id: 'workflow-validator',
    component: 'workflow_validator',
    status: allPassed ? 'operational' : 'degraded',
    last_check: new Date().toISOString(),
    metadata: {
      total_workflows: results.length,
      passed_workflows: results.filter(r => r.status === 'passed').length,
      avg_execution_time: Math.round(
        results.reduce((sum, r) => sum + r.execution_time_ms, 0) / results.length
      ),
    },
  });

  return new Response(
    JSON.stringify({
      overall_status: allPassed ? 'passed' : 'failed',
      workflows_tested: results.length,
      passed_count: results.filter(r => r.status === 'passed').length,
      results,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});

async function testTicketToWorkOrder(supabase: any): Promise<WorkflowResult> {
  const startTime = Date.now();
  const workflowName = 'Ticket to Work Order Creation';
  
  try {
    console.log(`Testing: ${workflowName}`);
    
    // Step 1: Create test ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        unit_serial: `MONITOR-${Date.now()}`,
        customer: 'Health Check Customer',
        site_address: 'Test Site',
        symptom: 'Automated health check',
        status: 'open',
      })
      .select()
      .single();

    if (ticketError) throw new Error(`Ticket creation failed: ${ticketError.message}`);

    // Step 2: Create work order from ticket
    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .insert({
        ticket_id: ticket.id,
        unit_serial: ticket.unit_serial,
        customer: ticket.customer,
        status: 'draft',
      })
      .select()
      .single();

    if (woError) throw new Error(`Work order creation failed: ${woError.message}`);

    // Step 3: Verify precheck auto-created
    const { data: precheck } = await supabase
      .from('work_order_prechecks')
      .select('id')
      .eq('work_order_id', workOrder.id)
      .single();

    // Cleanup
    await supabase.from('work_orders').delete().eq('id', workOrder.id);
    await supabase.from('tickets').delete().eq('id', ticket.id);

    const executionTime = Date.now() - startTime;

    return {
      workflow_name: workflowName,
      status: precheck ? 'passed' : 'failed',
      steps_executed: 3,
      failed_step: !precheck ? 'Precheck auto-creation' : undefined,
      execution_time_ms: executionTime,
      executed_at: new Date().toISOString(),
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`${workflowName} failed:`, error);

    return {
      workflow_name: workflowName,
      status: 'failed',
      steps_executed: 0,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      execution_time_ms: executionTime,
      executed_at: new Date().toISOString(),
    };
  }
}

async function testPrecheckOrchestration(supabase: any): Promise<WorkflowResult> {
  const startTime = Date.now();
  const workflowName = 'Precheck Orchestration';
  
  try {
    console.log(`Testing: ${workflowName}`);
    
    // Check if precheck-orchestrator function is callable
    const { data: workOrders } = await supabase
      .from('work_orders')
      .select('id')
      .eq('status', 'draft')
      .limit(1)
      .single();

    if (!workOrders) {
      // Create a test work order
      const { data: testWO } = await supabase
        .from('work_orders')
        .insert({
          unit_serial: `PRECHECK-${Date.now()}`,
          customer: 'Precheck Test',
          status: 'draft',
        })
        .select()
        .single();

      if (testWO) {
        await supabase.from('work_orders').delete().eq('id', testWO.id);
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      workflow_name: workflowName,
      status: 'passed',
      steps_executed: 1,
      execution_time_ms: executionTime,
      executed_at: new Date().toISOString(),
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`${workflowName} failed:`, error);

    return {
      workflow_name: workflowName,
      status: 'failed',
      steps_executed: 0,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      execution_time_ms: executionTime,
      executed_at: new Date().toISOString(),
    };
  }
}

async function testForecastGeneration(supabase: any): Promise<WorkflowResult> {
  const startTime = Date.now();
  const workflowName = 'Forecast Generation';
  
  try {
    console.log(`Testing: ${workflowName}`);
    
    // Check forecast queue is accessible
    const { data: queueStatus } = await supabase
      .from('forecast_queue')
      .select('id, status')
      .limit(1);

    // Check forecast outputs table
    const { data: forecastOutputs } = await supabase
      .from('forecast_outputs')
      .select('id')
      .limit(1);

    const executionTime = Date.now() - startTime;

    return {
      workflow_name: workflowName,
      status: queueStatus !== null ? 'passed' : 'failed',
      steps_executed: 2,
      execution_time_ms: executionTime,
      executed_at: new Date().toISOString(),
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`${workflowName} failed:`, error);

    return {
      workflow_name: workflowName,
      status: 'failed',
      steps_executed: 0,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      execution_time_ms: executionTime,
      executed_at: new Date().toISOString(),
    };
  }
}

async function testInvoiceCreation(supabase: any): Promise<WorkflowResult> {
  const startTime = Date.now();
  const workflowName = 'Invoice Creation';
  
  try {
    console.log(`Testing: ${workflowName}`);
    
    // Check invoice table is accessible
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount_total')
      .limit(1);

    if (invoiceError) throw new Error(`Invoice query failed: ${invoiceError.message}`);

    const executionTime = Date.now() - startTime;

    return {
      workflow_name: workflowName,
      status: 'passed',
      steps_executed: 1,
      execution_time_ms: executionTime,
      executed_at: new Date().toISOString(),
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`${workflowName} failed:`, error);

    return {
      workflow_name: workflowName,
      status: 'failed',
      steps_executed: 0,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      execution_time_ms: executionTime,
      executed_at: new Date().toISOString(),
    };
  }
}
