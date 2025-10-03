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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { workOrderId, customerId } = await req.json();

    // Get work order and warranty context
    const { data: workOrder } = await supabase
      .from('work_orders')
      .select('*, tickets(unit_serial, customer_name)')
      .eq('id', workOrderId)
      .single();

    const { data: warranty } = await supabase
      .from('warranty_records')
      .select('*')
      .eq('unit_serial', workOrder?.tickets?.unit_serial)
      .single();

    // Build context for AI
    const context = {
      customer_name: workOrder?.tickets?.customer_name,
      unit_serial: workOrder?.tickets?.unit_serial,
      warranty_status: warranty ? 'active' : 'expired',
      warranty_end: warranty?.warranty_end,
      current_service: workOrder?.tickets?.symptom
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
            content: `Context: ${JSON.stringify(context)}`
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

    // Store offers in database with AI provenance
    const insertPromises = offers.map((offer: any) => 
      supabase.from('sapos_offers').insert({
        work_order_id: workOrderId,
        customer_id: customerId,
        title: offer.title,
        description: offer.description,
        offer_type: offer.offer_type,
        price: offer.price,
        warranty_conflicts: offer.warranty_conflicts,
        model_version: 'google/gemini-2.5-flash',
        prompt_template_id: 'sapos_v1',
        confidence_score: 0.95,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
    );

    await Promise.all(insertPromises);

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'sapos_offers_generated',
      resource_type: 'work_order',
      resource_id: workOrderId,
      changes: { offers_count: offers.length, model: 'google/gemini-2.5-flash' },
      correlation_id: crypto.randomUUID()
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