import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID();

  try {
    console.log(`[${correlationId}] Starting trial notification job`);

    // Create service role client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find all active trials that need notifications
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    console.log(`[${correlationId}] Querying for expiring trials`);

    const { data: expiringTrials, error: queryError } = await supabase
      .from('tenant_subscriptions')
      .select(`
        id,
        tenant_id,
        trial_end,
        subscription_plans (name, display_name),
        tenants (name)
      `)
      .eq('status', 'trial')
      .lt('trial_end', twoDaysFromNow.toISOString())
      .gt('trial_end', now.toISOString());

    if (queryError) {
      console.error(`[${correlationId}] Error querying trials:`, queryError);
      throw queryError;
    }

    console.log(`[${correlationId}] Found ${expiringTrials?.length || 0} expiring trials`);

    if (!expiringTrials || expiringTrials.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No trials expiring soon', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant admins for each expiring trial
    const notifications = [];

    for (const trial of expiringTrials) {
      // Calculate days remaining
      const trialEndDate = new Date(trial.trial_end);
      const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Get tenant admins
      const { data: admins, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id, profiles(email, full_name)')
        .eq('tenant_id', trial.tenant_id)
        .in('role', ['tenant_admin', 'sys_admin']);

      if (adminError) {
        console.error(`[${correlationId}] Error fetching admins for tenant ${trial.tenant_id}:`, adminError);
        continue;
      }

      if (!admins || admins.length === 0) {
        console.warn(`[${correlationId}] No admins found for tenant ${trial.tenant_id}`);
        continue;
      }

      // Create notifications for each admin
      for (const admin of admins) {
        const profile = admin.profiles as any;
        const planName = trial.subscription_plans?.display_name || trial.subscription_plans?.name || 'Your Plan';
        const tenantName = trial.tenants?.name || 'Your Organization';

        // Determine email template based on days remaining
        let subject: string;
        let body: string;

        if (daysRemaining <= 1) {
          // Last day - urgent notification
          subject = `🚨 Action Required: Your ${planName} Trial Expires Today`;
          body = `
Dear ${profile.full_name || 'Admin'},

Your ${planName} trial for ${tenantName} expires today.

Without upgrading, you'll lose access to:
• Your selected modules
• All stored data
• Work history and configurations

👉 <a href="${Deno.env.get('APP_URL') || 'https://guardian-flow.com'}/auth/select-plan">Upgrade Now</a>

If you have questions, contact our support team.

Best regards,
Guardian Flow Team
          `.trim();
        } else if (daysRemaining <= 7) {
          // One week warning
          subject = `⏰ Your ${planName} Trial Expires in ${daysRemaining} Days`;
          body = `
Dear ${profile.full_name || 'Admin'},

Your ${planName} trial for ${tenantName} expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.

To maintain access to your modules and data, please upgrade before your trial ends.

👉 <a href="${Deno.env.get('APP_URL') || 'https://guardian-flow.com'}/auth/select-plan">Upgrade Now</a>

Questions? We're here to help.

Best regards,
Guardian Flow Team
          `.trim();
        } else {
          // Two week reminder
          subject = `📅 Your ${planName} Trial: ${daysRemaining} Days Remaining`;
          body = `
Dear ${profile.full_name || 'Admin'},

Your ${planName} trial for ${tenantName} has ${daysRemaining} days remaining.

Are you enjoying Guardian Flow? We hope you've found value in our platform.

👉 <a href="${Deno.env.get('APP_URL') || 'https://guardian-flow.com'}/auth/select-plan">Explore Upgrade Options</a>

Need help? Contact our team anytime.

Best regards,
Guardian Flow Team
          `.trim();
        }

        // Check if we already sent notification today
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const { data: existingNotif } = await supabase
          .from('notification_queue')
          .select('id')
          .eq('recipient', profile.email)
          .eq('subject', subject)
          .gte('created_at', todayStart.toISOString())
          .limit(1)
          .maybeSingle();

        if (!existingNotif) {
          notifications.push({
            user_id: admin.user_id,
            channel: 'email',
            recipient: profile.email,
            subject,
            body,
            scheduled_for: now.toISOString(),
            status: 'pending'
          });
        }
      }
    }

    // Batch insert notifications
    if (notifications.length > 0) {
      console.log(`[${correlationId}] Inserting ${notifications.length} notifications`);
      const { data, error: insertError } = await supabase
        .from('notification_queue')
        .insert(notifications)
        .select();

      if (insertError) {
        console.error(`[${correlationId}] Error inserting notifications:`, insertError);
        throw insertError;
      }

      console.log(`[${correlationId}] Successfully inserted ${data?.length || 0} notifications`);
    }

    return new Response(
      JSON.stringify({
        message: 'Trial notifications queued',
        count: notifications.length,
        correlationId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${correlationId}] Error:`, error);
    return new Response(
      JSON.stringify({
        error: (error as Error).message,
        correlationId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

