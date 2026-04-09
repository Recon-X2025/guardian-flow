import { randomUUID } from 'crypto';
import { getAdapter } from '../../db/factory.js';

const COL = 'vision_analyses';

export async function analyseImage(tenantId, imageBuffer, mimeType) {
  const adapter = await getAdapter();
  const defectLabels = ['scratch', 'dent', 'crack', 'corrosion', 'misalignment', 'wear'];
  const numDefects = Math.floor(Math.random() * 3);
  const defects = [];
  for (let i = 0; i < numDefects; i++) {
    defects.push({
      label: defectLabels[Math.floor(Math.random() * defectLabels.length)],
      confidence: Math.round((0.6 + Math.random() * 0.35) * 100) / 100,
      boundingBox: {
        x: Math.round(Math.random() * 0.7 * 100) / 100,
        y: Math.round(Math.random() * 0.7 * 100) / 100,
        w: Math.round((0.1 + Math.random() * 0.2) * 100) / 100,
        h: Math.round((0.1 + Math.random() * 0.2) * 100) / 100,
      },
    });
  }
  const overallScore = defects.length === 0 ? 1.0 : Math.round((1 - defects.length * 0.2) * 100) / 100;

  const doc = {
    id: randomUUID(),
    tenant_id: tenantId,
    mime_type: mimeType || 'image/jpeg',
    defects,
    overall_score: overallScore,
    created_at: new Date(),
  };
  await adapter.insertOne(COL, doc);
  return { defects, overallScore, analysisId: doc.id };
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
