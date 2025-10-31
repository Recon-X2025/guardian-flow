import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { template_id, data: renderData, entity_id, output_format = 'html' } = await req.json();

    if (!template_id || !renderData) {
      return new Response(JSON.stringify({ error: 'Missing template_id or data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const startTime = Date.now();

    // Get user's tenant
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    // Fetch template
    const { data: template, error: templateError } = await supabaseClient
      .from('document_templates')
      .select('*')
      .eq('id', template_id)
      .eq('tenant_id', profile?.tenant_id)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Download template file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('document-templates')
      .download(template.storage_path);

    if (downloadError) {
      console.error('Template download error:', downloadError);
      return new Response(JSON.stringify({ error: 'Failed to download template' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Read template content
    let templateContent = await fileData.text();

    // Replace placeholders
    const placeholders = template.placeholders as string[];
    for (const placeholder of placeholders) {
      const value = renderData[placeholder] || '';
      const regex = new RegExp(`{{\\s*${placeholder}\\s*}}`, 'g');
      templateContent = templateContent.replace(regex, String(value));
    }

    // Log usage
    const renderingTime = Date.now() - startTime;
    await supabaseClient
      .from('template_usage_log')
      .insert({
        template_id,
        tenant_id: profile?.tenant_id,
        document_type: template.template_type,
        rendered_for_entity_id: entity_id,
        rendered_by: user.id,
        rendering_time_ms: renderingTime,
        output_format
      });

    console.log(`Template rendered: ${template.template_name} in ${renderingTime}ms`);

    // Return rendered content
    return new Response(JSON.stringify({
      success: true,
      rendered_content: templateContent,
      template_name: template.template_name,
      template_type: template.template_type,
      version: template.version,
      rendering_time_ms: renderingTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('template-render error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});