import { validateAuth, createErrorResponse } from '../_shared/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to calculate SHA-256 hash
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req, {
      requireAuth: true,
      requiredRoles: ['sys_admin']
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;
    const { daysOld = 90, retentionYears = 7 } = await req.json();

    console.log(`Archiving audit logs older than ${daysOld} days`);

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Calculate retention until date
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + retentionYears);

    // Fetch audit logs older than cutoff that haven't been archived
    const { data: logs, error: fetchError } = await context.supabase
      .from('audit_log')
      .select('*')
      .lt('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: true })
      .limit(1000); // Process in batches

    if (fetchError) throw fetchError;

    if (!logs || logs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No logs to archive',
          archivedCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${logs.length} logs to archive`);

    // Archive logs with hash for tamper detection
    const archiveRecords = await Promise.all(
      logs.map(async (log) => {
        const dataString = JSON.stringify({
          id: log.id,
          user_id: log.user_id,
          action: log.action,
          resource_type: log.resource_type,
          resource_id: log.resource_id,
          changes: log.changes,
          timestamp: log.created_at
        });
        
        const hash = await sha256(dataString);
        
        return {
          original_audit_id: log.id,
          user_id: log.user_id,
          action: log.action,
          resource_type: log.resource_type,
          resource_id: log.resource_id,
          changes: log.changes,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          tenant_id: log.tenant_id,
          retention_until: retentionDate.toISOString(),
          hash: hash,
          metadata: {
            archived_from: 'audit_log',
            original_created_at: log.created_at,
            archived_by: context.user.id
          }
        };
      })
    );

    // Insert into archive table
    const { error: archiveError } = await context.supabase
      .from('audit_logs_archive')
      .insert(archiveRecords);

    if (archiveError) throw archiveError;

    // Note: In production, you might want to delete the original logs after successful archiving
    // For compliance reasons, we're keeping them for now, but marking them as archived could be done

    console.log(`Successfully archived ${logs.length} audit logs`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Archived ${logs.length} audit logs`,
        archivedCount: logs.length,
        retentionUntil: retentionDate.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error archiving audit logs:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

