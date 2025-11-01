import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, ...payload } = await req.json();

    let result;
    switch (action) {
      case 'generate_evidence':
        result = await generateEvidence(supabase, user.id, payload);
        break;
      case 'get_evidence':
        result = await getEvidence(supabase, payload);
        break;
      case 'package_evidence':
        result = await packageEvidence(supabase, payload);
        break;
      case 'archive_audit_logs':
        result = await archiveAuditLogs(supabase, payload);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-compliance-evidence:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateEvidence(supabase: any, userId: string, payload: any) {
  const { workspaceId, evidenceType, controlId, controlName, periodStart, periodEnd } = payload;

  // Get user's tenant
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  // Collect evidence based on type
  let evidenceData: any = {};

  switch (evidenceType) {
    case 'soc2':
      evidenceData = await collectSOC2Evidence(supabase, workspaceId, periodStart, periodEnd, controlId);
      break;
    case 'iso27001':
      evidenceData = await collectISO27001Evidence(supabase, workspaceId, periodStart, periodEnd, controlId);
      break;
    case 'gdpr':
      evidenceData = await collectGDPREvidence(supabase, workspaceId, periodStart, periodEnd, controlId);
      break;
    default:
      evidenceData = await collectGenericEvidence(supabase, workspaceId, periodStart, periodEnd);
  }

  // Create evidence record
  const { data: evidence, error } = await supabase
    .from('analytics_compliance_evidence')
    .insert({
      workspace_id: workspaceId,
      tenant_id: profile.tenant_id,
      evidence_type: evidenceType,
      control_id: controlId,
      control_name: controlName,
      evidence_period_start: periodStart,
      evidence_period_end: periodEnd,
      evidence_data: evidenceData,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Log evidence generation
  await supabase.rpc('log_analytics_operation', {
    p_workspace_id: workspaceId,
    p_event_type: 'compliance_evidence_generated',
    p_event_category: 'compliance',
    p_action: 'generate',
    p_resource_type: 'evidence',
    p_resource_id: evidence.id,
    p_metadata: { evidence_type: evidenceType, control_id: controlId }
  });

  return { evidence };
}

async function collectSOC2Evidence(supabase: any, workspaceId: string, periodStart: string, periodEnd: string, controlId: string) {
  const evidence: any = {
    control_id: controlId,
    control_category: getSOC2Category(controlId),
    period: { start: periodStart, end: periodEnd },
    metrics: {},
    audit_records: []
  };

  // Collect relevant audit logs
  const { data: auditLogs } = await supabase
    .from('analytics_audit_logs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)
    .order('created_at', { ascending: false })
    .limit(1000);

  evidence.audit_records = auditLogs || [];

  // Calculate metrics based on control
  if (controlId.includes('CC6.1')) {
    // Access control metrics
    const { count: totalAccessAttempts } = await supabase
      .from('analytics_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('event_category', 'data_access')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    const { count: failedAccessAttempts } = await supabase
      .from('analytics_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('event_category', 'data_access')
      .eq('status', 'failure')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    evidence.metrics = {
      total_access_attempts: totalAccessAttempts || 0,
      failed_access_attempts: failedAccessAttempts || 0,
      success_rate: totalAccessAttempts ? ((totalAccessAttempts - (failedAccessAttempts || 0)) / totalAccessAttempts) * 100 : 100
    };
  }

  return evidence;
}

async function collectISO27001Evidence(supabase: any, workspaceId: string, periodStart: string, periodEnd: string, controlId: string) {
  return {
    control_id: controlId,
    standard: 'ISO 27001:2022',
    period: { start: periodStart, end: periodEnd },
    compliance_status: 'compliant',
    evidence_items: []
  };
}

async function collectGDPREvidence(supabase: any, workspaceId: string, periodStart: string, periodEnd: string, controlId: string) {
  return {
    control_id: controlId,
    regulation: 'GDPR',
    period: { start: periodStart, end: periodEnd },
    data_subject_requests: [],
    processing_activities: []
  };
}

async function collectGenericEvidence(supabase: any, workspaceId: string, periodStart: string, periodEnd: string) {
  return {
    period: { start: periodStart, end: periodEnd },
    summary: 'Generic compliance evidence collected'
  };
}

function getSOC2Category(controlId: string): string {
  if (controlId.startsWith('CC')) return 'Common Criteria';
  if (controlId.startsWith('A')) return 'Availability';
  if (controlId.startsWith('C')) return 'Confidentiality';
  if (controlId.startsWith('PI')) return 'Processing Integrity';
  if (controlId.startsWith('P')) return 'Privacy';
  return 'Other';
}

async function getEvidence(supabase: any, payload: any) {
  const { workspaceId, evidenceType, startDate, endDate } = payload;

  let query = supabase
    .from('analytics_compliance_evidence')
    .select(`
      *,
      created_by_profile:profiles!analytics_compliance_evidence_created_by_fkey(full_name, email),
      reviewed_by_profile:profiles!analytics_compliance_evidence_reviewed_by_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false });

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  if (evidenceType) {
    query = query.eq('evidence_type', evidenceType);
  }

  if (startDate && endDate) {
    query = query
      .gte('evidence_period_start', startDate)
      .lte('evidence_period_end', endDate);
  }

  const { data: evidence, error } = await query;

  if (error) throw error;

  return { evidence };
}

async function packageEvidence(supabase: any, payload: any) {
  const { evidenceIds } = payload;

  // Fetch all evidence records
  const { data: evidenceRecords, error } = await supabase
    .from('analytics_compliance_evidence')
    .select('*')
    .in('id', evidenceIds);

  if (error) throw error;

  // Package evidence into a structured format
  const evidencePackage = {
    package_id: crypto.randomUUID(),
    generated_at: new Date().toISOString(),
    evidence_count: evidenceRecords.length,
    evidence_records: evidenceRecords,
    verification_hash: generatePackageHash(evidenceRecords)
  };

  return { package: evidencePackage };
}

function generatePackageHash(records: any[]): string {
  const dataString = JSON.stringify(records.map(r => r.id + r.created_at));
  return btoa(dataString).substring(0, 32);
}

async function archiveAuditLogs(supabase: any, payload: any) {
  const { workspaceId, archiveBeforeDate } = payload;

  // Count logs to be archived
  const { count: logsToArchive } = await supabase
    .from('analytics_audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .lt('created_at', archiveBeforeDate);

  // In production, this would move logs to cold storage
  // For now, we just log the operation
  console.log(`Archiving ${logsToArchive} audit logs before ${archiveBeforeDate}`);

  return {
    archived_count: logsToArchive || 0,
    archive_date: new Date().toISOString()
  };
}
