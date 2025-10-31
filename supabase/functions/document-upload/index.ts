import { corsHeaders } from '../_shared/cors.ts';
import { validateAuth } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateAuth(req);

    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { entity_type, entity_id, document_type, title, file_url, file_name, file_size, mime_type, tags } = await req.json();
    const tenantId = authResult.context.tenantId;

    // Generate document number
    const { count } = await authResult.context.supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const documentNumber = `DOC-${String((count || 0) + 1).padStart(6, '0')}`;

    const { data: document, error } = await authResult.context.supabase
      .from('documents')
      .insert({
        tenant_id: tenantId,
        entity_type,
        entity_id,
        document_number: documentNumber,
        document_type,
        title,
        file_url,
        file_name,
        file_size,
        mime_type,
        uploaded_by: authResult.context.user.id,
        tags: tags || [],
        ocr_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Trigger OCR processing if it's an image or PDF
    if (['image/jpeg', 'image/png', 'application/pdf'].includes(mime_type)) {
      await authResult.context.supabase.functions.invoke('document-ocr', {
        body: { document_id: document.id }
      });
    }

    return new Response(JSON.stringify({ document }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});