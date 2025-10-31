import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface TelemetryParams {
  functionName: string;
  startTime: number;
  status: 'success' | 'error' | 'timeout';
  error?: Error;
  tenantId?: string;
  userId?: string;
  securityLevel: 'public' | 'authenticated' | 'privileged';
  req?: Request;
}

export async function recordFunctionCall(params: TelemetryParams) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const executionTime = Date.now() - params.startTime;
    
    // Extract IP and user agent from request if available
    let ipAddress = null;
    let userAgent = null;
    
    if (params.req) {
      ipAddress = params.req.headers.get('x-forwarded-for') || 
                  params.req.headers.get('x-real-ip') || 
                  'unknown';
      userAgent = params.req.headers.get('user-agent') || 'unknown';
    }

    const telemetryData = {
      function_name: params.functionName,
      execution_time_ms: executionTime,
      status: params.status,
      error_message: params.error?.message || null,
      security_level: params.securityLevel,
      tenant_id: params.tenantId || null,
      user_id: params.userId || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    };

    const { error } = await supabase
      .from('function_telemetry')
      .insert(telemetryData);

    if (error) {
      console.error('Failed to record telemetry:', error);
    }

    // If this is a suspicious security event, log it
    if (params.securityLevel === 'privileged' || params.status === 'error') {
      await logSecurityEventIfNeeded(supabase, params, executionTime);
    }

  } catch (err) {
    console.error('Telemetry recording failed:', err);
  }
}

async function logSecurityEventIfNeeded(
  supabase: any,
  params: TelemetryParams,
  executionTime: number
) {
  // Log security events for privileged operations or errors
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  
  if (params.status === 'error' && params.securityLevel === 'privileged') {
    severity = 'high';
  } else if (params.status === 'error') {
    severity = 'medium';
  } else if (params.securityLevel === 'privileged') {
    severity = 'medium';
  }

  let ipAddress = null;
  let userAgent = null;
  
  if (params.req) {
    ipAddress = params.req.headers.get('x-forwarded-for') || 
                params.req.headers.get('x-real-ip') || 
                'unknown';
    userAgent = params.req.headers.get('user-agent') || 'unknown';
  }

  await supabase.from('security_events').insert({
    tenant_id: params.tenantId || null,
    event_type: `function_${params.status}`,
    severity,
    user_id: params.userId || null,
    ip_address: ipAddress,
    user_agent: userAgent,
    details: {
      function_name: params.functionName,
      execution_time_ms: executionTime,
      error: params.error?.message,
      security_level: params.securityLevel,
    },
  });
}
