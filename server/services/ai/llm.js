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

export function getProvider() {
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
    // Extract geography info from the prompt for context-aware explanation
    const geoMatch = lastMessage.match(/Geography:\s*(\w+)\s*=\s*(.+)/);
    const geo = geoMatch ? `${geoMatch[1]} ${geoMatch[2]}` : 'the selected region';
    const trendMatch = lastMessage.match(/Trend:\s*(\w+)/);
    const trendDir = trendMatch ? trendMatch[1] : 'Moderate upward';
    return `The forecast for ${geo} shows a ${trendDir.toLowerCase()} trajectory based on historical work order patterns. Seasonal analysis reveals higher volumes during Q2-Q3, typically a 15-30% increase driven by increased equipment usage in warmer months. The model confidence is moderate, with data completeness being the primary factor. We recommend monitoring actual vs predicted volumes weekly and retraining the model if deviation exceeds 20%.`;
  }
  if (lower.includes('offer') || lower.includes('upsell') || lower.includes('recommend')) {
    // Extract context from the prompt for personalized mock responses
    const customerMatch = lastMessage.match(/Customer:\s*(.+?)[\n,]/);
    const customerName = customerMatch ? customerMatch[1].trim() : 'the customer';
    const equipmentMatch = lastMessage.match(/Equipment:\s*(.+?)[\n,]/) || lastMessage.match(/Model:\s*(.+?)[\n,]/);
    const equipmentModel = equipmentMatch ? equipmentMatch[1].trim() : 'their equipment';
    const warrantyMatch = lastMessage.match(/Warranty.*?:\s*(active|expired)/i);
    const warrantyActive = warrantyMatch ? warrantyMatch[1].toLowerCase() === 'active' : false;
    const issueMatch = lastMessage.match(/Issue:\s*(.+?)[\n,]/) || lastMessage.match(/Symptom:\s*(.+?)[\n,]/);
    const issue = issueMatch ? issueMatch[1].trim() : 'service needs';

    // Check if structured JSON is expected
    if (lower.includes('json') || lower.includes('return as json') || lower.includes('personalized service offers')) {
      const offers = [];
      if (!warrantyActive) {
        offers.push({
          title: `Extended Warranty for ${equipmentModel}`,
          description: `Comprehensive coverage for ${customerName}'s ${equipmentModel} with priority support and no deductibles on parts and labor.`,
          offer_type: 'extended_warranty',
          price: 299.99,
          value_proposition: `Protect ${equipmentModel} against unexpected repair costs — save up to 60% over the next 2 years.`,
          warranty_conflicts: false,
        });
      } else {
        offers.push({
          title: `Warranty Extension for ${equipmentModel}`,
          description: `Extend ${customerName}'s active warranty coverage beyond the current end date with enhanced SLA terms.`,
          offer_type: 'warranty_extension',
          price: 199.99,
          value_proposition: `Lock in continued coverage for ${equipmentModel} before the current warranty expires.`,
          warranty_conflicts: false,
        });
      }
      offers.push({
        title: `Preventive Maintenance Plan — ${equipmentModel}`,
        description: `Quarterly scheduled maintenance for ${customerName}'s ${equipmentModel} to prevent issues like "${issue}" from recurring.`,
        offer_type: 'maintenance_plan',
        price: 149.99,
        value_proposition: `Reduce breakdown risk by ~40% and extend ${equipmentModel} lifespan by up to 3 years.`,
        warranty_conflicts: false,
      });
      offers.push({
        title: `Performance Optimization — ${equipmentModel}`,
        description: `Hardware and software tuning for ${customerName}'s ${equipmentModel} to maximize throughput and reliability.`,
        offer_type: 'upgrade',
        price: 199.99,
        value_proposition: `Boost ${equipmentModel} productivity with up to 25% faster processing and improved reliability.`,
        warranty_conflicts: false,
      });
      return JSON.stringify(offers);
    }
    return `Based on ${customerName}'s profile and service history with ${equipmentModel}, I recommend:\n\n1. **${warrantyActive ? 'Warranty Extension' : 'Extended Warranty Plus'}** - ${warrantyActive ? 'Extend current active warranty with enhanced SLA terms.' : 'Equipment warranty has expired — extended coverage provides significant value.'}\n2. **Preventive Maintenance Plan** - Regular maintenance could reduce future breakdown risk by ~40% for ${equipmentModel}.\n3. **Performance Upgrade Package** - Based on recent "${issue}" issue, optimization could improve reliability.`;
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
    return `I've analyzed your natural language query and generated a safe MongoDB find query. The query is scoped to your tenant and limited to 500 results for safety.`;
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
      const model = opts.model || process.env.OPENAI_MODEL || 'gpt-4o';
      const response = await client.chat.completions.create({
        model,
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
      id: randomUUID(),
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
      const model = opts.model || process.env.OPENAI_MODEL || 'gpt-4o';
      const stream = await client.chat.completions.create({
        model,
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
      const visionModel = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o';
      const response = await client.chat.completions.create({
        model: visionModel,
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

  // Mock vision analysis - deterministic based on prompt content
  const isForensic = prompt.toLowerCase().includes('forgery') || prompt.toLowerCase().includes('forensic') || prompt.toLowerCase().includes('tamper');
  if (isForensic) {
    // Deterministic hash from imageUrl to produce consistent results
    let hash = 0;
    for (let i = 0; i < (imageUrl || '').length; i++) {
      hash = ((hash << 5) - hash + imageUrl.charCodeAt(i)) | 0;
    }
    const suspicion = Math.abs(hash % 100) / 100;
    const isSuspicious = suspicion > 0.7;
    return {
      analysis: JSON.stringify({
        forgery_detected: isSuspicious,
        forgery_type: isSuspicious ? 'metadata_inconsistency' : null,
        confidence: isSuspicious ? 0.65 + (suspicion - 0.7) : 0.85 + (0.7 - suspicion) * 0.1,
        findings: isSuspicious ? [
          { type: 'exif_mismatch', severity: 'medium', description: 'EXIF timestamps show editing software modification after capture date.' },
          { type: 'compression_anomaly', severity: 'low', description: 'JPEG compression artifacts suggest re-saving from different software.' },
        ] : [],
        metadata: {
          timestamp: new Date().toISOString(),
          camera: 'iPhone 14 Pro',
          software: isSuspicious ? 'Adobe Photoshop 25.0' : null,
        },
        quality_score: isSuspicious ? 0.6 : 0.88,
        recommendation: isSuspicious ? 'review' : 'pass',
      }),
      provider: 'mock',
      model: 'mock-vision-forensics',
    };
  }
  return {
    analysis: JSON.stringify({
      quality_score: 0.85,
      is_stock_photo: false,
      contains_equipment: true,
      serial_number_visible: Math.abs(((imageUrl || '').length * 7) % 10) > 3,
      lighting: 'adequate',
      blur_score: 0.15,
      anomalies: [],
      description: 'Image appears to show field service equipment in a standard work environment. Quality is acceptable for documentation purposes.',
    }),
    provider: 'mock',
    model: 'mock-vision',
  };
}
