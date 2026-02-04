import { randomUUID } from 'crypto';
import { insertOne } from '../../db/query.js';

let openaiClient = null;

async function getOpenAIClient() {
  if (!openaiClient) {
    const { default: OpenAI } = await import('openai');
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function getProvider() {
  return process.env.AI_PROVIDER || 'mock';
}

// Mock response generation using keyword matching
function generateMockResponse(messages, opts = {}) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const lower = lastMessage.toLowerCase();

  // Keyword-based intelligent responses
  if (lower.includes('summarize') || lower.includes('summary')) {
    return `Based on the provided data, here is a summary:\n\n1. **Key Metrics**: The system shows normal operational patterns with some areas requiring attention.\n2. **Trends**: Overall performance is stable with a slight upward trend in completion rates.\n3. **Recommendations**: Consider optimizing resource allocation during peak hours.\n\nThis analysis is based on the available data points and historical patterns.`;
  }
  if (lower.includes('sla') || lower.includes('breach')) {
    return `SLA Analysis:\n\n- **High Risk**: Work orders approaching deadline with complex requirements or pending parts have elevated breach probability.\n- **Medium Risk**: Orders with adequate time but resource constraints may face delays.\n- **Contributing Factors**: Technician availability, parts supply chain, and geographic distance are the primary risk drivers.\n\nRecommendation: Prioritize high-risk orders and consider reassignment to closer technicians.`;
  }
  if (lower.includes('anomal') || lower.includes('fraud') || lower.includes('unusual')) {
    return `Anomaly Detection Results:\n\n- Several data points deviate significantly from established baselines.\n- Z-score analysis reveals outliers in completion time and cost metrics.\n- Pattern analysis suggests potential irregularities requiring human review.\n\nConfidence: 85%. Recommend detailed investigation of flagged items.`;
  }
  if (lower.includes('forecast') || lower.includes('predict')) {
    return `Forecast Analysis:\n\n- **Trend**: Moderate upward trajectory based on historical patterns.\n- **Seasonality**: Q2-Q3 typically shows 15-30% volume increase.\n- **Confidence Factors**: Data completeness (good), historical depth (adequate), external factors (moderate uncertainty).\n\nThe forecast model suggests steady growth with seasonal fluctuations.`;
  }
  if (lower.includes('offer') || lower.includes('upsell') || lower.includes('recommend')) {
    return `Based on the customer profile and service history, I recommend:\n\n1. **Extended Warranty Plus** - Given the equipment age and usage patterns, extended coverage would provide significant value.\n2. **Preventive Maintenance Plan** - Regular maintenance could reduce future breakdown risk by ~40%.\n3. **Performance Upgrade Package** - Current workload suggests the customer would benefit from enhanced specifications.`;
  }
  if (lower.includes('schedule') || lower.includes('assign') || lower.includes('optimize')) {
    return `Schedule Optimization Results:\n\n- Assignments optimized based on skill match, proximity, and workload balance.\n- Priority weighting: SLA urgency (3x), skill match (2x), travel distance (1x).\n- Estimated improvement: 15-20% reduction in travel time, better skill utilization.`;
  }
  if (lower.includes('route') || lower.includes('travel') || lower.includes('distance')) {
    return `Route optimization complete. The nearest-neighbor algorithm has reordered stops to minimize total travel distance. Estimated savings: 20-30% reduction in total kilometers traveled.`;
  }
  if (lower.includes('maintenance') || lower.includes('failure') || lower.includes('equipment')) {
    return `Equipment Maintenance Analysis:\n\n- Failure probability calculated using logistic regression on service history, age, and usage patterns.\n- High-risk equipment identified based on MTBF analysis.\n- Recommended action: Schedule preventive maintenance for units exceeding 80% failure probability threshold.`;
  }
  if (lower.includes('nlp') || lower.includes('query') || lower.includes('database')) {
    return `I've analyzed your natural language query and generated a safe MongoDB aggregation pipeline. The query is scoped to your tenant and limited to 1000 results for safety.`;
  }

  // Default response
  return `I've analyzed the provided information and here are my findings:\n\n${lastMessage.length > 50 ? 'Based on the detailed context provided, ' : ''}the data suggests normal operational patterns with some optimization opportunities. Key areas to focus on include resource utilization, timeline adherence, and quality metrics.\n\nWould you like me to dive deeper into any specific aspect?`;
}

function generateMockStreamTokens(messages) {
  const fullResponse = generateMockResponse(messages);
  // Split into word-sized chunks for streaming simulation
  return fullResponse.split(/(\s+)/).filter(s => s.length > 0);
}

export async function chatCompletion(messages, opts = {}) {
  const start = Date.now();
  const provider = getProvider();
  let result;

  try {
    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      const client = await getOpenAIClient();
      const response = await client.chat.completions.create({
        model: opts.model || 'gpt-4o-mini',
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.max_tokens || 2000,
        ...(opts.response_format ? { response_format: opts.response_format } : {}),
      });
      result = {
        content: response.choices[0].message.content,
        model: response.model,
        usage: response.usage,
        provider: 'openai',
      };
    } else {
      // Mock provider
      const content = generateMockResponse(messages, opts);
      result = {
        content,
        model: 'mock-gpt-4o-mini',
        usage: { prompt_tokens: messages.reduce((s, m) => s + (m.content?.length || 0) / 4, 0), completion_tokens: content.length / 4, total_tokens: 0 },
        provider: 'mock',
      };
      result.usage.total_tokens = result.usage.prompt_tokens + result.usage.completion_tokens;
    }
  } catch (error) {
    console.error('LLM error, falling back to mock:', error.message);
    const content = generateMockResponse(messages, opts);
    result = { content, model: 'mock-fallback', usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, provider: 'mock-fallback' };
  }

  // Log usage
  const duration = Date.now() - start;
  try {
    await insertOne('ai_usage_logs', {
      _id: randomUUID(),
      provider: result.provider,
      model: result.model,
      operation: 'chat_completion',
      prompt_tokens: Math.round(result.usage.prompt_tokens),
      completion_tokens: Math.round(result.usage.completion_tokens),
      total_tokens: Math.round(result.usage.total_tokens),
      duration_ms: duration,
      tenant_id: opts.tenant_id || null,
      feature: opts.feature || 'general',
      created_at: new Date(),
    });
  } catch (e) { /* non-critical */ }

  return result;
}

