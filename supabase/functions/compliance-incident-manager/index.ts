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
    const { action, incidentData, incidentId } = await req.json();

    switch (action) {
      case 'create_incident':
        const incidentNumber = await generateIncidentNumber(supabase);
        const { error } = await supabase.from('incidents').insert({
          incident_number: incidentNumber,
          ...incidentData
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, incident_number: incidentNumber }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      
      case 'escalate_incident':
        await supabase.from('security_alerts').insert({
          severity: 'critical',
          alert_title: `Incident ${incidentId} Escalated`,
          status: 'open'
        });
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

async function generateIncidentNumber(supabase: any): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase.from('incidents').select('*', { count: 'exact', head: true });
  return `INC-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
}
