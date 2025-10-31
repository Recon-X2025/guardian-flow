import { corsHeaders } from '../_shared/cors.ts';
import { validateAuth } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req);

    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error.message }), {
        status: authResult.error.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { user_id, user_ids, notification_type, title, message, entity_type, entity_id, priority, action_url } = await req.json();

    const targetUsers = user_ids || [user_id];
    const notifications = [];

    for (const targetUserId of targetUsers) {
      // Check user preferences
      const { data: prefs } = await authResult.context.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('notification_type', notification_type)
        .single();

      if (!prefs || prefs.in_app_enabled) {
        const { data: notification, error } = await authResult.context.supabase
          .from('notifications')
          .insert({
            user_id: targetUserId,
            notification_type,
            title,
            message,
            entity_type,
            entity_id,
            priority: priority || 'normal',
            channel: 'in_app',
            action_url,
            sent_at: new Date().toISOString(),
            delivery_status: 'delivered'
          })
          .select()
          .single();

        if (!error) {
          notifications.push(notification);
        }
      }

      // TODO: Handle email, SMS, push notifications based on preferences
      if (prefs?.email_enabled) {
        // Email logic here
      }
    }

    return new Response(JSON.stringify({ notifications }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});