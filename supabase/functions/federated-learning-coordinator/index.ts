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

    console.log('[FL Coordinator] Action:', action);

    switch (action) {
      case 'create_model': {
        const { name, description, model_type, min_participants } = params;
        
        const { data, error } = await supabase
          .from('federated_learning_models')
          .insert({
            name,
            description,
            model_type,
            min_participants: min_participants || 3,
            status: 'initialized'
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[FL Coordinator] Model created:', data.id);
        return new Response(JSON.stringify({ success: true, model: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'start_training_round': {
        const { model_id } = params;

        // Fetch model
        const { data: model, error: modelError } = await supabase
          .from('federated_learning_models')
          .select('*')
          .eq('id', model_id)
          .single();

        if (modelError) throw modelError;

        // Get all participating tenants
        const { data: tenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('id')
          .eq('active', true);

        if (tenantsError) throw tenantsError;

        // Create training jobs for each tenant
        const jobs = tenants.map(tenant => ({
          model_id,
          tenant_id: tenant.id,
          round_number: model.current_round + 1,
          status: 'pending'
        }));

        const { data: createdJobs, error: jobsError } = await supabase
          .from('federated_training_jobs')
          .insert(jobs)
          .select();

        if (jobsError) throw jobsError;

        // Update model status
        await supabase
          .from('federated_learning_models')
          .update({
            status: 'training',
            current_round: model.current_round + 1
          })
          .eq('id', model_id);

        console.log('[FL Coordinator] Training round started:', model.current_round + 1);
        return new Response(JSON.stringify({
          success: true,
          round: model.current_round + 1,
          jobs_created: createdJobs.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'aggregate_models': {
        const { model_id, round_number } = params;

        // Fetch all completed jobs for this round
        const { data: jobs, error: jobsError } = await supabase
          .from('federated_training_jobs')
          .select('*')
          .eq('model_id', model_id)
          .eq('round_number', round_number)
          .eq('status', 'completed');

        if (jobsError) throw jobsError;

        const { data: model } = await supabase
          .from('federated_learning_models')
          .select('*')
          .eq('id', model_id)
          .single();

        if (jobs.length < (model?.min_participants || 3)) {
          return new Response(JSON.stringify({
            success: false,
            message: `Insufficient participants. Got ${jobs.length}, need ${model?.min_participants || 3}`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Perform federated averaging
        const aggregatedMetrics = {
          avg_accuracy: jobs.reduce((sum, j) => sum + (j.metrics?.accuracy || 0), 0) / jobs.length,
          avg_loss: jobs.reduce((sum, j) => sum + (j.metrics?.loss || 0), 0) / jobs.length,
          participants: jobs.length,
          aggregation_strategy: model?.aggregation_strategy || 'fedavg'
        };

        // Update model
        await supabase
          .from('federated_learning_models')
          .update({
            status: 'aggregating',
            metadata: {
              last_aggregation: new Date().toISOString(),
              round_metrics: aggregatedMetrics
            }
          })
          .eq('id', model_id);

        console.log('[FL Coordinator] Models aggregated for round:', round_number);
        return new Response(JSON.stringify({
          success: true,
          metrics: aggregatedMetrics
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'submit_local_update': {
        const { job_id, model_updates, metrics } = params;

        const { error } = await supabase
          .from('federated_training_jobs')
          .update({
            local_model_updates: model_updates,
            metrics,
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', job_id);

        if (error) throw error;

        console.log('[FL Coordinator] Local update submitted for job:', job_id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_model_status': {
        const { model_id } = params;

        const { data: model, error } = await supabase
          .from('federated_learning_models')
          .select('*')
          .eq('id', model_id)
          .single();

        if (error) throw error;

        const { data: jobs } = await supabase
          .from('federated_training_jobs')
          .select('status')
          .eq('model_id', model_id)
          .eq('round_number', model.current_round);

        const statusCounts = jobs?.reduce((acc, job) => {
          acc[job.status] = (acc[job.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return new Response(JSON.stringify({
          success: true,
          model,
          current_round_status: statusCounts
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
    console.error('[FL Coordinator] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
