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
    const { framework } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) throw new Error("Unauthorized");

    // Get tenant
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) throw new Error("No tenant found");

    // Automated evidence collection based on framework
    const evidenceTypes: Record<string, string[]> = {
      SOC2: [
        "Access control logs",
        "Change management records",
        "Security incident reports",
        "Backup verification logs",
        "Vulnerability scan results"
      ],
      ISO27001: [
        "Risk assessment documentation",
        "Asset inventory records",
        "Security policy acknowledgments",
        "Training completion records",
        "Audit logs"
      ],
      HIPAA: [
        "PHI access logs",
        "Encryption verification",
        "Business associate agreements",
        "Breach notification procedures",
        "Security risk analysis"
      ],
      GDPR: [
        "Data processing records",
        "Consent management logs",
        "Data subject access requests",
        "Data retention policy compliance",
        "Cross-border transfer safeguards"
      ]
    };

    const types = evidenceTypes[framework] || evidenceTypes.SOC2;
    const evidenceItems: any[] = [];

    for (const type of types) {
      // Collect evidence from various system tables
      let evidenceData: any = {};

      if (type.includes("log")) {
        const { data: auditData } = await supabaseAdmin
          .from("audit_logs")
          .select("*")
          .eq("tenant_id", profile.tenant_id)
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .limit(100);

        evidenceData = {
          recordCount: auditData?.length || 0,
          sampleRecords: auditData?.slice(0, 5) || []
        };
      }

      const evidenceId = crypto.randomUUID();
      evidenceItems.push({
        id: evidenceId,
        tenant_id: profile.tenant_id,
        framework,
        control_id: `${framework}-AUTO-${types.indexOf(type) + 1}`,
        type,
        description: `Automated collection of ${type} for ${framework} compliance`,
        evidence_data: evidenceData,
        collected_at: new Date().toISOString(),
        collected_by: user.id,
        verified: false
      });
    }

    // Insert collected evidence
    const { error: insertError } = await supabaseAdmin
      .from("compliance_evidence")
      .insert(evidenceItems);

    if (insertError) {
      console.error("Error inserting evidence:", insertError);
      throw insertError;
    }

    // Update control status based on evidence
    for (const item of evidenceItems) {
      await supabaseAdmin
        .from("compliance_controls")
        .update({
          evidence_count: supabaseAdmin.raw('evidence_count + 1'),
          last_reviewed: new Date().toISOString()
        })
        .eq("framework", framework)
        .eq("control_id", item.control_id);
    }

    console.log(`Collected ${evidenceItems.length} evidence items for ${framework}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        evidenceCount: evidenceItems.length,
        framework
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Evidence collection error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
