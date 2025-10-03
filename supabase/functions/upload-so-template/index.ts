import { validateAuth, createErrorResponse, logAuditEvent } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitize Handlebars template to prevent XSS
function sanitizeTemplate(template: string): string {
  // Remove any <script> tags
  const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  let sanitized = template.replace(scriptPattern, '');
  
  // Remove javascript: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove on* event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  return sanitized;
}

// Validate Handlebars placeholders
function validatePlaceholders(template: string): { valid: boolean; invalid: string[] } {
  const placeholderPattern = /\{\{([^}]+)\}\}/g;
  const matches = template.matchAll(placeholderPattern);
  const invalid: string[] = [];
  const allowed = [
    'wo_number', 'customer_name', 'site_address', 'unit_serial',
    'technician_name', 'completed_at', 'symptom', 'work_performed',
    'parts_used', 'warranty_status', 'cost_to_customer', 'created_at'
  ];

  for (const match of matches) {
    const placeholder = match[1].trim();
    // Remove helpers like {{#if}}, {{/if}}, {{#each}}
    const cleanPlaceholder = placeholder.replace(/^[#/]/, '').split(' ')[0];
    if (!allowed.includes(cleanPlaceholder) && !['if', 'unless', 'each', 'with'].includes(cleanPlaceholder)) {
      invalid.push(placeholder);
    }
  }

  return { valid: invalid.length === 0, invalid };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req, {
      requiredPermissions: ['service_orders.manage_templates'],
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;
    const { templateName, templateContent, templateType, oemId, changesSummary } = await req.json();
    const correlationId = crypto.randomUUID();

    console.log(`[${correlationId}] Uploading SO template: ${templateName}`);

    // Sanitize template content
    const sanitized = sanitizeTemplate(templateContent);

    // Validate placeholders
    const validation = validatePlaceholders(sanitized);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: 'Invalid placeholders in template',
          invalid_placeholders: validation.invalid,
          allowed_placeholders: [
            'wo_number', 'customer_name', 'site_address', 'unit_serial',
            'technician_name', 'completed_at', 'symptom', 'work_performed',
            'parts_used', 'warranty_status', 'cost_to_customer', 'created_at'
          ]
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if template with this name exists
    const { data: existing } = await context.supabase
      .from('service_order_templates')
      .select('id')
      .eq('name', templateName)
      .single();

    let templateId: string;
    let version = 1;

    if (existing) {
      templateId = existing.id;
      
      // Get current version number
      const { data: versions } = await context.supabase
        .from('so_template_versions')
        .select('version')
        .eq('template_id', templateId)
        .order('version', { ascending: false })
        .limit(1);

      version = (versions?.[0]?.version || 0) + 1;

      // Deactivate previous versions
      await context.supabase
        .from('so_template_versions')
        .update({ is_active: false })
        .eq('template_id', templateId);

      // Update template metadata
      await context.supabase
        .from('service_order_templates')
        .update({
          template_content: sanitized,
          template_type: templateType || 'handlebars',
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId);
    } else {
      // Create new template
      const { data: newTemplate, error: createError } = await context.supabase
        .from('service_order_templates')
        .insert({
          name: templateName,
          template_content: sanitized,
          template_type: templateType || 'handlebars',
          oem_id: oemId || null,
          active: true,
          is_default: false
        })
        .select()
        .single();

      if (createError) throw createError;
      templateId = newTemplate.id;
    }

    // Create version record
    const { data: versionRecord, error: versionError } = await context.supabase
      .from('so_template_versions')
      .insert({
        template_id: templateId,
        version,
        template_content: sanitized,
        changes_summary: changesSummary || 'Initial version',
        created_by: context.user.id,
        is_active: true
      })
      .select()
      .single();

    if (versionError) throw versionError;

    // Log audit event
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: existing ? 'so_template_updated' : 'so_template_created',
      resourceType: 'service_order_template',
      resourceId: templateId,
      changes: { name: templateName, version, changes_summary: changesSummary },
      actorRole: context.roles[0],
      tenantId: context.tenantId,
      correlationId,
    });

    console.log(`[${correlationId}] Template uploaded successfully. Version: ${version}`);

    return new Response(
      JSON.stringify({
        success: true,
        template_id: templateId,
        version,
        version_id: versionRecord.id,
        sanitized: sanitized !== templateContent,
        validation: validation
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Upload SO template error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
