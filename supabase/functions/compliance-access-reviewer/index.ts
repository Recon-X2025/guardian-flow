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
    const { action, campaignId, itemId, decision, justification } = await req.json();

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    switch (action) {
      case 'create_campaign':
        return await createAccessReviewCampaign(supabase, user.id, await req.json());
      
      case 'review_item':
        return await reviewAccessItem(supabase, user.id, itemId, decision, justification);
      
      case 'auto_revoke_overdue':
        return await autoRevokeOverdue(supabase);
      
      case 'generate_review_items':
        return await generateReviewItems(supabase, campaignId);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function createAccessReviewCampaign(supabase: any, userId: string, data: any) {
  const { campaign_name, description, reviewer_role, scope, due_date, tenant_id } = data;

  const { data: campaign, error } = await supabase
    .from('access_review_campaigns')
    .insert({
      campaign_name,
      description,
      reviewer_role,
      scope,
      due_date,
      tenant_id,
      created_by: userId,
      status: 'scheduled'
    })
    .select()
    .single();

  if (error) throw error;

  // Generate review items
  await generateReviewItems(supabase, campaign.id);

  return new Response(JSON.stringify({ success: true, campaign }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function generateReviewItems(supabase: any, campaignId: string) {
  // Get campaign details
  const { data: campaign, error: campError } = await supabase
    .from('access_review_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campError) throw campError;

  // Get all user_roles to review
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*');

  if (rolesError) throw rolesError;

  // Create review items
  const reviewItems = userRoles.map((ur: any) => ({
    campaign_id: campaignId,
    user_id: ur.user_id,
    role: ur.role,
    tenant_id: ur.tenant_id,
    decision: 'pending'
  }));

  const { error: insertError } = await supabase
    .from('access_review_items')
    .insert(reviewItems);

  if (insertError) throw insertError;

  // Update campaign status
  await supabase
    .from('access_review_campaigns')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', campaignId);

  return new Response(JSON.stringify({ success: true, itemsCreated: reviewItems.length }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function reviewAccessItem(supabase: any, reviewerId: string, itemId: string, decision: string, justification: string) {
  const { data: item, error: updateError } = await supabase
    .from('access_review_items')
    .update({
      decision,
      justification,
      reviewer_id: reviewerId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select()
    .single();

  if (updateError) throw updateError;

  // If revoked, remove the role
  if (decision === 'revoked') {
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', item.user_id)
      .eq('role', item.role);

    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        user_id: item.user_id,
        action: 'role_revoked',
        resource_type: 'user_role',
        resource_id: itemId,
        actor_role: 'auditor',
        reason: `Access review: ${justification}`,
        correlation_id: crypto.randomUUID()
      });
  }

  return new Response(JSON.stringify({ success: true, item }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function autoRevokeOverdue(supabase: any) {
  // Find overdue campaigns with pending items
  const { data: overdueCampaigns, error: campError } = await supabase
    .from('access_review_campaigns')
    .select('*')
    .eq('status', 'in_progress')
    .eq('auto_revoke_enabled', true)
    .lt('due_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (campError) throw campError;

  let revokedCount = 0;

  for (const campaign of overdueCampaigns) {
    // Get pending items
    const { data: pendingItems, error: itemsError } = await supabase
      .from('access_review_items')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('decision', 'pending');

    if (itemsError) continue;

    // Auto-revoke pending items
    for (const item of pendingItems) {
      await supabase
        .from('access_review_items')
        .update({
          decision: 'revoked',
          justification: 'Auto-revoked due to missed review deadline',
          reviewed_at: new Date().toISOString(),
          auto_revoked: true
        })
        .eq('id', item.id);

      // Remove role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', item.user_id)
        .eq('role', item.role);

      revokedCount++;
    }

    // Mark campaign as completed
    await supabase
      .from('access_review_campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', campaign.id);
  }

  return new Response(JSON.stringify({ success: true, revokedCount }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
