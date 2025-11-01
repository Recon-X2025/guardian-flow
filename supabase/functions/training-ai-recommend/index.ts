import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { userId } = await req.json();

    // Get user's completed courses and enrollments
    const { data: enrollments } = await supabaseClient
      .from('training_enrollments')
      .select(`
        *,
        training_courses (
          id,
          title,
          category,
          difficulty_level
        )
      `)
      .eq('user_id', userId);

    // Get all available courses
    const { data: allCourses } = await supabaseClient
      .from('training_courses')
      .select('*')
      .eq('is_published', true);

    // Build user profile for AI
    const completedCategories = enrollments
      ?.filter((e: any) => e.progress_percent === 100)
      .map((e: any) => e.training_courses?.category) || [];

    const inProgressCourses = enrollments
      ?.filter((e: any) => e.progress_percent > 0 && e.progress_percent < 100)
      .map((e: any) => e.training_courses?.title) || [];

    const systemPrompt = `You are a training recommendation AI. Based on user's learning history, recommend 3-5 relevant courses.

User's completed categories: ${completedCategories.join(', ') || 'None'}
User's in-progress courses: ${inProgressCourses.join(', ') || 'None'}

Available courses: ${JSON.stringify(allCourses)}

Return recommendations as JSON array with: id, title, reason (why recommended), priority (1-5)`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Recommend courses for this user" }
        ],
        tools: [{
          type: "function",
          function: {
            name: "recommend_courses",
            description: "Return course recommendations",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      course_id: { type: "string" },
                      reason: { type: "string" },
                      priority: { type: "number" }
                    },
                    required: ["course_id", "reason", "priority"]
                  }
                }
              },
              required: ["recommendations"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "recommend_courses" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const recommendations = toolCall?.function?.arguments ? 
      JSON.parse(toolCall.function.arguments).recommendations : [];

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
