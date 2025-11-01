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
      case 'create_model':
        result = await createModel(supabase, user.id, payload);
        break;
      case 'train_model':
        result = await trainModel(supabase, payload.modelId);
        break;
      case 'deploy_model':
        result = await deployModel(supabase, payload.modelId);
        break;
      case 'predict':
        result = await makePrediction(supabase, payload.modelId, payload.inputData);
        break;
      case 'list_models':
        result = await listModels(supabase, payload.workspaceId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-ml-orchestrator:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createModel(supabase: any, userId: string, payload: any) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  const { data: model, error } = await supabase
    .from('analytics_ml_models')
    .insert({
      workspace_id: payload.workspace_id,
      tenant_id: profile.tenant_id,
      name: payload.name,
      description: payload.description,
      model_type: payload.model_type,
      framework: payload.framework || 'sklearn',
      version: '1.0.0',
      training_dataset_id: payload.training_dataset_id,
      hyperparameters: payload.hyperparameters || {},
      status: 'draft',
      created_by: userId
    })
    .select()
    .single();

  if (error) throw error;

  return { model };
}

async function trainModel(supabase: any, modelId: string) {
  // Update model status to training
  await supabase
    .from('analytics_ml_models')
    .update({ status: 'training' })
    .eq('id', modelId);

  // Simulate training (in production, this would trigger actual ML training)
  setTimeout(async () => {
    const metrics = {
      accuracy: 0.85 + Math.random() * 0.12,
      precision: 0.82 + Math.random() * 0.15,
      recall: 0.80 + Math.random() * 0.15,
      f1_score: 0.83 + Math.random() * 0.12,
      training_time_seconds: Math.floor(Math.random() * 300) + 60
    };

    await supabase
      .from('analytics_ml_models')
      .update({
        status: 'trained',
        metrics,
        model_artifact_path: `/models/${modelId}/model.pkl`
      })
      .eq('id', modelId);
  }, 5000);

  return { message: 'Model training started', modelId };
}

async function deployModel(supabase: any, modelId: string) {
  const { data: model, error } = await supabase
    .from('analytics_ml_models')
    .update({
      status: 'deployed',
      deployed_at: new Date().toISOString()
    })
    .eq('id', modelId)
    .select()
    .single();

  if (error) throw error;

  return { model };
}

async function makePrediction(supabase: any, modelId: string, inputData: any) {
  // Simulate prediction (in production, this would call actual ML model)
  const prediction = {
    class: Math.random() > 0.5 ? 'positive' : 'negative',
    probability: 0.5 + Math.random() * 0.5,
    confidence: 0.7 + Math.random() * 0.3
  };

  // Store prediction
  await supabase
    .from('analytics_ml_predictions')
    .insert({
      model_id: modelId,
      input_data: inputData,
      prediction_result: prediction,
      confidence_score: prediction.confidence
    });

  return { prediction };
}

async function listModels(supabase: any, workspaceId: string) {
  const { data: models, error } = await supabase
    .from('analytics_ml_models')
    .select(`
      *,
      creator:profiles!analytics_ml_models_created_by_fkey(full_name, email)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return { models };
}
