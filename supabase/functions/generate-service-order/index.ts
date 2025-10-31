import { validateAuth, createErrorResponse, logAuditEvent } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default SO template for PC & Print field service
const DEFAULT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <title>Service Order {{so_number}}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { border-bottom: 2px solid #333; padding-bottom: 20px; }
    .section { margin: 20px 0; }
    .parts-table { width: 100%; border-collapse: collapse; }
    .parts-table th, .parts-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .signature-box { border: 1px solid #000; height: 60px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PC & Print Service Order: {{so_number}}</h1>
    <p>Work Order: {{wo_number}}</p>
    <p>Date: {{created_at}}</p>
  </div>

  <div class="section">
    <h3>Device Information</h3>
    <p><strong>Serial Number:</strong> {{unit_serial}}</p>
    <p><strong>Customer:</strong> {{customer_name}}</p>
    <p><strong>Issue Reported:</strong> {{symptom}}</p>
  </div>

  <div class="section">
    <h3>Warranty Status</h3>
    <p><strong>Status:</strong> {{#if warranty_covered}}COVERED{{else}}NOT COVERED{{/if}}</p>
    {{#if warranty_covered}}
      <p><strong>Coverage Ends:</strong> {{warranty_end}}</p>
    {{/if}}
  </div>

  <div class="section">
    <h3>Parts & Services</h3>
    <table class="parts-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Warranty Covered</th>
          <th>Customer Charge</th>
        </tr>
      </thead>
      <tbody>
        {{#each parts}}
        <tr>
          <td>{{this.description}}</td>
          <td>{{#if this.covered}}YES{{else}}NO{{/if}}</td>
          <td>\${{this.customer_charge}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    <p><strong>Total Customer Charge:</strong> \${{total_cost}}</p>
  </div>

  <div class="section">
    <h3>Technician Signature</h3>
    <div class="signature-box"></div>
    <p>Name: {{technician_name}}</p>
  </div>

  <div class="section">
    <h3>Customer Signature</h3>
    <div class="signature-box"></div>
    <p>I acknowledge the service was completed satisfactorily.</p>
  </div>

  <div class="section">
    <p><strong>Photo Evidence:</strong> Scan QR code to view attached photos</p>
    <img src="{{qr_code_url}}" alt="QR Code" />
  </div>
</body>
</html>
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID();
  console.log(`[${correlationId}] generate-service-order: Request started`);

  try {
    const authResult = await validateAuth(req, {
      requireAuth: true,
    });

    if (!authResult.success) {
      console.error(`[${correlationId}] Auth failed:`, authResult.error);
      return createErrorResponse(authResult.error, 401);
    }

    const { context } = authResult;
    const requestBody = await req.json();
    const { workOrderId, templateId } = requestBody;

    // Helper to get technician name
    async function getTechnicianName(technicianId: string): Promise<string> {
      if (!technicianId) return 'Unassigned';
      
      const { data: tech } = await context.supabase
        .from('technicians')
        .select('first_name, last_name')
        .eq('user_id', technicianId)
        .single();
      
      if (tech) {
        return `${tech.first_name} ${tech.last_name}`;
      }
      
      // Fallback to profile
      const { data: profile } = await context.supabase
        .from('profiles')
        .select('full_name')
        .eq('id', technicianId)
        .single();
      
      return profile?.full_name || 'Technician';
    }

    if (!workOrderId) {
      console.error(`[${correlationId}] Missing workOrderId`);
      return new Response(
        JSON.stringify({
          code: 'validation_error',
          message: 'workOrderId is required',
          correlationId,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${correlationId}] Fetching work order: ${workOrderId}`);

    // Get work order with all related data
    const { data: workOrder, error: woError } = await context.supabase
      .from('work_orders')
      .select(`
        *,
        tickets(unit_serial, customer_name, symptom),
        work_order_prechecks(warranty_result)
      `)
      .eq('id', workOrderId)
      .single();

    if (woError || !workOrder) {
      console.error(`[${correlationId}] Work order fetch error:`, woError);
      return new Response(
        JSON.stringify({
          code: 'not_found',
          message: `Work order not found: ${woError?.message || 'Unknown error'}`,
          correlationId,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${correlationId}] Work order found: ${workOrder.wo_number}`);

    // Get template (custom or default)
    let templateContent = DEFAULT_TEMPLATE;
    if (templateId) {
      console.log(`[${correlationId}] Fetching custom template: ${templateId}`);
      const { data: template, error: templateError } = await context.supabase
        .from('service_order_templates')
        .select('template_content')
        .eq('id', templateId)
        .single();
      
      if (templateError) {
        console.error(`[${correlationId}] Template fetch error:`, templateError);
        return new Response(
          JSON.stringify({
            code: 'template_not_found',
            message: `Template not found: ${templateError.message}`,
            details: { templateId },
            correlationId,
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (template) {
        templateContent = template.template_content;
        console.log(`[${correlationId}] Custom template loaded`);
      }
    } else {
      console.log(`[${correlationId}] Using default PC & Print template`);
    }

    // Prepare rendering data
    const warrantyResult = workOrder.work_order_prechecks?.[0]?.warranty_result || {};
    const year = new Date().getFullYear();
    const { count } = await context.supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true });
    
    const soNumber = `SO-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
    console.log(`[${correlationId}] Generated SO number: ${soNumber}`);

    const renderData = {
      so_number: soNumber,
      wo_number: workOrder.wo_number,
      created_at: new Date().toISOString().split('T')[0],
      unit_serial: workOrder.tickets?.unit_serial,
      customer_name: workOrder.tickets?.customer_name,
      symptom: workOrder.tickets?.symptom,
      warranty_covered: warrantyResult.covered || false,
      warranty_end: warrantyResult.warranty_end,
      parts: warrantyResult.parts_coverage || [],
      total_cost: workOrder.cost_to_customer,
      technician_name: await getTechnicianName(workOrder.technician_id),
      qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${workOrderId}`
    };

    // Simple template rendering (replace {{var}} with values)
    let htmlContent = templateContent;
    Object.entries(renderData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      htmlContent = htmlContent.replace(regex, String(value));
    });

    // Handle conditionals (basic implementation)
    htmlContent = htmlContent.replace(/{{#if warranty_covered}}.*?{{\/if}}/gs, 
      warrantyResult.covered ? warrantyResult.warranty_end ? `Coverage Ends: ${warrantyResult.warranty_end}` : '' : '');

    console.log(`[${correlationId}] Creating service order record`);

    // Store service order
    const { data: serviceOrder, error: soError } = await context.supabase
      .from('service_orders')
      .insert({
        work_order_id: workOrderId,
        so_number: soNumber,
        template_id: templateId,
        html_content: htmlContent,
        rendered_data: renderData,
        qr_code_url: renderData.qr_code_url
      })
      .select()
      .single();

    if (soError) {
      console.error(`[${correlationId}] Service order creation error:`, soError);
      return new Response(
        JSON.stringify({
          code: 'creation_failed',
          message: `Failed to create service order: ${soError.message}`,
          correlationId,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${correlationId}] Service order created successfully: ${serviceOrder.id}`);

    // Log audit event
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: 'service_order_generated',
      resourceType: 'service_order',
      resourceId: serviceOrder.id,
      changes: { so_number: soNumber, work_order_id: workOrderId },
      actorRole: context.roles[0],
      tenantId: context.tenantId,
      correlationId,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    console.log(`[${correlationId}] Returning success response`);

    return new Response(JSON.stringify({ 
      serviceOrder, 
      html: htmlContent,
      correlationId,
      message: 'Service order generated successfully'
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error(`[${correlationId}] Unhandled error in generate-service-order:`, error);
    return new Response(
      JSON.stringify({
        code: 'internal_error',
        message: error.message || 'An unexpected error occurred',
        details: error.stack,
        correlationId,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
