import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SAFE_TABLES = [
  'work_orders', 'tickets', 'customers', 'technicians', 'equipment',
  'invoices', 'quotes', 'training_courses', 'training_enrollments'
];

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

    const { naturalQuery } = await req.json();

    const systemPrompt = `You are a SQL expert that converts natural language to safe SQL queries.

Rules:
1. ONLY use SELECT statements (no INSERT, UPDATE, DELETE, DROP, etc.)
2. ONLY query from these tables: ${SAFE_TABLES.join(', ')}
3. Always include tenant_id filter when applicable
4. Use proper JOINs for related data
5. Return valid PostgreSQL syntax

Example: "Show me open work orders" -> "SELECT * FROM work_orders WHERE status = 'open' AND tenant_id = '<TENANT_ID>' LIMIT 100"`;

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
          { role: "user", content: naturalQuery }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_sql",
            description: "Generate SQL query from natural language",
            parameters: {
              type: "object",
              properties: {
                sql: { type: "string", description: "Valid SELECT SQL query" },
                explanation: { type: "string", description: "What the query does" }
              },
              required: ["sql", "explanation"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_sql" } }
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
    const { sql, explanation } = toolCall?.function?.arguments ? 
      JSON.parse(toolCall.function.arguments) : {};

    if (!sql) throw new Error('No SQL generated');

    // Validate SQL safety
    const sqlLower = sql.toLowerCase();
    if (!sqlLower.startsWith('select')) {
      throw new Error('Only SELECT queries allowed');
    }
    if (sqlLower.includes('drop') || sqlLower.includes('delete') || 
        sqlLower.includes('update') || sqlLower.includes('insert')) {
      throw new Error('Unsafe SQL detected');
    }

    // Execute query (with row limit for safety)
    const safeSql = sql.includes('LIMIT') ? sql : `${sql} LIMIT 1000`;
    
    const startTime = Date.now();
    const { data, error, count } = await supabaseClient.rpc('execute_safe_query', {
      query_text: safeSql
    });
    const executionTime = Date.now() - startTime;

    // Log query history
    await supabaseClient.from('nlp_query_history').insert({
      user_id: user.id,
      tenant_id: user.user_metadata.tenant_id,
      natural_language_query: naturalQuery,
      generated_sql: safeSql,
      executed_successfully: !error,
      result_count: data?.length || 0,
      execution_time_ms: executionTime,
    });

    if (error) throw error;

    return new Response(JSON.stringify({
      sql: safeSql,
      explanation,
      results: data,
      executionTime,
      rowCount: data?.length || 0
    }), {
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
