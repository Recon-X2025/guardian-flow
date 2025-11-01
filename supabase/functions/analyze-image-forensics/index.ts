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
    const { filePath, fileName } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Download the image
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("document-templates")
      .download(filePath);

    if (downloadError) throw downloadError;

    // Convert to base64 for AI analysis
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Call Lovable AI for image analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `You are an expert image forensics analyst. Analyze images for signs of tampering, forgery, or manipulation. 
            Look for: copy-move forgery, splicing, retouching, inconsistent lighting/shadows, JPEG artifacts, noise inconsistencies, 
            metadata anomalies, and other manipulation indicators. Provide detailed findings with confidence scores.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image for authenticity. Detect any signs of forgery, tampering, or manipulation."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_forensics_analysis",
              description: "Report detailed forensics analysis of an image",
              parameters: {
                type: "object",
                properties: {
                  verdict: {
                    type: "string",
                    enum: ["authentic", "suspicious", "forged"],
                    description: "Overall verdict on image authenticity"
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score 0-100",
                    minimum: 0,
                    maximum: 100
                  },
                  findings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          description: "Type of finding (e.g., 'Copy-Move Forgery', 'Splicing', 'Metadata Inconsistency')"
                        },
                        severity: {
                          type: "string",
                          enum: ["low", "medium", "high", "critical"]
                        },
                        description: {
                          type: "string",
                          description: "Detailed description of the finding"
                        },
                        location: {
                          type: "object",
                          properties: {
                            x: { type: "number" },
                            y: { type: "number" }
                          }
                        }
                      },
                      required: ["type", "severity", "description"]
                    }
                  },
                  metadata: {
                    type: "object",
                    properties: {
                      timestamp: { type: "string" },
                      gps: {
                        type: "object",
                        properties: {
                          lat: { type: "number" },
                          lng: { type: "number" }
                        }
                      },
                      camera: { type: "string" },
                      software: { type: "string" }
                    }
                  }
                },
                required: ["verdict", "confidence", "findings"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "report_forensics_analysis" } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No analysis result from AI");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Store analysis in database
    const imageId = crypto.randomUUID();
    const { error: insertError } = await supabaseAdmin
      .from("image_forensics_analysis")
      .insert({
        id: imageId,
        file_path: filePath,
        file_name: fileName,
        verdict: analysis.verdict,
        confidence_score: analysis.confidence,
        findings: analysis.findings,
        metadata: analysis.metadata,
        analyzed_at: new Date().toISOString()
      });

    if (insertError) {
      console.error("Error storing analysis:", insertError);
    }

    const result = {
      imageId,
      fileName,
      verdict: analysis.verdict,
      confidence: analysis.confidence,
      findings: analysis.findings,
      metadata: analysis.metadata || {}
    };

    console.log(`Forensics analysis complete for ${fileName}: ${analysis.verdict} (${analysis.confidence}%)`);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Forensics analysis error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
