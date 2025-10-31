import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { action, dispute_id, ...params } = await req.json();

    switch (action) {
      case 'create': {
        const { data: dispute, error } = await supabase
          .from('disputes')
          .insert({
            ticket_id: params.ticket_id,
            work_order_id: params.work_order_id,
            customer_id: user.id,
            dispute_type: params.dispute_type,
            description: params.description,
            evidence_urls: params.evidence_urls || []
          })
          .select()
          .single();

        if (error) throw error;

        // Send notification to ops team
        await supabase.from('notification_queue').insert({
          recipient_email: 'ops@techcorp.com',
          channel: 'email',
          subject: `New Dispute: ${params.dispute_type}`,
          body: `A new dispute has been filed for ticket ${params.ticket_id}. View details in the disputes dashboard.`,
          priority: 3
        });

        return new Response(JSON.stringify({ success: true, dispute }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'update_status': {
        const { error } = await supabase
          .from('disputes')
          .update({
            status: params.status,
            resolution: params.resolution,
            resolved_by: user.id,
            resolved_at: new Date().toISOString()
          })
          .eq('id', dispute_id);

        if (error) throw error;

        // Notify customer
        const { data: dispute } = await supabase
          .from('disputes')
          .select('customer_id, profiles(email)')
          .eq('id', dispute_id)
          .single();

        if (dispute && dispute.profiles) {
          const profiles = dispute.profiles as any;
          await supabase.from('notification_queue').insert({
            recipient_email: profiles.email,
            channel: 'email',
            subject: `Dispute Update: ${params.status}`,
            body: `Your dispute has been ${params.status}. Resolution: ${params.resolution}`,
            priority: 4
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'list': {
        const { data: disputes, error } = await supabase
          .from('disputes')
          .select(`
            *,
            tickets(customer_name, unit_serial),
            work_orders(wo_number)
          `)
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, disputes }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error('Invalid action');
    }

  } catch (error: any) {
    console.error('Dispute manager error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
