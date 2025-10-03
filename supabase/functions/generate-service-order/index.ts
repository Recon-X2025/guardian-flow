import { validateAuth, createErrorResponse, logAuditEvent } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default SO template (Handlebars syntax)
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
    <h1>Service Order: {{so_number}}</h1>
    <p>Work Order: {{wo_number}}</p>
    <p>Date: {{created_at}}</p>
  </div>

  <div class="section">
    <h3>Unit Information</h3>
    <p><strong>Serial Number:</strong> {{unit_serial}}</p>
    <p><strong>Customer:</strong> {{customer_name}}</p>
    <p><strong>Symptom:</strong> {{symptom}}</p>
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

  try {
    const authResult = await validateAuth(req, {
      requiredPermissions: ['service_orders.generate'],
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;
    const { workOrderId, templateId } = await req.json();

    // Get work order with all related data
    const { data: workOrder } = await context.supabase
      .from('work_orders')
      .select(`
        *,
        tickets(unit_serial, customer_name, symptom),
        work_order_prechecks(warranty_result)
      `)
      .eq('id', workOrderId)
      .single();

    if (!workOrder) throw new Error('Work order not found');

    // Get template (custom or default)
    let templateContent = DEFAULT_TEMPLATE;
    if (templateId) {
      const { data: template } = await context.supabase
        .from('service_order_templates')
        .select('template_content')
        .eq('id', templateId)
        .single();
      if (template) templateContent = template.template_content;
    }

    // Prepare rendering data
    const warrantyResult = workOrder.work_order_prechecks?.[0]?.warranty_result || {};
    const soNumber = `SO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

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
      technician_name: 'Technician Name', // TODO: get from user profile
      qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${workOrderId}`
    };

    // Simple template rendering (replace {{var}} with values)
    let htmlContent = templateContent;
    Object.entries(renderData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      htmlContent = htmlContent.replace(regex, String(value));
    });

    // Handle conditionals and loops (basic implementation)
    htmlContent = htmlContent.replace(/{{#if warranty_covered}}.*?{{\/if}}/gs, 
      warrantyResult.covered ? warrantyResult.warranty_end ? `Coverage Ends: ${warrantyResult.warranty_end}` : '' : '');

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

    if (soError) throw soError;

    // Log audit event
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: 'service_order_generated',
      resourceType: 'service_order',
      resourceId: serviceOrder.id,
      changes: { so_number: soNumber, work_order_id: workOrderId },
      actorRole: context.roles[0],
      tenantId: context.tenantId,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return new Response(JSON.stringify({ serviceOrder, html: htmlContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Service order generation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});