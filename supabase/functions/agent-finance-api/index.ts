import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-correlation-id, x-internal-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const INTERNAL_API_SECRET = Deno.env.get('INTERNAL_API_SECRET')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Internal call guard
    const incomingSecret = req.headers.get('x-internal-secret');
    if (!incomingSecret || incomingSecret !== INTERNAL_API_SECRET) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenantId = req.headers.get('x-tenant-id');
    const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID();
    const { action, data } = await req.json();

    console.log(`[Finance API] Action: ${action}, Tenant: ${tenantId}, Correlation: ${correlationId}`);

    let result;
    switch (action) {
      case 'calculate_penalties':
        result = await calculatePenalties(supabase, data.work_order_id);
        break;
      case 'generate_invoice':
        result = await generateInvoice(supabase, data);
        break;
      case 'get_invoices':
        result = await getInvoices(supabase, tenantId!, data);
        break;
      case 'get_penalties':
        result = await getPenalties(supabase, tenantId!, data);
        break;
      case 'generate_offer':
        result = await generateOffer(supabase, data);
        break;
      case 'get_billing_summary':
        result = await getBillingSummary(supabase, tenantId!, data);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const responseTime = Date.now() - startTime;
    return new Response(JSON.stringify({ success: true, data: result, correlation_id: correlationId, response_time_ms: responseTime }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Response-Time': `${responseTime}ms` },
    });

  } catch (error: any) {
    console.error('[Finance API] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function calculatePenalties(supabase: any, workOrderId: string) {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/calculate-penalties`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ workOrderId }),
  });
  return await response.json();
}

async function generateInvoice(supabase: any, data: any) {
  const invoiceNumber = `INV-${Date.now()}`;
  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      work_order_id: data.work_order_id,
      customer_id: data.customer_id,
      quote_id: data.quote_id,
      subtotal: data.subtotal,
      penalties: data.penalties || 0,
      total_amount: data.total_amount,
      status: 'draft',
      tenant_id: data.tenant_id,
    })
    .select()
    .single();
  if (error) throw error;
  return invoice;
}

async function getInvoices(supabase: any, tenantId: string, filters: any = {}) {
  let query = supabase.from('invoices').select('*, work_orders(wo_number), quotes(*)', { count: 'exact' }).order('created_at', { ascending: false });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);
  if (filters.from_date) query = query.gte('created_at', filters.from_date);
  if (filters.to_date) query = query.lte('created_at', filters.to_date);
  if (filters.limit) query = query.limit(filters.limit);
  const { data, error, count } = await query;
  if (error) throw error;
  return { invoices: data, total: count };
}

async function getPenalties(supabase: any, tenantId: string, filters: any = {}) {
  let query = supabase.from('penalty_applications').select('*, work_orders(wo_number, technician_id)', { count: 'exact' }).order('created_at', { ascending: false });
  if (filters.disputed !== undefined) query = query.eq('disputed', filters.disputed);
  if (filters.work_order_id) query = query.eq('work_order_id', filters.work_order_id);
  if (filters.from_date) query = query.gte('created_at', filters.from_date);
  if (filters.to_date) query = query.lte('created_at', filters.to_date);
  if (filters.limit) query = query.limit(filters.limit);
  const { data, error, count } = await query;
  if (error) throw error;
  return { penalties: data, total: count };
}

async function generateOffer(supabase: any, data: any) {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-service-order`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ workOrderId: data.work_order_id, customerId: data.customer_id }),
  });
  return await response.json();
}

async function getBillingSummary(supabase: any, tenantId: string, filters: any = {}) {
  const startDate = filters.start_date || new Date(new Date().setDate(1)).toISOString().split('T')[0];
  const endDate = filters.end_date || new Date().toISOString().split('T')[0];
  const { data: invoices } = await supabase.from('invoices').select('status, total_amount, penalties').gte('created_at', startDate).lte('created_at', endDate);
  const { data: penalties } = await supabase.from('penalty_applications').select('amount, disputed').gte('created_at', startDate).lte('created_at', endDate);
  const summary = {
    period: { start_date: startDate, end_date: endDate },
    invoices: {
      total: invoices?.length || 0,
      draft: invoices?.filter((i: any) => i.status === 'draft').length || 0,
      sent: invoices?.filter((i: any) => i.status === 'sent').length || 0,
      paid: invoices?.filter((i: any) => i.status === 'paid').length || 0,
      total_amount: invoices?.reduce((sum: number, i: any) => sum + Number(i.total_amount), 0) || 0,
      total_penalties: invoices?.reduce((sum: number, i: any) => sum + Number(i.penalties || 0), 0) || 0,
    },
    penalties: {
      total: penalties?.length || 0,
      disputed: penalties?.filter((p: any) => p.disputed).length || 0,
      total_amount: penalties?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0,
    },
  };
  return summary;
}
