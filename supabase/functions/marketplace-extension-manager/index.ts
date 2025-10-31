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

    console.log('[Extension Manager] Action:', action);

    switch (action) {
      case 'submit_extension': {
        const { name, description, category, pricing_model, price, config, developer_id } = params;

        const { data, error } = await supabase
          .from('marketplace_extensions')
          .insert({
            name,
            description,
            category,
            pricing_model,
            price: pricing_model === 'free' ? 0 : price,
            config: config || {},
            status: 'pending',
            install_count: 0
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[Extension Manager] Extension submitted:', data.id);
        return new Response(JSON.stringify({ success: true, extension: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'approve_extension': {
        const { extension_id, admin_id } = params;

        const { data, error } = await supabase
          .from('marketplace_extensions')
          .update({
            status: 'approved',
            updated_at: new Date().toISOString()
          })
          .eq('id', extension_id)
          .select()
          .single();

        if (error) throw error;

        console.log('[Extension Manager] Extension approved:', extension_id);
        return new Response(JSON.stringify({ success: true, extension: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'reject_extension': {
        const { extension_id, reason } = params;

        const { data, error } = await supabase
          .from('marketplace_extensions')
          .update({
            status: 'rejected',
            config: { rejection_reason: reason },
            updated_at: new Date().toISOString()
          })
          .eq('id', extension_id)
          .select()
          .single();

        if (error) throw error;

        console.log('[Extension Manager] Extension rejected:', extension_id);
        return new Response(JSON.stringify({ success: true, extension: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'install_extension': {
        const { extension_id, user_id, tenant_id, config } = params;

        // Check if already installed
        const { data: existing } = await supabase
          .from('extension_installations')
          .select('*')
          .eq('extension_id', extension_id)
          .eq('user_id', user_id)
          .eq('tenant_id', tenant_id)
          .single();

        if (existing) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Extension already installed'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create installation
        const { data: installation, error: installError } = await supabase
          .from('extension_installations')
          .insert({
            extension_id,
            user_id,
            tenant_id,
            config: config || {},
            status: 'active'
          })
          .select()
          .single();

        if (installError) throw installError;

        // Increment install count
        const { data: ext } = await supabase
          .from('marketplace_extensions')
          .select('install_count')
          .eq('id', extension_id)
          .single();

        await supabase
          .from('marketplace_extensions')
          .update({ install_count: (ext?.install_count || 0) + 1 })
          .eq('id', extension_id);

        // Record analytics
        await supabase
          .from('marketplace_analytics')
          .insert({
            extension_id,
            user_id,
            event_type: 'install',
            event_data: { installation_id: installation.id },
            revenue_amount: 0
          });

        console.log('[Extension Manager] Extension installed:', installation.id);
        return new Response(JSON.stringify({ success: true, installation }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'uninstall_extension': {
        const { installation_id, user_id } = params;

        const { data: installation, error: fetchError } = await supabase
          .from('extension_installations')
          .select('*')
          .eq('id', installation_id)
          .eq('user_id', user_id)
          .single();

        if (fetchError) throw fetchError;

        const { error } = await supabase
          .from('extension_installations')
          .update({ status: 'uninstalled' })
          .eq('id', installation_id);

        if (error) throw error;

        // Record analytics
        await supabase
          .from('marketplace_analytics')
          .insert({
            extension_id: installation.extension_id,
            user_id,
            event_type: 'uninstall',
            event_data: { installation_id },
            revenue_amount: 0
          });

        console.log('[Extension Manager] Extension uninstalled:', installation_id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_marketplace': {
        const { category, status, search } = params;

        let query = supabase
          .from('marketplace_extensions')
          .select('*');

        if (category) query = query.eq('category', category);
        if (status) query = query.eq('status', status);
        if (search) query = query.ilike('name', `%${search}%`);

        const { data, error } = await query
          .order('install_count', { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, extensions: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_user_installations': {
        const { user_id, tenant_id } = params;

        const { data, error } = await supabase
          .from('extension_installations')
          .select('*, extension:marketplace_extensions(*)')
          .eq('user_id', user_id)
          .eq('tenant_id', tenant_id)
          .eq('status', 'active');

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, installations: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'record_transaction': {
        const { extension_id, user_id, amount, payment_status, stripe_payment_id } = params;

        const { data, error } = await supabase
          .from('marketplace_transactions')
          .insert({
            extension_id,
            user_id,
            amount,
            payment_status,
            stripe_payment_id,
            currency: 'USD'
          })
          .select()
          .single();

        if (error) throw error;

        // Record analytics
        await supabase
          .from('marketplace_analytics')
          .insert({
            extension_id,
            user_id,
            event_type: 'purchase',
            event_data: { transaction_id: data.id },
            revenue_amount: amount
          });

        console.log('[Extension Manager] Transaction recorded:', data.id);
        return new Response(JSON.stringify({ success: true, transaction: data }), {
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
    console.error('[Extension Manager] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
