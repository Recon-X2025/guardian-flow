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

    // Get user's tenant
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ error: 'No tenant association' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const templateName = formData.get('template_name') as string;
    const templateType = formData.get('template_type') as string;
    const placeholders = JSON.parse(formData.get('placeholders') as string || '[]');
    const previewData = JSON.parse(formData.get('preview_data') as string || 'null');

    if (!file || !templateName || !templateType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate file format
    const fileFormat = file.name.split('.').pop()?.toLowerCase();
    if (!['docx', 'pdf', 'html'].includes(fileFormat || '')) {
      return new Response(JSON.stringify({ error: 'Invalid file format. Supported: DOCX, PDF, HTML' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate placeholders
    if (!Array.isArray(placeholders) || placeholders.length === 0) {
      return new Response(JSON.stringify({ error: 'At least one placeholder is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Upload to storage
    const fileName = `${profile.tenant_id}/${templateType}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('document-templates')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload template' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get next version number
    const { data: existingTemplates } = await supabaseClient
      .from('document_templates')
      .select('version')
      .eq('tenant_id', profile.tenant_id)
      .eq('template_type', templateType)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = (existingTemplates?.[0]?.version || 0) + 1;

    // Deactivate previous active templates of this type
    await supabaseClient
      .from('document_templates')
      .update({ is_active: false })
      .eq('tenant_id', profile.tenant_id)
      .eq('template_type', templateType);

    // Create template record
    const { data: template, error: dbError } = await supabaseClient
      .from('document_templates')
      .insert({
        tenant_id: profile.tenant_id,
        template_name: templateName,
        template_type: templateType,
        file_format: fileFormat,
        storage_path: fileName,
        version: nextVersion,
        is_active: true,
        placeholders,
        preview_data: previewData,
        created_by: user.id
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Cleanup uploaded file
      await supabaseClient.storage.from('document-templates').remove([fileName]);
      return new Response(JSON.stringify({ error: 'Failed to save template metadata' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create version history entry
    await supabaseClient
      .from('template_versions')
      .insert({
        template_id: template.id,
        version: nextVersion,
        storage_path: fileName,
        placeholders,
        change_description: 'Initial upload',
        created_by: user.id
      });

    console.log(`Template uploaded: ${templateName} (v${nextVersion})`);

    return new Response(JSON.stringify({
      success: true,
      template,
      message: `Template "${templateName}" version ${nextVersion} uploaded successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('template-upload error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});