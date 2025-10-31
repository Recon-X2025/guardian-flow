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

    console.log('[Video Processor] Action:', action);

    switch (action) {
      case 'upload_video': {
        const { file_name, file_size, content_type, user_id, category, title, description } = params;

        // Generate upload URL
        const uploadPath = `training-videos/${user_id}/${Date.now()}_${file_name}`;
        
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('training-content')
          .createSignedUploadUrl(uploadPath);

        if (uploadError) throw uploadError;

        // Create video record
        const { data: video, error: videoError } = await supabase
          .from('training_videos' as any)
          .insert({
            title,
            description,
            file_path: uploadPath,
            file_size,
            uploaded_by: user_id,
            category,
            status: 'processing',
            duration_seconds: 0
          })
          .select()
          .single();

        if (videoError) throw videoError;

        console.log('[Video Processor] Upload URL generated:', video.id);
        return new Response(JSON.stringify({
          success: true,
          upload_url: uploadData.signedUrl,
          video_id: video.id,
          path: uploadPath
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'finalize_upload': {
        const { video_id, duration_seconds } = params;

        // Update video status
        const { data, error } = await supabase
          .from('training_videos' as any)
          .update({
            status: 'ready',
            duration_seconds,
            processed_at: new Date().toISOString()
          })
          .eq('id', video_id)
          .select()
          .single();

        if (error) throw error;

        // Generate signed viewing URL
        const { data: urlData } = await supabase
          .storage
          .from('training-content')
          .createSignedUrl(data.file_path, 3600);

        console.log('[Video Processor] Upload finalized:', video_id);
        return new Response(JSON.stringify({
          success: true,
          video: data,
          viewing_url: urlData?.signedUrl
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_videos': {
        const { category, user_id } = params;

        let query = supabase
          .from('training_videos' as any)
          .select('*')
          .eq('status', 'ready')
          .order('created_at', { ascending: false });

        if (category) query = query.eq('category', category);
        if (user_id) query = query.eq('uploaded_by', user_id);

        const { data: videos, error } = await query.limit(50);

        if (error) throw error;

        // Generate signed URLs for each video
        const videosWithUrls = await Promise.all(
          videos.map(async (video: any) => {
            const { data: urlData } = await supabase
              .storage
              .from('training-content')
              .createSignedUrl(video.file_path, 3600);

            return {
              ...video,
              viewing_url: urlData?.signedUrl
            };
          })
        );

        return new Response(JSON.stringify({
          success: true,
          videos: videosWithUrls
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete_video': {
        const { video_id, user_id } = params;

        // Get video details
        const { data: video, error: fetchError } = await supabase
          .from('training_videos' as any)
          .select('*')
          .eq('id', video_id)
          .single();

        if (fetchError) throw fetchError;

        // Check permissions
        if (video.uploaded_by !== user_id) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Delete from storage
        await supabase
          .storage
          .from('training-content')
          .remove([video.file_path]);

        // Delete record
        const { error: deleteError } = await supabase
          .from('training_videos' as any)
          .delete()
          .eq('id', video_id);

        if (deleteError) throw deleteError;

        console.log('[Video Processor] Video deleted:', video_id);
        return new Response(JSON.stringify({ success: true }), {
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
    console.error('[Video Processor] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
