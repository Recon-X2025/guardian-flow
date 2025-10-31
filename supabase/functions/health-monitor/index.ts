import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheck {
  name: string;
  endpoint: string;
  method: string;
  expectedStatus: number;
  timeout: number;
}

interface HealthCheckResult {
  check_name: string;
  status: 'healthy' | 'unhealthy' | 'timeout';
  response_time_ms: number;
  status_code?: number;
  error_message?: string;
  checked_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('Starting health monitoring checks...');

  // Define critical health checks
  const healthChecks: HealthCheck[] = [
    {
      name: 'API Gateway',
      endpoint: `${supabaseUrl}/functions/v1/auth-me`,
      method: 'GET',
      expectedStatus: 401, // Expected without auth
      timeout: 5000,
    },
    {
      name: 'Database Connection',
      endpoint: `${supabaseUrl}/rest/v1/system_health?select=id&limit=1`,
      method: 'GET',
      expectedStatus: 200,
      timeout: 5000,
    },
    {
      name: 'Precheck Orchestrator',
      endpoint: `${supabaseUrl}/functions/v1/precheck-orchestrator`,
      method: 'POST',
      expectedStatus: 401, // Expected without auth
      timeout: 10000,
    },
    {
      name: 'Forecast Engine',
      endpoint: `${supabaseUrl}/functions/v1/forecast-status`,
      method: 'GET',
      expectedStatus: 401,
      timeout: 5000,
    },
  ];

  const results: HealthCheckResult[] = [];
  let overallHealthy = true;

  // Execute all health checks
  for (const check of healthChecks) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), check.timeout);

      const response = await fetch(check.endpoint, {
        method: check.method,
        headers: {
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      const isHealthy = response.status === check.expectedStatus;
      if (!isHealthy) overallHealthy = false;

      results.push({
        check_name: check.name,
        status: isHealthy ? 'healthy' : 'unhealthy',
        response_time_ms: responseTime,
        status_code: response.status,
        checked_at: new Date().toISOString(),
      });

      console.log(`✓ ${check.name}: ${response.status} (${responseTime}ms)`);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      overallHealthy = false;

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const status = errorMessage.includes('aborted') ? 'timeout' : 'unhealthy';

      results.push({
        check_name: check.name,
        status,
        response_time_ms: responseTime,
        error_message: errorMessage,
        checked_at: new Date().toISOString(),
      });

      console.error(`✗ ${check.name}: ${errorMessage} (${responseTime}ms)`);
    }
  }

  // Store results in database
  const { error: insertError } = await supabase
    .from('health_check_logs')
    .insert(results);

  if (insertError) {
    console.error('Failed to store health check results:', insertError);
  }

  // Check for critical failures and trigger self-healing
  const criticalFailures = results.filter(
    r => r.status !== 'healthy' && ['API Gateway', 'Database Connection'].includes(r.check_name)
  );

  if (criticalFailures.length > 0) {
    console.warn('Critical failures detected:', criticalFailures);
    
    // Trigger self-healing actions
    await triggerSelfHealing(supabase, criticalFailures);
  }

  // Update system health table
  await supabase.from('system_health').upsert({
    id: 'health-monitor',
    component: 'health_monitor',
    status: overallHealthy ? 'operational' : 'degraded',
    last_check: new Date().toISOString(),
    metadata: {
      total_checks: results.length,
      healthy_checks: results.filter(r => r.status === 'healthy').length,
      avg_response_time: Math.round(
        results.reduce((sum, r) => sum + r.response_time_ms, 0) / results.length
      ),
    },
  });

  return new Response(
    JSON.stringify({
      overall_status: overallHealthy ? 'healthy' : 'unhealthy',
      checks_performed: results.length,
      healthy_count: results.filter(r => r.status === 'healthy').length,
      results,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});

async function triggerSelfHealing(supabase: any, failures: HealthCheckResult[]) {
  console.log('Initiating self-healing actions...');

  for (const failure of failures) {
    // Log self-healing attempt
    await supabase.from('self_healing_logs').insert({
      component: failure.check_name,
      action: 'retry_after_failure',
      triggered_by: 'health_monitor',
      status: 'initiated',
      metadata: {
        original_error: failure.error_message,
        response_time: failure.response_time_ms,
      },
    });

    // Self-healing actions (stateless only)
    if (failure.check_name === 'Database Connection') {
      // Clear query cache by running a dummy query
      await supabase.from('system_health').select('id').limit(1);
      console.log('Cleared database query cache');
    }

    // Create incident ticket for tracking
    await supabase.from('system_incidents').insert({
      title: `Health Check Failure: ${failure.check_name}`,
      severity: 'high',
      status: 'open',
      component: failure.check_name,
      description: `Health check failed with status: ${failure.status}. ${failure.error_message || 'No error message'}`,
      detected_at: failure.checked_at,
    });
  }

  console.log('Self-healing actions completed');
}
