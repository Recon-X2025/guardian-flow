import { validateAuth, createErrorResponse, logAuditEvent } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req, {
      requireAuth: true,
      requiredRoles: ['sys_admin', 'admin']
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;
    const { 
      title, 
      description, 
      severity, 
      incidentType,
      affectedSystems,
      affectedDataTypes,
      affectedUserCount,
      impactAssessment
    } = await req.json();

    console.log('Recording security incident:', { title, severity, incidentType });

    // Validate inputs
    if (!title || !description || !severity || !incidentType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate incident number (format: INC-YYYY-NNNN)
    const year = new Date().getFullYear();
    const { count } = await context.supabase
      .from('security_incidents')
      .select('*', { count: 'exact', head: true })
      .like('incident_number', `INC-${year}-%`);

    const incidentNumber = `INC-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

    // Determine if notification is required based on severity
    const notificationRequired = ['critical', 'high'].includes(severity);
    const regulatoryReportingRequired = severity === 'critical' && (
      affectedDataTypes?.includes('pii') || 
      affectedDataTypes?.includes('financial') ||
      affectedDataTypes?.includes('health')
    );

    // Create security incident record
    const { data: incident, error: incidentError } = await context.supabase
      .from('security_incidents')
      .insert({
        incident_number: incidentNumber,
        title: title,
        description: description,
        severity: severity,
        incident_type: incidentType,
        detected_at: new Date().toISOString(),
        detected_by: context.user.id,
        reported_at: new Date().toISOString(),
        reported_by: context.user.id,
        status: 'detected',
        impact_assessment: impactAssessment || null,
        affected_systems: affectedSystems || [],
        affected_data_types: affectedDataTypes || [],
        affected_user_count: affectedUserCount || null,
        notification_required: notificationRequired,
        regulatory_reporting_required: regulatoryReportingRequired,
        metadata: {
          reported_from_ip: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
          user_agent: req.headers.get('user-agent')
        }
      })
      .select()
      .single();

    if (incidentError) throw incidentError;

    // Log audit event
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: 'security_incident_recorded',
      resourceType: 'security_incident',
      resourceId: incident.id,
      changes: {
        incident_number: incidentNumber,
        title: title,
        severity: severity,
        incident_type: incidentType,
        notification_required: notificationRequired,
        regulatory_reporting_required: regulatoryReportingRequired
      },
      actorRole: context.roles[0],
      tenantId: context.tenantId,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    console.log('Security incident recorded:', incident.incident_number);

    // If critical, could trigger additional notifications here
    if (severity === 'critical') {
      console.log('CRITICAL INCIDENT ALERT:', incidentNumber);
      // TODO: Send alerts to security team via notification service
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        incident: incident,
        incidentNumber: incidentNumber
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error recording security incident:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
