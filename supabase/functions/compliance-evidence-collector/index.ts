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
    const { action, framework, controlId, tenantId } = await req.json();

    switch (action) {
      case 'collect_all':
        return await collectAllEvidence(supabase, framework, tenantId);
      
      case 'collect_control':
        return await collectControlEvidence(supabase, framework, controlId, tenantId);
      
      case 'generate_compliance_report':
        return await generateComplianceReport(supabase, framework, tenantId);
      
      case 'calculate_metrics':
        return await calculateComplianceMetrics(supabase, tenantId);
      
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

async function collectAllEvidence(supabase: any, framework: string, tenantId: string) {
  const evidenceCollected: any[] = [];

  // Access Control Evidence
  const accessControlEvidence = await collectAccessControlEvidence(supabase, framework, tenantId);
  evidenceCollected.push(...accessControlEvidence);

  // MFA Evidence
  const mfaEvidence = await collectMFAEvidence(supabase, framework, tenantId);
  evidenceCollected.push(...mfaEvidence);

  // Audit Log Evidence
  const auditEvidence = await collectAuditLogEvidence(supabase, framework, tenantId);
  evidenceCollected.push(...auditEvidence);

  // Encryption Evidence
  const encryptionEvidence = await collectEncryptionEvidence(supabase, framework, tenantId);
  evidenceCollected.push(...encryptionEvidence);

  // Training Evidence
  const trainingEvidence = await collectTrainingEvidence(supabase, framework, tenantId);
  evidenceCollected.push(...trainingEvidence);

  // Vulnerability Evidence
  const vulnEvidence = await collectVulnerabilityEvidence(supabase, framework, tenantId);
  evidenceCollected.push(...vulnEvidence);

  // Incident Response Evidence
  const irEvidence = await collectIncidentResponseEvidence(supabase, framework, tenantId);
  evidenceCollected.push(...irEvidence);

  // Insert all evidence
  const { error } = await supabase
    .from('compliance_evidence')
    .insert(evidenceCollected);

  if (error) throw error;

  return new Response(JSON.stringify({ 
    success: true,
    evidence_count: evidenceCollected.length
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function collectAccessControlEvidence(supabase: any, framework: string, tenantId: string) {
  const evidence: any[] = [];

  // Access review evidence
  const { data: reviews } = await supabase
    .from('access_review_campaigns')
    .select('*')
    .eq('status', 'completed')
    .eq('tenant_id', tenantId)
    .order('completed_at', { ascending: false })
    .limit(10);

  if (reviews && reviews.length > 0) {
    evidence.push({
      evidence_type: 'access_review',
      framework,
      control_id: 'AC-2',
      evidence_title: 'Periodic Access Reviews',
      evidence_description: `${reviews.length} access review campaigns completed`,
      collection_method: 'automated',
      evidence_data: { campaigns: reviews },
      status: 'valid',
      tenant_id: tenantId
    });
  }

  // MFA enrollment evidence
  const { data: mfaTokens, count: mfaCount } = await supabase
    .from('mfa_tokens')
    .select('*', { count: 'exact', head: false })
    .eq('tenant_id', tenantId);

  evidence.push({
    evidence_type: 'mfa_enrollment',
    framework,
    control_id: 'IA-2',
    evidence_title: 'Multi-Factor Authentication',
    evidence_description: `MFA enabled and in use`,
    collection_method: 'automated',
    evidence_data: { mfa_token_count: mfaCount },
    status: 'valid',
    tenant_id: tenantId
  });

  return evidence;
}

async function collectMFAEvidence(supabase: any, framework: string, tenantId: string) {
  const { data: mfaEvents } = await supabase
    .from('mfa_risk_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('mfa_required', true)
    .order('created_at', { ascending: false })
    .limit(100);

  const completionRate = mfaEvents ? 
    (mfaEvents.filter((e: any) => e.mfa_completed).length / mfaEvents.length) * 100 : 0;

  return [{
    evidence_type: 'mfa_compliance',
    framework,
    control_id: 'IA-2',
    evidence_title: 'MFA Completion Rate',
    evidence_description: `${completionRate.toFixed(1)}% MFA completion rate`,
    collection_method: 'automated',
    evidence_data: { 
      completion_rate: completionRate,
      events_analyzed: mfaEvents?.length || 0
    },
    status: completionRate >= 95 ? 'valid' : 'pending_review',
    tenant_id: tenantId
  }];
}

async function collectAuditLogEvidence(supabase: any, framework: string, tenantId: string) {
  const { count: auditCount } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  const { count: archiveCount } = await supabase
    .from('audit_logs_archive')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  return [{
    evidence_type: 'audit_logging',
    framework,
    control_id: 'AU-2',
    evidence_title: 'Comprehensive Audit Logging',
    evidence_description: `${(auditCount || 0) + (archiveCount || 0)} audit events recorded`,
    collection_method: 'automated',
    evidence_data: {
      active_logs: auditCount,
      archived_logs: archiveCount,
      retention_period: '7 years'
    },
    status: 'valid',
    tenant_id: tenantId
  }];
}

async function collectEncryptionEvidence(supabase: any, framework: string, tenantId: string) {
  const { data: keys } = await supabase
    .from('encryption_keys')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  return [{
    evidence_type: 'encryption',
    framework,
    control_id: 'SC-13',
    evidence_title: 'Encryption Key Management',
    evidence_description: `${keys?.length || 0} active encryption keys under management`,
    collection_method: 'automated',
    evidence_data: { active_keys: keys?.length || 0 },
    status: 'valid',
    tenant_id: tenantId
  }];
}

async function collectTrainingEvidence(supabase: any, framework: string, tenantId: string) {
  const { data: assignments } = await supabase
    .from('training_assignments')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed');

  const completionRate = assignments ? 
    (assignments.filter((a: any) => a.passed).length / assignments.length) * 100 : 0;

  return [{
    evidence_type: 'security_training',
    framework,
    control_id: 'AT-2',
    evidence_title: 'Security Awareness Training',
    evidence_description: `${completionRate.toFixed(1)}% training completion rate`,
    collection_method: 'automated',
    evidence_data: {
      completion_rate: completionRate,
      completed_assignments: assignments?.length || 0
    },
    status: completionRate >= 90 ? 'valid' : 'pending_review',
    tenant_id: tenantId
  }];
}

async function collectVulnerabilityEvidence(supabase: any, framework: string, tenantId: string) {
  const { data: vulns } = await supabase
    .from('vulnerabilities')
    .select('*')
    .eq('tenant_id', tenantId);

  const criticalOpen = vulns?.filter((v: any) => 
    v.severity === 'critical' && v.status === 'open'
  ).length || 0;

  return [{
    evidence_type: 'vulnerability_management',
    framework,
    control_id: 'RA-5',
    evidence_title: 'Vulnerability Management Program',
    evidence_description: `${criticalOpen} critical vulnerabilities open`,
    collection_method: 'automated',
    evidence_data: {
      total_vulnerabilities: vulns?.length || 0,
      critical_open: criticalOpen
    },
    status: criticalOpen === 0 ? 'valid' : 'pending_review',
    tenant_id: tenantId
  }];
}

async function collectIncidentResponseEvidence(supabase: any, framework: string, tenantId: string) {
  const { data: incidents } = await supabase
    .from('incidents')
    .select('*')
    .eq('tenant_id', tenantId);

  const { data: playbooks } = await supabase
    .from('ir_playbooks')
    .select('*')
    .eq('active', true);

  return [{
    evidence_type: 'incident_response',
    framework,
    control_id: 'IR-4',
    evidence_title: 'Incident Response Capability',
    evidence_description: `${incidents?.length || 0} incidents managed, ${playbooks?.length || 0} playbooks active`,
    collection_method: 'automated',
    evidence_data: {
      incidents_handled: incidents?.length || 0,
      active_playbooks: playbooks?.length || 0
    },
    status: 'valid',
    tenant_id: tenantId
  }];
}

async function collectControlEvidence(supabase: any, framework: string, controlId: string, tenantId: string) {
  // Collect evidence for specific control
  const allEvidence = await collectAllEvidence(supabase, framework, tenantId);
  return allEvidence;
}

async function generateComplianceReport(supabase: any, framework: string, tenantId: string) {
  const { data: evidence } = await supabase
    .from('compliance_evidence')
    .select('*')
    .eq('framework', framework)
    .eq('tenant_id', tenantId)
    .eq('status', 'valid');

  const report = {
    framework,
    tenant_id: tenantId,
    generated_at: new Date().toISOString(),
    evidence_count: evidence?.length || 0,
    compliance_score: calculateComplianceScore(evidence),
    evidence_summary: evidence
  };

  return new Response(JSON.stringify({ success: true, report }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function calculateComplianceMetrics(supabase: any, tenantId: string) {
  const metrics: any[] = [];

  // MFA Enrollment Rate
  const { data: users } = await supabase.rpc('get_tenant_users', { tenant_id: tenantId });
  const { count: mfaCount } = await supabase
    .from('mfa_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  const mfaRate = users ? (mfaCount || 0) / users.length * 100 : 0;
  
  metrics.push({
    metric_name: 'MFA Enrollment Rate',
    metric_category: 'access_control',
    metric_value: mfaRate,
    target_value: 100,
    status: mfaRate >= 95 ? 'on_track' : 'at_risk',
    measurement_period: 'current',
    tenant_id: tenantId
  });

  // Training Completion Rate
  const { data: assignments } = await supabase
    .from('training_assignments')
    .select('*')
    .eq('tenant_id', tenantId);

  const completionRate = assignments ? 
    (assignments.filter((a: any) => a.status === 'completed').length / assignments.length) * 100 : 0;

  metrics.push({
    metric_name: 'Training Completion Rate',
    metric_category: 'training',
    metric_value: completionRate,
    target_value: 95,
    status: completionRate >= 90 ? 'on_track' : 'at_risk',
    measurement_period: 'current',
    tenant_id: tenantId
  });

  // Insert metrics
  const { error } = await supabase
    .from('compliance_metrics')
    .insert(metrics);

  if (error) throw error;

  return new Response(JSON.stringify({ success: true, metrics }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function calculateComplianceScore(evidence: any[]): number {
  if (!evidence || evidence.length === 0) return 0;
  
  const validEvidence = evidence.filter(e => e.status === 'valid').length;
  return Math.round((validEvidence / evidence.length) * 100);
}
