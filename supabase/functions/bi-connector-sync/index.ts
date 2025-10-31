import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ error: 'No tenant found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { connectorId } = await req.json();

    // Get connector configuration
    const { data: connector } = await supabase
      .from('bi_connectors')
      .select('*')
      .eq('id', connectorId)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (!connector) {
      return new Response(JSON.stringify({ error: 'Connector not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refresh materialized view (skip if RPC doesn't exist)
    try {
      await supabase.rpc('refresh_materialized_view', { view_name: 'mv_daily_operations' });
    } catch {
      console.log('Materialized view refresh skipped');
    }

    // Export data based on connector type
    const exportData: any = {};

    // Get daily operations summary
    const { data: dailyOps } = await supabase
      .from('mv_daily_operations')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('operation_date', { ascending: false })
      .limit(90);

    exportData.daily_operations = dailyOps;

    // Get work orders summary
    const { data: workOrders } = await supabase
      .from('work_orders')
      .select('id, wo_number, status, priority, created_at, completed_at, assigned_technician_id')
      .eq('tenant_id', profile.tenant_id)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1000);

    exportData.work_orders = workOrders;

    // Get analytics aggregates
    const { data: analytics } = await supabase
      .from('analytics_hourly_aggregates')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .gte('hour_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('hour_start', { ascending: false });

    exportData.analytics = analytics;

    // Update connector last sync
    await supabase
      .from('bi_connectors')
      .update({ 
        last_sync_at: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', connectorId);

    return new Response(
      JSON.stringify({
        success: true,
        connector: connector.connector_name,
        records_synced: {
          daily_operations: dailyOps?.length || 0,
          work_orders: workOrders?.length || 0,
          analytics: analytics?.length || 0,
        },
        data: exportData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error syncing BI connector:', error);
    
    // Error already logged
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});