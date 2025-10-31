import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query recent security events
    const { data: recentEvents, error: eventsError } = await supabase
      .from('security_events')
      .select('*')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('created_at', { ascending: false });

    if (eventsError) throw eventsError;

    // Analyze for suspicious patterns
    const suspiciousPatterns = analyzeSuspiciousPatterns(recentEvents || []);

    // Query telemetry for error patterns
    const { data: telemetry, error: telemetryError } = await supabase
      .from('function_telemetry')
      .select('*')
      .eq('status', 'error')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString())
      .order('created_at', { ascending: false });

    if (telemetryError) throw telemetryError;

    const errorAnalysis = analyzeErrors(telemetry || []);

    return new Response(
      JSON.stringify({
        security_events: {
          total: recentEvents?.length || 0,
          critical: recentEvents?.filter(e => e.severity === 'critical').length || 0,
          high: recentEvents?.filter(e => e.severity === 'high').length || 0,
          suspicious_patterns: suspiciousPatterns,
        },
        errors: {
          total: telemetry?.length || 0,
          by_function: errorAnalysis.byFunction,
          recent_critical: errorAnalysis.recentCritical,
        },
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Security monitor error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function analyzeSuspiciousPatterns(events: any[]) {
  const patterns: any[] = [];

  // Check for repeated login failures from same IP
  const loginFailures = events.filter(e => e.event_type === 'login_failure');
  const ipCounts = loginFailures.reduce((acc, event) => {
    const ip = event.ip_address || 'unknown';
    acc[ip] = (acc[ip] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(ipCounts).forEach(([ip, count]) => {
    if ((count as number) >= 5) {
      patterns.push({
        type: 'repeated_login_failures',
        ip_address: ip,
        count,
        severity: 'high',
      });
    }
  });

  // Check for privilege escalation attempts
  const privilegeEscalations = events.filter(e => e.event_type === 'privilege_escalation');
  if (privilegeEscalations.length > 0) {
    patterns.push({
      type: 'privilege_escalation_detected',
      count: privilegeEscalations.length,
      severity: 'critical',
    });
  }

  return patterns;
}

function analyzeErrors(telemetry: any[]) {
  const byFunction = telemetry.reduce((acc, t) => {
    const fn = t.function_name;
    acc[fn] = (acc[fn] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const recentCritical = telemetry
    .filter(t => t.security_level === 'privileged')
    .slice(0, 10)
    .map(t => ({
      function: t.function_name,
      error: t.error_message,
      timestamp: t.created_at,
    }));

  return { byFunction, recentCritical };
}
