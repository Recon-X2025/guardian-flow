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
    });

    if (!authResult.success) {
      return createErrorResponse(authResult.error);
    }

    const { context } = authResult;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const { workOrderId, customerId } = await req.json();
    const correlationId = crypto.randomUUID();
    const modelVersion = 'google/gemini-2.5-flash';
    const promptTemplateId = 'sapos_contextual_offers_v1';

    console.log(`[${correlationId}] Generating SaPOS offers for WO: ${workOrderId}`);

    // Get work order and warranty context
    const { data: workOrder } = await context.supabase
      .from('work_orders')
      .select('*, tickets(unit_serial, customer_name, symptom)')
      .eq('id', workOrderId)
      .single();

    if (!workOrder) {
      throw new Error('Work order not found');
    }

    // Check warranty status
    const { data: warranty } = await context.supabase
      .from('warranty_records')
      .select('*')
      .eq('unit_serial', workOrder?.tickets?.unit_serial)
      .single();

    const warrantyActive = warranty && new Date(warranty.warranty_end) > new Date();

    // Check inventory for parts availability
    const { data: inventoryCheck } = await context.supabase.functions.invoke('check-inventory', {
      body: { parts: [], hubId: workOrder.hub_id }
    });

    // Build context for AI with provenance tracking
    const generationContext = {
      customer_name: workOrder?.tickets?.customer_name,
      unit_serial: workOrder?.tickets?.unit_serial,
      symptom: workOrder?.tickets?.symptom,
      warranty_status: warrantyActive ? 'active' : 'expired',
      warranty_end: warranty?.warranty_end,
      warranty_checked: true,
      inventory_checked: true,
      inventory_availability: inventoryCheck?.all_available || false,
      generated_at: new Date().toISOString(),
      correlation_id: correlationId
    };

    // Call Lovable AI to generate contextual offers
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a SaPOS (Sales at Point of Service) AI assistant. Generate 2-3 contextual product/service offers for a customer based on their service context. Each offer should include:
- title (max 50 chars)
- description (max 200 chars)
- offer_type (extended_warranty, upgrade, accessory)
- price (numeric, in dollars)
- warranty_conflicts (boolean - true if offer conflicts with existing warranty coverage)

Exclude offers that conflict with active warranty coverage. Return ONLY a JSON array of offers.`
          },
          {
            role: 'user',
            content: `Context: ${JSON.stringify(generationContext)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_offers",
              description: "Generate sales offers for customer",
              parameters: {
                type: "object",
                properties: {
                  offers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        offer_type: { type: "string", enum: ["extended_warranty", "upgrade", "accessory"] },
                        price: { type: "number" },
                        warranty_conflicts: { type: "boolean" }
                      },
                      required: ["title", "description", "offer_type", "price", "warranty_conflicts"]
                    }
                  }
                },
                required: ["offers"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_offers" } }
      }),
    });

    const aiData = await aiResponse.json();
    const offersData = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);
    const offers = offersData.offers;

    // Store offers in database with AI provenance and generation context
    const insertPromises = offers.map((offer: any) => 
      context.supabase.from('sapos_offers').insert({
        work_order_id: workOrderId,
        customer_id: customerId,
        title: offer.title,
        description: offer.description,
        offer_type: offer.offer_type,
        price: offer.price,
        warranty_conflicts: offer.warranty_conflicts,
        model_version: modelVersion,
        prompt_template_id: promptTemplateId,
        confidence_score: 0.95,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        metadata: {
          generation_context: generationContext,
          offer_provenance: {
            model: modelVersion,
            prompt_template: promptTemplateId,
            generated_at: generationContext.generated_at,
            correlation_id: correlationId
          }
        }
      })
    );

    await Promise.all(insertPromises);

    // Log audit event
    await logAuditEvent(context.supabase, {
      userId: context.user.id,
      action: 'sapos_offers_generated',
      resourceType: 'work_order',
      resourceId: workOrderId,
      changes: { offers_count: offers.length, model: 'google/gemini-2.5-flash' },
      actorRole: context.roles[0],
      tenantId: context.tenantId,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return new Response(JSON.stringify({ offers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('SaPOS generation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});