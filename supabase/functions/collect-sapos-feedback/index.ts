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

    const { offer_id, customer_id, ticket_id, accepted, feedback_type, notes } = await req.json();

    // Store feedback
    const { data: feedback, error } = await supabase
      .from('sapos_feedback')
      .insert({
        offer_id,
        customer_id,
        ticket_id,
        accepted,
        feedback_type,
        notes
      })
      .select()
      .single();

    if (error) throw error;

    // Check if model retraining is needed based on feedback volume
    const { count } = await supabase
      .from('sapos_feedback')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const needsRetraining = (count || 0) > 100; // Retrain after 100+ feedback items in last week

    return new Response(JSON.stringify({
      success: true,
      feedback,
      needs_retraining: needsRetraining
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Offer feedback error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
