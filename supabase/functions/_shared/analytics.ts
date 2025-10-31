import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AnalyticsEventParams {
  tenantId: string;
  eventType: string;
  eventCategory: 'operational' | 'financial' | 'security' | 'user_action';
  entityType?: string;
  entityId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export async function trackEvent(params: AnalyticsEventParams) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('analytics_events')
      .insert({
        tenant_id: params.tenantId,
        event_type: params.eventType,
        event_category: params.eventCategory,
        entity_type: params.entityType || null,
        entity_id: params.entityId || null,
        user_id: params.userId || null,
        metadata: params.metadata || {},
      });

    if (error) {
      console.error('Failed to track analytics event:', error);
    }
  } catch (err) {
    console.error('Analytics tracking failed:', err);
  }
}

export async function trackWorkOrderEvent(
  tenantId: string,
  workOrderId: string,
  eventType: 'created' | 'assigned' | 'started' | 'completed' | 'cancelled',
  userId?: string,
  metadata?: Record<string, any>
) {
  await trackEvent({
    tenantId,
    eventType: `work_order.${eventType}`,
    eventCategory: 'operational',
    entityType: 'work_order',
    entityId: workOrderId,
    userId,
    metadata,
  });
}

export async function trackTicketEvent(
  tenantId: string,
  ticketId: string,
  eventType: 'created' | 'converted' | 'resolved' | 'escalated',
  userId?: string,
  metadata?: Record<string, any>
) {
  await trackEvent({
    tenantId,
    eventType: `ticket.${eventType}`,
    eventCategory: 'operational',
    entityType: 'ticket',
    entityId: ticketId,
    userId,
    metadata,
  });
}

export async function trackFinancialEvent(
  tenantId: string,
  eventType: 'invoice_generated' | 'payment_received' | 'penalty_applied',
  entityId: string,
  amount: number,
  userId?: string,
  metadata?: Record<string, any>
) {
  await trackEvent({
    tenantId,
    eventType: `financial.${eventType}`,
    eventCategory: 'financial',
    entityType: eventType.split('_')[0],
    entityId,
    userId,
    metadata: { ...metadata, amount },
  });
}

export async function trackSecurityEvent(
  tenantId: string,
  eventType: 'login_failure' | 'privilege_escalation' | 'data_export' | 'mfa_bypass_attempt',
  userId?: string,
  metadata?: Record<string, any>
) {
  await trackEvent({
    tenantId,
    eventType: `security.${eventType}`,
    eventCategory: 'security',
    userId,
    metadata,
  });
}
