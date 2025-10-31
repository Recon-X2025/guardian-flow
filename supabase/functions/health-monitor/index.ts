import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const metrics: any[] = [];

    // Check database response time
    const dbStart = Date.now();
    await supabase.from('tenants').select('count').single();
    const dbTime = Date.now() - dbStart;
    metrics.push({ metric_name: 'db_response_time_ms', metric_value: dbTime });

    // Check work order processing queue depth
    const { count: queueDepth } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['draft', 'pending_validation']);
    metrics.push({ metric_name: 'work_order_queue_depth', metric_value: queueDepth || 0 });

    // Check pending notifications
    const { count: pendingNotifications } = await supabase
      .from('notification_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued');
    metrics.push({ metric_name: 'pending_notifications', metric_value: pendingNotifications || 0 });

    // Check sync queue backlog
    const { count: syncBacklog } = await supabase
      .from('mobile_sync_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    metrics.push({ metric_name: 'mobile_sync_backlog', metric_value: syncBacklog || 0 });

    // Get recent API error rate
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentErrors } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', oneHourAgo)
      .like('action', '%error%');
    metrics.push({ metric_name: 'hourly_error_count', metric_value: recentErrors || 0 });

    // Store metrics
    await supabase.from('system_health_metrics').insert(metrics);

    // Calculate health score (0-100)
    let healthScore = 100;
    if (dbTime > 100) healthScore -= 20;
    if ((queueDepth || 0) > 100) healthScore -= 15;
    if ((pendingNotifications || 0) > 500) healthScore -= 15;
    if ((syncBacklog || 0) > 1000) healthScore -= 20;
    if ((recentErrors || 0) > 50) healthScore -= 30;

    const status = healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'critical';

    return new Response(JSON.stringify({
      success: true,
      health_score: Math.max(0, healthScore),
      status,
      metrics: metrics.reduce((acc, m) => {
        acc[m.metric_name] = m.metric_value;
        return acc;
      }, {} as Record<string, number>),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Health monitor error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        health_score: 0,
        status: 'critical',
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
