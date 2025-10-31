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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...params } = await req.json();

    console.log('[Template Manager] Action:', action);

    switch (action) {
      case 'create_template': {
        const { tenant_id, name, description, industry_type, steps, compliance_requirements, created_by } = params;

        const { data, error } = await supabase
          .from('workflow_templates')
          .insert({
            tenant_id,
            name,
            description,
            industry_type,
            steps,
            compliance_requirements: compliance_requirements || [],
            version: '1.0',
            active: false,
            created_by
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[Template Manager] Template created:', data.id);
        return new Response(JSON.stringify({ success: true, template: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_template': {
        const { template_id, updates, user_id } = params;

        // Get current template
        const { data: current } = await supabase
          .from('workflow_templates')
          .select('*')
          .eq('id', template_id)
          .single();

        if (updates.version || updates.steps) {
          // Create version record
          await supabase
            .from('workflow_template_versions')
            .insert({
              template_id,
              version: current.version,
              changes: {
                previous: current,
                updates
              },
              published_by: user_id,
              notes: updates.notes || 'Template updated'
            });
        }

        const { data, error } = await supabase
          .from('workflow_templates')
          .update(updates)
          .eq('id', template_id)
          .select()
          .single();

        if (error) throw error;

        console.log('[Template Manager] Template updated:', template_id);
        return new Response(JSON.stringify({ success: true, template: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'publish_template': {
        const { template_id, user_id } = params;

        const { data, error } = await supabase
          .from('workflow_templates')
          .update({
            active: true,
            published_at: new Date().toISOString()
          })
          .eq('id', template_id)
          .select()
          .single();

        if (error) throw error;

        console.log('[Template Manager] Template published:', template_id);
        return new Response(JSON.stringify({ success: true, template: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_templates': {
        const { industry_type, active_only, tenant_id } = params;

        let query = supabase
          .from('workflow_templates')
          .select('*');

        if (industry_type) query = query.eq('industry_type', industry_type);
        if (active_only) query = query.eq('active', true);
        if (tenant_id) query = query.eq('tenant_id', tenant_id);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, templates: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_template_versions': {
        const { template_id } = params;

        const { data, error } = await supabase
          .from('workflow_template_versions')
          .select('*')
          .eq('template_id', template_id)
          .order('published_at', { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, versions: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'clone_template': {
        const { template_id, new_name, tenant_id, user_id } = params;

        const { data: original } = await supabase
          .from('workflow_templates')
          .select('*')
          .eq('id', template_id)
          .single();

        const { data, error } = await supabase
          .from('workflow_templates')
          .insert({
            tenant_id,
            name: new_name || `${original.name} (Copy)`,
            description: original.description,
            industry_type: original.industry_type,
            steps: original.steps,
            step_schemas: original.step_schemas,
            compliance_requirements: original.compliance_requirements,
            version: '1.0',
            active: false,
            created_by: user_id
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[Template Manager] Template cloned:', data.id);
        return new Response(JSON.stringify({ success: true, template: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'validate_template': {
        const { template } = params;

        const validations = [];

        if (!template.steps || template.steps.length === 0) {
          validations.push({ field: 'steps', message: 'Template must have at least one step' });
        }

        if (template.steps) {
          template.steps.forEach((step: any, index: number) => {
            if (!step.name) {
              validations.push({ field: `steps[${index}].name`, message: 'Step name is required' });
            }
            if (!step.type) {
              validations.push({ field: `steps[${index}].type`, message: 'Step type is required' });
            }
          });
        }

        return new Response(JSON.stringify({
          success: validations.length === 0,
          valid: validations.length === 0,
          validations
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[Template Manager] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
