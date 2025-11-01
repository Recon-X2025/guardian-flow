import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Critical events that should always be forwarded to SIEM
const CRITICAL_EVENTS = [
  'privilege_elevated',
  'role_assigned',
  'role_revoked',
  'mfa_failed',
  'unauthorized_access_attempt',
  'data_export',
  'policy_violation',
  'security_incident',
  'user_deleted',
  'tenant_deleted'
];

interface SIEMEvent {
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  event_type: string;
  user_id: string;
  tenant_id?: string;
  details: Record<string, any>;
  source: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { action, provider, config } = await req.json();

    switch (action) {
      case 'forward_recent_events':
        return await forwardRecentEvents(supabase, provider, config);
      
      case 'forward_event':
        const { event } = await req.json();
        return await forwardSingleEvent(supabase, event, provider, config);
      
      case 'test_connection':
        return await testSIEMConnection(provider, config);
      
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

async function forwardRecentEvents(supabase: any, provider: string, config: any) {
  // Get audit logs from last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data: auditLogs, error: auditError } = await supabase
    .from('audit_logs')
    .select('*')
    .gt('created_at', oneHourAgo)
    .in('action', CRITICAL_EVENTS);

  if (auditError) throw auditError;

  // Get security events from last hour
  const { data: securityEvents, error: secError } = await supabase
    .from('security_events')
    .select('*')
    .gt('created_at', oneHourAgo);

  if (secError) throw secError;

  const allEvents: SIEMEvent[] = [
    ...auditLogs.map(log => convertAuditLogToSIEM(log)),
    ...securityEvents.map(event => convertSecurityEventToSIEM(event))
  ];

  let successCount = 0;
  let failCount = 0;

  for (const event of allEvents) {
    try {
      await sendToSIEM(provider, config, event);
      
      // Log successful forwarding
      await supabase
        .from('siem_forwarding_log')
        .insert({
          audit_log_id: event.details.original_id,
          siem_provider: provider,
          response_status: 200
        });
      
      successCount++;
    } catch (error: any) {
      console.error('Failed to forward event:', error);
      
      await supabase
        .from('siem_forwarding_log')
        .insert({
          audit_log_id: event.details.original_id,
          siem_provider: provider,
          response_status: 500,
          error_message: error.message,
          retry_count: 1
        });
      
      failCount++;
    }
  }

  return new Response(JSON.stringify({ 
    success: true,
    events_processed: allEvents.length,
    forwarded: successCount,
    failed: failCount
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function forwardSingleEvent(supabase: any, event: any, provider: string, config: any) {
  const siemEvent = convertAuditLogToSIEM(event);
  
  try {
    await sendToSIEM(provider, config, siemEvent);
    
    await supabase
      .from('siem_forwarding_log')
      .insert({
        audit_log_id: event.id,
        siem_provider: provider,
        response_status: 200
      });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    await supabase
      .from('siem_forwarding_log')
      .insert({
        audit_log_id: event.id,
        siem_provider: provider,
        response_status: 500,
        error_message: error.message
      });

    throw error;
  }
}

async function sendToSIEM(provider: string, config: any, event: SIEMEvent) {
  switch (provider) {
    case 'datadog':
      return await sendToDatadog(config, event);
    case 'splunk':
      return await sendToSplunk(config, event);
    case 'azure_sentinel':
      return await sendToAzureSentinel(config, event);
    default:
      throw new Error(`Unsupported SIEM provider: ${provider}`);
  }
}

async function sendToDatadog(config: any, event: SIEMEvent) {
  const { api_key, site } = config;
  
  const response = await fetch(`https://http-intake.logs.${site}/api/v2/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': api_key
    },
    body: JSON.stringify({
      ddsource: 'guardian-flow',
      ddtags: `severity:${event.severity},event_type:${event.event_type}`,
      hostname: 'guardian-flow-paas',
      message: JSON.stringify(event.details),
      service: 'compliance',
      timestamp: new Date(event.timestamp).getTime()
    })
  });

  if (!response.ok) {
    throw new Error(`Datadog API error: ${response.statusText}`);
  }
}

async function sendToSplunk(config: any, event: SIEMEvent) {
  const { hec_token, hec_url } = config;
  
  const response = await fetch(hec_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Splunk ${hec_token}`
    },
    body: JSON.stringify({
      time: new Date(event.timestamp).getTime() / 1000,
      host: 'guardian-flow',
      source: 'compliance-audit',
      sourcetype: 'guardian:security',
      event: event
    })
  });

  if (!response.ok) {
    throw new Error(`Splunk HEC error: ${response.statusText}`);
  }
}

async function sendToAzureSentinel(config: any, event: SIEMEvent) {
  const { workspace_id, shared_key, log_type } = config;
  
  // Azure Sentinel requires HMAC-SHA256 authentication
  // This is a simplified version - production would need proper HMAC implementation
  const response = await fetch(
    `https://${workspace_id}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Log-Type': log_type || 'GuardianFlowAudit',
        'x-ms-date': new Date().toUTCString()
      },
      body: JSON.stringify([event])
    }
  );

  if (!response.ok) {
    throw new Error(`Azure Sentinel error: ${response.statusText}`);
  }
}

async function testSIEMConnection(provider: string, config: any) {
  const testEvent: SIEMEvent = {
    timestamp: new Date().toISOString(),
    severity: 'low',
    event_type: 'connection_test',
    user_id: 'system',
    details: {
      message: 'SIEM connection test',
      provider
    },
    source: 'guardian-flow-test'
  };

  try {
    await sendToSIEM(provider, config, testEvent);
    return new Response(JSON.stringify({ success: true, message: 'Connection successful' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

function convertAuditLogToSIEM(log: any): SIEMEvent {
  const severity = determineSeverity(log.action, log.mfa_verified);
  
  return {
    timestamp: log.created_at,
    severity,
    event_type: log.action,
    user_id: log.user_id,
    tenant_id: log.tenant_id,
    details: {
      original_id: log.id,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      changes: log.changes,
      actor_role: log.actor_role,
      mfa_verified: log.mfa_verified,
      ip_address: log.ip_address,
      correlation_id: log.correlation_id
    },
    source: 'audit_log'
  };
}

function convertSecurityEventToSIEM(event: any): SIEMEvent {
  return {
    timestamp: event.created_at,
    severity: event.severity,
    event_type: event.event_type,
    user_id: event.user_id || 'system',
    tenant_id: event.tenant_id,
    details: {
      original_id: event.id,
      ...event.details
    },
    source: 'security_event'
  };
}

function determineSeverity(action: string, mfaVerified: boolean): 'low' | 'medium' | 'high' | 'critical' {
  if (CRITICAL_EVENTS.includes(action)) {
    return mfaVerified ? 'high' : 'critical';
  }
  
  if (action.includes('delete') || action.includes('revoke')) {
    return 'medium';
  }
  
  return 'low';
}
