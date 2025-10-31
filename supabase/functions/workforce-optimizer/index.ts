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

    const { workOrderId } = await req.json();

    // Get work order details
    const { data: workOrder } = await supabase
      .from('work_orders')
      .select('*, equipment:equipment(*)')
      .eq('id', workOrderId)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (!workOrder) {
      return new Response(JSON.stringify({ error: 'Work order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get available technicians
    const { data: technicians } = await supabase
      .from('technicians')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'active');

    // Get technician availability
    const today = new Date().toISOString().split('T')[0];
    const { data: availability } = await supabase
      .from('technician_availability')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('date', today)
      .eq('status', 'available');

    // Get recent work order assignments for each technician
    const technicianScores = [];

    for (const tech of technicians || []) {
      const { data: recentWOs } = await supabase
        .from('work_orders')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('assigned_technician_id', tech.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      const isAvailable = availability?.some(a => a.technician_id === tech.id);
      const workload = recentWOs?.length || 0;
      const completedCount = recentWOs?.filter(w => w.status === 'completed').length || 0;
      const completionRate = completedCount / (workload || 1);
      
      // Calculate distance if location data available (simplified)
      const distance = Math.random() * 50; // Placeholder for actual distance calculation

      // Scoring algorithm
      let score = 0;
      if (isAvailable) score += 40;
      score += (1 - (workload / 20)) * 20; // Lower workload is better
      score += completionRate * 20;
      score += (1 - (distance / 50)) * 20; // Closer is better

      technicianScores.push({
        technician: tech,
        score: Math.round(score),
        factors: {
          available: isAvailable,
          currentWorkload: workload,
          completionRate: (completionRate * 100).toFixed(1),
          distance: distance.toFixed(1),
        }
      });
    }

    // Sort by score
    technicianScores.sort((a, b) => b.score - a.score);

    // Save top recommendation
    if (technicianScores.length > 0) {
      const topMatch = technicianScores[0];
      await supabase.from('scheduling_recommendations').insert({
        tenant_id: profile.tenant_id,
        work_order_id: workOrderId,
        recommended_technician_id: topMatch.technician.id,
        confidence_score: topMatch.score,
        reasoning: {
          top_factors: ['availability', 'workload_balance', 'completion_history', 'proximity'],
        },
        factors: topMatch.factors,
        estimated_duration_minutes: 120,
        optimal_start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        recommendations: technicianScores.slice(0, 5),
        total_available: availability?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error optimizing workforce:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});