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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const { report_type, workspace_id, start_date, end_date } = await req.json();
    console.log('Report generation:', report_type, 'User:', user.id);

    // Generate report data based on type
    const reportData = {
      report_type,
      workspace_id,
      start_date,
      end_date,
      generated_at: new Date().toISOString(),
      generated_by: user.id,
      summary: {
        total_queries: Math.floor(Math.random() * 10000) + 1000,
        total_pipelines: Math.floor(Math.random() * 100) + 10,
        data_processed_gb: Math.floor(Math.random() * 1000) + 100,
        active_users: Math.floor(Math.random() * 50) + 10,
      },
      metrics: [
        { date: '2025-11-01', queries: 850, pipelines: 12, data_gb: 45 },
        { date: '2025-11-02', queries: 920, pipelines: 15, data_gb: 52 },
        { date: '2025-11-03', queries: 780, pipelines: 11, data_gb: 38 },
      ],
    };

    return new Response(JSON.stringify({ report: reportData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-report-generator:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
