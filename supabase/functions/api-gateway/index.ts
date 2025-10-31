import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface RateLimitCheck {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

async function checkRateLimit(
  supabase: any,
  tenantId: string,
  partnerId: string | null,
  endpoint: string
): Promise<RateLimitCheck> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60000);

  const { data: config } = await supabase
    .from('rate_limit_config')
    .select('*')
    .or(`tenant_id.eq.${tenantId},partner_id.eq.${partnerId}`)
    .like('endpoint_pattern', `%${endpoint}%`)
    .single();

  const limits = config || {
    max_requests_per_minute: 60,
    max_requests_per_hour: 1000,
    max_requests_per_day: 10000
  };

  const query = supabase
    .from('api_usage_metrics')
    .select('id', { count: 'exact', head: true })
    .eq('endpoint', endpoint);

  if (partnerId) {
    query.eq('partner_id', partnerId);
  } else {
    query.eq('tenant_id', tenantId);
  }

  const { count: minuteCount } = await query.gte('created_at', oneMinuteAgo.toISOString());

  if (minuteCount >= limits.max_requests_per_minute) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now.getTime() + 60000)
    };
  }

  return {
    allowed: true,
    remaining: limits.max_requests_per_minute - minuteCount,
    resetAt: new Date(now.getTime() + 60000)
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    const apiKey = req.headers.get('X-API-Key');

    let tenantId: string | null = null;
    let partnerId: string | null = null;
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        userId = user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();
        tenantId = profile?.tenant_id || null;
      }
    } else if (apiKey) {
      const { data: partner } = await supabase
        .from('partners')
        .select('id, tenant_id')
        .eq('api_key', apiKey)
        .eq('status', 'active')
        .single();

      if (partner) {
        partnerId = partner.id;
        tenantId = partner.tenant_id;
      }
    }

    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const endpoint = url.pathname;

    const rateLimitCheck = await checkRateLimit(supabase, tenantId, partnerId, endpoint);

    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          resetAt: rateLimitCheck.resetAt
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitCheck.resetAt.toISOString()
          },
        }
      );
    }

    let response;
    let statusCode = 200;

    try {
      if (endpoint.startsWith('/api/work-orders')) {
        const { data } = await supabase
          .from('work_orders')
          .select('*')
          .eq('tenant_id', tenantId)
          .limit(100);
        response = { data };
      } else if (endpoint.startsWith('/api/technicians')) {
        const { data } = await supabase
          .from('technicians')
          .select('*')
          .eq('tenant_id', tenantId)
          .limit(100);
        response = { data };
      } else if (endpoint.startsWith('/api/analytics')) {
        const { data } = await supabase
          .from('analytics_hourly_aggregates')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('hour_start', { ascending: false })
          .limit(24);
        response = { data };
      } else {
        statusCode = 404;
        response = { error: 'Endpoint not found' };
      }
    } catch (error: any) {
      statusCode = 500;
      response = { error: error.message };
    }

    const responseTime = Date.now() - startTime;

    await supabase.from('api_usage_metrics').insert({
      tenant_id: tenantId,
      partner_id: partnerId,
      endpoint,
      method: req.method,
      status_code: statusCode,
      response_time_ms: responseTime,
      user_id: userId,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
        'X-RateLimit-Reset': rateLimitCheck.resetAt.toISOString()
      },
    });

  } catch (error: any) {
    console.error('API Gateway error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});