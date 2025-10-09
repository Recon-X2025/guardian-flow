import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-correlation-id',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tenantId = req.headers.get('x-tenant-id');
    const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID();
    const { action, work_order_id, data } = await req.json();

    console.log(`[Ops API] Action: ${action}, Tenant: ${tenantId}, Correlation: ${correlationId}`);

    let result;

    switch (action) {
      case 'create_work_order':
        result = await createWorkOrder(supabase, tenantId!, data);
        break;
      
      case 'get_work_order':
        result = await getWorkOrder(supabase, tenantId!, work_order_id);
        break;
      
      case 'update_work_order':
        result = await updateWorkOrder(supabase, tenantId!, work_order_id, data);
        break;
      
      case 'release_work_order':
        result = await releaseWorkOrder(supabase, work_order_id);
        break;
      
      case 'complete_work_order':
        result = await completeWorkOrder(supabase, work_order_id, data);
        break;
      
      case 'list_work_orders':
        result = await listWorkOrders(supabase, tenantId!, data);
        break;
      
      case 'run_precheck':
        result = await runPrecheck(supabase, work_order_id);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        correlation_id: correlationId,
        response_time_ms: responseTime,
      }),
      {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Response-Time': `${responseTime}ms`,
        },
      }
    );

  } catch (error: any) {
    console.error('[Ops API] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function createWorkOrder(supabase: any, tenantId: string, data: any) {
  const woNumber = await generateWONumber(supabase);
  
  const { data: workOrder, error } = await supabase
    .from('work_orders')
    .insert({
      wo_number: woNumber,
      customer_id: data.customer_id,
      technician_id: data.technician_id,
      issue_description: data.issue_description,
      priority: data.priority || 'medium',
      status: 'draft',
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) throw error;
  return workOrder;
}

async function getWorkOrder(supabase: any, tenantId: string, workOrderId: string) {
  const { data, error } = await supabase
    .from('work_orders')
    .select('*, tickets(*), attachments(*)')
    .eq('id', workOrderId)
    .single();

  if (error) throw error;
  return data;
}

async function updateWorkOrder(supabase: any, tenantId: string, workOrderId: string, data: any) {
  const { data: updated, error } = await supabase
    .from('work_orders')
    .update(data)
    .eq('id', workOrderId)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

async function releaseWorkOrder(supabase: any, workOrderId: string) {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/release-work-order`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workOrderId }),
  });

  return await response.json();
}

async function completeWorkOrder(supabase: any, workOrderId: string, data: any) {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/complete-work-order`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workOrderId, ...data }),
  });

  return await response.json();
}

async function listWorkOrders(supabase: any, tenantId: string, filters: any = {}) {
  let query = supabase
    .from('work_orders')
    .select('*, tickets(count)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters.technician_id) {
    query = query.eq('technician_id', filters.technician_id);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return { work_orders: data, total: count };
}

async function runPrecheck(supabase: any, workOrderId: string) {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/precheck-orchestrator`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workOrderId }),
  });

  return await response.json();
}

async function generateWONumber(supabase: any): Promise<string> {
  const { data } = await supabase.rpc('generate_wo_number');
  return data || `WO-${Date.now()}`;
}
