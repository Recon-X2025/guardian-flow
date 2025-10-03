import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REQUIRED_ROLES = ['context_wide', 'pre_closeup', 'serial', 'replacement_part'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { woId, stage, images } = await req.json();

    if (!woId || !stage || !images || !Array.isArray(images)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: woId, stage, images' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate minimum 4 photos
    if (images.length < 4) {
      return new Response(
        JSON.stringify({
          photos_validated: false,
          error: 'Minimum 4 photos required',
          images_provided: images.length
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check all required roles are present
    const providedRoles = images.map((img: any) => img.role);
    const missingRoles = REQUIRED_ROLES.filter(role => !providedRoles.includes(role));

    if (missingRoles.length > 0) {
      return new Response(
        JSON.stringify({
          photos_validated: false,
          error: 'Missing required photo roles',
          missing_roles: missingRoles
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify work order exists
    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', woId)
      .single();

    if (woError || !workOrder) {
      return new Response(
        JSON.stringify({ error: 'Work order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store attachments
    for (const image of images) {
      await supabase.from('attachments').insert({
        work_order_id: woId,
        uploader_id: user.id,
        filename: image.filename || 'photo.jpg',
        file_hash: image.hash,
        role: image.role,
        stage: stage,
        gps_lat: image.gps?.lat,
        gps_lon: image.gps?.lon,
        captured_at: image.captured_at,
        metadata: {
          image_id: image.id,
          validation_timestamp: new Date().toISOString()
        }
      });
    }

    // Create validation record
    const { data: validation, error: validationError } = await supabase
      .from('photo_validations')
      .insert({
        work_order_id: woId,
        stage: stage,
        photos_validated: true,
        validation_result: {
          images_count: images.length,
          roles_provided: providedRoles,
          all_hashed: images.every((img: any) => img.hash),
          all_gps_stamped: images.every((img: any) => img.gps),
        },
        validated_by: user.id,
        validated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (validationError) {
      console.error('Validation record error:', validationError);
      throw validationError;
    }

    console.log(`Photos validated for WO ${woId}, stage ${stage} by user ${user.id}`);

    return new Response(
      JSON.stringify({
        photos_validated: true,
        validation_id: validation.id,
        woId: woId,
        stage: stage,
        images_count: images.length,
        validated_at: validation.validated_at,
        validated_by: user.id,
        provenance: {
          validation_method: 'automatic',
          all_roles_present: true,
          security_features: ['sha256_hash', 'gps_stamp', 'timestamp']
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Photo validation error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
