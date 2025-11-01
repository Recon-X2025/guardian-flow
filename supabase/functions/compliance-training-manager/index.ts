import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { action, campaignData, userId, courseId } = await req.json();

    switch (action) {
      case 'launch_phishing_campaign':
        const { data, error } = await supabase.from('phishing_campaigns').insert(campaignData).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, campaign: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      
      case 'assign_training':
        const assignError = await supabase.from('training_assignments').insert({
          course_id: courseId,
          user_id: userId,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          assigned_by: userId
        });
        if (assignError.error) throw assignError.error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