export async function* chatCompletionStream(messages, opts = {}) {
  const provider = getProvider();

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    try {
      const client = await getOpenAIClient();
      const stream = await client.chat.completions.create({
        model: opts.model || 'gpt-4o-mini',
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.max_tokens || 2000,
        stream: true,
      });
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) yield content;
      }
      return;
    } catch (error) {
      console.error('OpenAI stream error, falling back to mock:', error.message);
    }
  }

  // Mock streaming
  const tokens = generateMockStreamTokens(messages);
  for (const token of tokens) {
    await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
    yield token;
  }
}

export async function embedding(text) {
  const provider = getProvider();

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    try {
      const client = await getOpenAIClient();
      const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding error, falling back to mock:', error.message);
    }
  }

  // Mock: deterministic hash-based vector (1536 dims)
  return generateHashVector(text, 1536);
}

function generateHashVector(text, dims) {
  const vector = new Array(dims);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < dims; i++) {
    hash = ((hash << 5) - hash + i) | 0;
    vector[i] = (hash & 0xFFFF) / 32768 - 1; // normalize to [-1, 1]
  }
  // Normalize to unit vector
  const magnitude = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
  for (let i = 0; i < dims; i++) vector[i] /= magnitude;
  return vector;
}

export async function visionAnalysis(imageUrl, prompt) {
  const provider = getProvider();

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    try {
      const client = await getOpenAIClient();
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        }],
        max_tokens: 1000,
      });
      return { analysis: response.choices[0].message.content, provider: 'openai', model: response.model };
    } catch (error) {
      console.error('Vision API error, falling back to mock:', error.message);
    }
  }

  // Mock vision analysis
  return {
    analysis: JSON.stringify({
      quality_score: 0.85,
      is_stock_photo: false,
      contains_equipment: true,
      serial_number_visible: Math.random() > 0.3,
      lighting: 'adequate',
      blur_score: 0.15,
      anomalies: [],
      description: 'Image appears to show field service equipment in a standard work environment. Quality is acceptable for documentation purposes.',
    }),
    provider: 'mock',
    model: 'mock-vision',
  };
}
