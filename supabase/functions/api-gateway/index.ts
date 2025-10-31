import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const apiKey = req.headers.get('x-api-key');

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify API key using tenant_api_keys table
    const { data: keyData, error: keyError } = await supabase
      .from('tenant_api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .eq('status', 'active')
      .single();

    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if expired
    if (new Date(keyData.expiry_date) < new Date()) {
      return new Response(JSON.stringify({ error: 'API key expired' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check rate limits (per minute)
    const now = new Date();
    const minuteAgo = new Date(now.getTime() - 60000);
    
    const { count: recentRequests } = await supabase
      .from('api_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', keyData.tenant_id)
      .eq('api_key_id', keyData.id)
      .gte('timestamp', minuteAgo.toISOString());

    if ((recentRequests || 0) >= keyData.rate_limit) {
      // Log overage
      await supabase.from('api_overage_logs').insert({
        tenant_id: keyData.tenant_id,
        api_key_id: keyData.id,
        daily_limit: keyData.rate_limit,
        actual_usage: (recentRequests || 0) + 1,
        overage_count: ((recentRequests || 0) + 1) - keyData.rate_limit
      });

      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        limit: keyData.rate_limit,
        resetAt: new Date(now.getTime() + 60000).toISOString()
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(keyData.rate_limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(now.getTime() + 60000).toISOString()
        }
      });
    }

    // Parse request path and method
    const url = new URL(req.url);
    const path = url.pathname.replace('/api-gateway', '');
    const method = req.method;

    // Route to appropriate handler based on path
    let response;
    if (path.startsWith('/work-orders')) {
      response = await handleWorkOrders(supabase, keyData, method, path, req);
    } else if (path.startsWith('/customers')) {
      response = await handleCustomers(supabase, keyData, method, path, req);
    } else if (path.startsWith('/invoices')) {
      response = await handleInvoices(supabase, keyData, method, path, req);
    } else {
      response = { error: 'Endpoint not found' };
    }

    const responseTime = Date.now() - startTime;
    const statusCode = response.error ? 400 : 200;

    // Log API usage
    await supabase.from('api_usage_logs').insert({
      tenant_id: keyData.tenant_id,
      api_key_id: keyData.id,
      endpoint: path,
      method: method,
      status_code: statusCode,
      response_time: responseTime,
      correlation_id: crypto.randomUUID(),
      error_message: response.error || null
    });

    // Update last used timestamp
    await supabase
      .from('tenant_api_keys')
      .update({ 
        last_used_at: now.toISOString()
      })
      .eq('id', keyData.id);

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Response-Time': `${responseTime}ms`,
        'X-RateLimit-Limit': String(keyData.rate_limit),
        'X-RateLimit-Remaining': String(Math.max(0, keyData.rate_limit - (recentRequests || 0) - 1)),
        'X-RateLimit-Reset': new Date(now.getTime() + 60000).toISOString()
      }
    });

  } catch (error: any) {
    console.error('API Gateway error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});


async function handleWorkOrders(supabase: any, keyData: any, method: string, path: string, req: Request) {
  if (method === 'GET') {
    // Extract work order ID if present in path
    const woId = path.split('/')[2];
    
    let query = supabase
      .from('work_orders')
      .select('*, ticket:tickets(*), technician:technicians(*)');
    
    // Tenant isolation
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', keyData.created_by)
      .single();
    
    if (profile?.tenant_id) {
      const { data: tickets } = await supabase
        .from('tickets')
        .select('id')
        .eq('tenant_id', profile.tenant_id);
      
      const ticketIds = tickets?.map((t: any) => t.id) || [];
      query = query.in('ticket_id', ticketIds);
    }
    
    if (woId) {
      query = query.eq('id', woId).single();
    } else {
      query = query.limit(100);
    }
    
    const { data, error } = await query;
    return error ? { error: error.message } : { data };
  }

  return { error: 'Method not implemented' };
}

async function handleCustomers(supabase: any, keyData: any, method: string, path: string, req: Request) {
  if (method === 'GET') {
    const customerId = path.split('/')[2];
    
    let query = supabase
      .from('customers')
      .select('*, contacts:customer_contacts(*)');
    
    // Tenant isolation
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', keyData.created_by)
      .single();
    
    if (profile?.tenant_id) {
      query = query.eq('tenant_id', profile.tenant_id);
    }
    
    if (customerId) {
      query = query.eq('id', customerId).single();
    } else {
      query = query.limit(100);
    }
    
    const { data, error } = await query;
    return error ? { error: error.message } : { data };
  }

  return { error: 'Method not implemented' };
}

async function handleInvoices(supabase: any, keyData: any, method: string, path: string, req: Request) {
  if (method === 'GET') {
    const invoiceId = path.split('/')[2];
    
    let query = supabase
      .from('invoices')
      .select('*, customer:customers(*), work_order:work_orders(*)');
    
    // Tenant isolation
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', keyData.created_by)
      .single();
    
    if (profile?.tenant_id) {
      query = query.eq('tenant_id', profile.tenant_id);
    }
    
    if (invoiceId) {
      query = query.eq('id', invoiceId).single();
    } else {
      query = query.limit(100);
    }
    
    const { data, error } = await query;
    return error ? { error: error.message } : { data };
  }

  return { error: 'Method not implemented' };
}