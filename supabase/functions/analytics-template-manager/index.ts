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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, ...payload } = await req.json();

    let result;
    switch (action) {
      case 'list_templates':
        result = await listTemplates(supabase, payload.industry);
        break;
      case 'get_template':
        result = await getTemplate(supabase, payload.templateId);
        break;
      case 'install_template':
        result = await installTemplate(supabase, user.id, payload);
        break;
      case 'list_installations':
        result = await listInstallations(supabase, payload.workspaceId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-template-manager:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function listTemplates(supabase: any, industry?: string) {
  let query = supabase
    .from('analytics_industry_templates')
    .select('*')
    .eq('is_certified', true);

  if (industry) {
    query = query.eq('industry', industry);
  }

  const { data: templates, error } = await query
    .order('install_count', { ascending: false });

  if (error) throw error;

  return { templates };
}

async function getTemplate(supabase: any, templateId: string) {
  const { data: template, error } = await supabase
    .from('analytics_industry_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) throw error;

  return { template };
}

async function installTemplate(supabase: any, userId: string, payload: any) {
  const { templateId, workspaceId, customizations } = payload;

  // Check if already installed
  const { data: existing } = await supabase
    .from('analytics_template_installations')
    .select('id')
    .eq('template_id', templateId)
    .eq('workspace_id', workspaceId)
    .single();

  if (existing) {
    throw new Error('Template already installed in this workspace');
  }

  // Install template
  const { data: installation, error } = await supabase
    .from('analytics_template_installations')
    .insert({
      template_id: templateId,
      workspace_id: workspaceId,
      installed_by: userId,
      customizations: customizations || {}
    })
    .select()
    .single();

  if (error) throw error;

  // Increment install count
  await supabase.rpc('increment', {
    table_name: 'analytics_industry_templates',
    row_id: templateId,
    column_name: 'install_count'
  });

  return { installation };
}

async function listInstallations(supabase: any, workspaceId: string) {
  const { data: installations, error } = await supabase
    .from('analytics_template_installations')
    .select(`
      *,
      template:analytics_industry_templates(*),
      installer:profiles!analytics_template_installations_installed_by_fkey(full_name, email)
    `)
    .eq('workspace_id', workspaceId)
    .order('installed_at', { ascending: false });

  if (error) throw error;

  return { installations };
}
