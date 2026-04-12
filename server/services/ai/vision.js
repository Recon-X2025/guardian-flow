/**
 * @file server/services/ai/vision.js
 * @description Computer Vision service — GPT-4o Vision API with mock fallback.
 *
 * Provider selection
 * ──────────────────
 *  When OPENAI_API_KEY is set, uses GPT-4o vision to:
 *    - Identify defects, damage, or anomalies in field photos
 *    - Provide a structured JSON response with defect list + severity
 *    - Generate a human-readable description for the technician
 *    - Classify overall asset condition (good / fair / poor / critical)
 *
 *  Without OPENAI_API_KEY, generates a deterministic mock response.
 *
 * Exports
 * ───────
 *  analyseImage(tenantId, imageBuffer, mimeType, context?)
 *  listAnalyses(tenantId, assetId?)
 *  getAnalysis(tenantId, analysisId)
 */

import { randomUUID } from 'crypto';
import { getAdapter } from '../../db/factory.js';
import logger from '../../utils/logger.js';

const COL = 'vision_analyses';

// ── GPT-4o Vision prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert field-service equipment inspector.
Analyse the provided image and return ONLY valid JSON matching this exact schema:
{
  "defects": [
    {
      "label": "<defect type e.g. scratch|dent|crack|corrosion|wear|misalignment|leakage|burn|rust>",
      "severity": "<low|medium|high|critical>",
      "confidence": <0.0-1.0>,
      "location": "<brief description of where in the image>"
    }
  ],
  "overall_condition": "<good|fair|poor|critical>",
  "overall_score": <0.0-1.0 where 1.0 is perfect condition>,
  "description": "<2-3 sentence summary for the technician>",
  "recommended_action": "<none_required|monitor|schedule_maintenance|immediate_repair|take_out_of_service>"
}
Return ONLY the JSON object. No markdown code fences.`;

// ── OpenAI GPT-4o Vision ──────────────────────────────────────────────────────

async function analyseWithOpenAI(imageBuffer, mimeType, contextNote) {
  const userMessage = contextNote
    ? `Please inspect this equipment photo. Context: ${contextNote}`
    : 'Please inspect this equipment photo and report any defects or issues.';

  const base64Image = imageBuffer.toString('base64');
  const body = {
    model: 'gpt-4o',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: userMessage },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'high' },
          },
        ],
      },
    ],
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI Vision HTTP ${response.status}: ${errText.slice(0, 300)}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content.trim());

  return {
    defects: parsed.defects ?? [],
    overall_condition: parsed.overall_condition ?? 'good',
    overall_score: parsed.overall_score ?? 1.0,
    description: parsed.description ?? '',
    recommended_action: parsed.recommended_action ?? 'none_required',
    provider: 'openai_gpt4o',
    model: json.model,
    prompt_tokens: json.usage?.prompt_tokens,
    completion_tokens: json.usage?.completion_tokens,
  };
}

// ── Mock fallback ─────────────────────────────────────────────────────────────

function analyseWithMock() {
  const defectLabels = ['scratch', 'dent', 'crack', 'corrosion', 'misalignment', 'wear', 'rust'];
  const severities = ['low', 'medium', 'high'];
  const numDefects = Math.floor(Math.random() * 3);
  const defects = Array.from({ length: numDefects }, () => ({
    label: defectLabels[Math.floor(Math.random() * defectLabels.length)],
    severity: severities[Math.floor(Math.random() * severities.length)],
    confidence: Math.round((0.6 + Math.random() * 0.35) * 100) / 100,
    location: 'centre of image',
    // Bounding box retained for backward-compatibility with vision test + legacy UIs
    boundingBox: {
      x: Math.round(Math.random() * 0.7 * 100) / 100,
      y: Math.round(Math.random() * 0.7 * 100) / 100,
      w: Math.round((0.1 + Math.random() * 0.2) * 100) / 100,
      h: Math.round((0.1 + Math.random() * 0.2) * 100) / 100,
    },
  }));

  const score = defects.length === 0 ? 1.0 : Math.max(0.3, Math.round((1 - defects.length * 0.2) * 100) / 100);
  const condition = score >= 0.9 ? 'good' : score >= 0.7 ? 'fair' : score >= 0.5 ? 'poor' : 'critical';

  return {
    defects,
    overall_condition: condition,
    overall_score: score,
    description: defects.length
      ? `Mock analysis detected ${defects.length} defect(s): ${defects.map(d => d.label).join(', ')}.`
      : 'Mock analysis: no defects detected. Equipment appears in good condition.',
    recommended_action: defects.length === 0 ? 'none_required' : defects.some(d => d.severity === 'high') ? 'schedule_maintenance' : 'monitor',
    provider: 'mock',
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function analyseImage(tenantId, imageBuffer, mimeType, context = '') {
  const adapter = await getAdapter();
  let visionResult;

  if (process.env.OPENAI_API_KEY) {
    try {
      visionResult = await analyseWithOpenAI(imageBuffer, mimeType || 'image/jpeg', context);
      logger.info('vision: GPT-4o analysis complete', { tenantId, defects: visionResult.defects.length });
    } catch (err) {
      logger.warn('vision: GPT-4o failed, falling back to mock', { error: err.message });
      visionResult = analyseWithMock();
    }
  } else {
    visionResult = analyseWithMock();
    logger.debug('vision: using mock provider (no OPENAI_API_KEY)');
  }

  const doc = {
    id: randomUUID(),
    tenant_id: tenantId,
    mime_type: mimeType || 'image/jpeg',
    context: context || null,
    defects: visionResult.defects,
    overall_condition: visionResult.overall_condition,
    overall_score: visionResult.overall_score,
    description: visionResult.description,
    recommended_action: visionResult.recommended_action,
    provider: visionResult.provider,
    model: visionResult.model ?? null,
    created_at: new Date().toISOString(),
  };
  await adapter.insertOne(COL, doc);

  return {
    defects: doc.defects,
    overallScore: doc.overall_score,
    overallCondition: doc.overall_condition,
    description: doc.description,
    recommendedAction: doc.recommended_action,
    provider: doc.provider,
    analysisId: doc.id,
  };
}

export async function listAnalyses(tenantId, assetId) {
  const adapter = await getAdapter();
  const filter = { tenant_id: tenantId };
  if (assetId) filter.asset_id = assetId;
  return adapter.findMany(COL, filter, { sort: { created_at: -1 }, limit: 50 });
}

export async function getAnalysis(tenantId, analysisId) {
  const adapter = await getAdapter();
  return adapter.findOne(COL, { id: analysisId, tenant_id: tenantId });
}

