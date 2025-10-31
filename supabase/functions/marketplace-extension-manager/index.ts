import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ error: 'No tenant found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, extensionId, configuration } = await req.json();

    switch (action) {
      case 'install': {
        const { data: extension } = await supabase
          .from('marketplace_extensions')
          .select('*')
          .eq('id', extensionId)
          .eq('status', 'approved')
          .single();

        if (!extension) {
          return new Response(JSON.stringify({ error: 'Extension not found or not approved' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: installed, error: installError } = await supabase
          .from('tenant_extensions')
          .insert({
            tenant_id: profile.tenant_id,
            extension_id: extensionId,
            configuration: configuration || {},
            enabled: true
          })
          .select()
          .single();

        if (installError) {
          return new Response(JSON.stringify({ error: installError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await supabase
          .from('marketplace_extensions')
          .update({ install_count: extension.install_count + 1 })
          .eq('id', extensionId);

        return new Response(
          JSON.stringify({ success: true, installation: installed }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'uninstall': {
        const { error: uninstallError } = await supabase
          .from('tenant_extensions')
          .delete()
          .eq('tenant_id', profile.tenant_id)
          .eq('extension_id', extensionId);

        if (uninstallError) {
          return new Response(JSON.stringify({ error: uninstallError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Extension uninstalled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'configure': {
        const { error: configError } = await supabase
          .from('tenant_extensions')
          .update({ configuration })
          .eq('tenant_id', profile.tenant_id)
          .eq('extension_id', extensionId);

        if (configError) {
          return new Response(JSON.stringify({ error: configError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Configuration updated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list_installed': {
        const { data: installed } = await supabase
          .from('tenant_extensions')
          .select(`
            *,
            extension:marketplace_extensions(*)
          `)
          .eq('tenant_id', profile.tenant_id);

        return new Response(
          JSON.stringify({ extensions: installed || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error: any) {
    console.error('Error managing marketplace extension:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});