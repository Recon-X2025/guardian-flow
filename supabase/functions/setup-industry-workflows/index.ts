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
    const { tenantId, industry } = await req.json();

    if (!tenantId || !industry) {
      throw new Error("Missing required parameters");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Industry-specific SLA configurations
    const slaConfigs: Record<string, any> = {
      manufacturing: {
        critical: 4, // hours
        high: 8,
        medium: 24,
        low: 72
      },
      telecom: {
        critical: 2,
        high: 4,
        medium: 12,
        low: 48
      },
      energy: {
        critical: 1,
        high: 4,
        medium: 12,
        low: 48
      },
      retail: {
        critical: 4,
        high: 12,
        medium: 24,
        low: 72
      },
      logistics: {
        critical: 2,
        high: 8,
        medium: 24,
        low: 72
      },
      facility: {
        critical: 4,
        high: 12,
        medium: 48,
        low: 168
      },
      it_services: {
        critical: 2,
        high: 4,
        medium: 24,
        low: 72
      },
      construction: {
        critical: 4,
        high: 24,
        medium: 72,
        low: 168
      },
      healthcare: {
        critical: 1,
        high: 2,
        medium: 8,
        low: 24
      }
    };

    // Industry-specific workflow templates
    const workflowTemplates: Record<string, any[]> = {
      manufacturing: [
        {
          name: "Equipment Breakdown Response",
          steps: ["Assess damage", "Order parts", "Schedule repair", "Execute repair", "Quality check"],
          priority: "critical"
        },
        {
          name: "Preventive Maintenance",
          steps: ["Inspect equipment", "Lubricate components", "Check calibration", "Document findings"],
          priority: "medium"
        }
      ],
      telecom: [
        {
          name: "Network Outage Response",
          steps: ["Identify fault location", "Dispatch technician", "Repair/replace equipment", "Test connectivity", "Restore service"],
          priority: "critical"
        },
        {
          name: "Tower Installation",
          steps: ["Site survey", "Obtain permits", "Foundation work", "Tower assembly", "Equipment installation", "Testing"],
          priority: "high"
        }
      ],
      energy: [
        {
          name: "Power Outage Restoration",
          steps: ["Locate fault", "Isolate section", "Dispatch crew", "Repair damage", "Restore power", "Verify restoration"],
          priority: "critical"
        },
        {
          name: "Substation Maintenance",
          steps: ["De-energize equipment", "Inspect components", "Perform maintenance", "Test equipment", "Re-energize"],
          priority: "high"
        }
      ],
      retail: [
        {
          name: "POS System Failure",
          steps: ["Diagnose issue", "Deploy backup system", "Repair/replace hardware", "Test transaction processing", "Monitor stability"],
          priority: "critical"
        }
      ],
      logistics: [
        {
          name: "Vehicle Breakdown",
          steps: ["Dispatch roadside assistance", "Diagnose problem", "Perform field repair or tow", "Complete repairs", "Return to service"],
          priority: "high"
        }
      ],
      facility: [
        {
          name: "HVAC Failure",
          steps: ["Assess system", "Identify component failure", "Order replacement", "Install component", "Test system"],
          priority: "high"
        }
      ],
      it_services: [
        {
          name: "Critical System Down",
          steps: ["Identify root cause", "Implement workaround", "Fix underlying issue", "Restore service", "Post-incident review"],
          priority: "critical"
        }
      ],
      construction: [
        {
          name: "Equipment Malfunction On-Site",
          steps: ["Stop work safely", "Assess equipment", "Order parts or rental", "Repair or replace", "Resume operations"],
          priority: "high"
        }
      ],
      healthcare: [
        {
          name: "Medical Equipment Failure",
          steps: ["Ensure patient safety", "Deploy backup equipment", "Diagnose issue", "Repair or replace", "Validate functionality", "Resume use"],
          priority: "critical"
        }
      ]
    };

    const slaConfig = slaConfigs[industry] || slaConfigs.manufacturing;
    const templates = workflowTemplates[industry] || workflowTemplates.manufacturing;

    // Insert SLA configuration
    const { error: slaError } = await supabaseAdmin
      .from("tenant_sla_config")
      .upsert({
        tenant_id: tenantId,
        critical_sla_hours: slaConfig.critical,
        high_sla_hours: slaConfig.high,
        medium_sla_hours: slaConfig.medium,
        low_sla_hours: slaConfig.low,
        industry_type: industry
      });

    if (slaError) throw slaError;

    // Insert workflow templates
    for (const template of templates) {
      const { error: templateError } = await supabaseAdmin
        .from("workflow_templates")
        .insert({
          tenant_id: tenantId,
          name: template.name,
          industry_type: industry,
          steps: template.steps,
          default_priority: template.priority,
          is_active: true
        });

      if (templateError) {
        console.error("Error inserting template:", templateError);
      }
    }

    // Set up industry-specific demo data flags
    const { error: flagError } = await supabaseAdmin
      .from("tenant_settings")
      .upsert({
        tenant_id: tenantId,
        setting_key: "industry_configured",
        setting_value: industry,
        category: "onboarding"
      });

    if (flagError) throw flagError;

    console.log(`Industry workflows configured for tenant ${tenantId}: ${industry}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Industry workflows configured successfully",
        industry,
        templatesCreated: templates.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
