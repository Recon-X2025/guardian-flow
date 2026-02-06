import { randomUUID } from 'crypto';
import { chatCompletion, visionAnalysis } from './llm.js';
import { PROMPTS } from './prompts.js';
import { findMany, insertOne, aggregate, countDocuments } from '../../db/query.js';

function zScore(value, mean, stdDev) {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

function mean(arr) {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

export async function detectWorkOrderAnomalies(tenantId) {
  const completedWOs = await findMany('work_orders', {
    tenant_id: tenantId,
    status: 'completed',
  }, { sort: { updated_at: -1 }, limit: 500 });

  if (completedWOs.length < 5) return [];

  // Calculate completion times in hours
  const completionTimes = completedWOs.map(wo =>
    (new Date(wo.updated_at).getTime() - new Date(wo.created_at).getTime()) / 3600000
  ).filter(t => t > 0);

  const timeMean = mean(completionTimes);
  const timeStd = stdDev(completionTimes);

  const anomalies = [];

  for (let i = 0; i < completedWOs.length; i++) {
    const wo = completedWOs[i];
    const completionTime = completionTimes[i];
    if (!completionTime || completionTime <= 0) continue;

    const timeZ = zScore(completionTime, timeMean, timeStd);

    // Flag if z-score > 2.5 (unusually fast or slow)
    if (Math.abs(timeZ) > 2.5) {
      anomalies.push({
        id: randomUUID(),
        type: timeZ < 0 ? 'unusually_fast_completion' : 'unusually_slow_completion',
        severity: Math.abs(timeZ) > 3.5 ? 'high' : 'medium',
        confidence: Math.min(99, Math.round(50 + Math.abs(timeZ) * 15)),
        entity_type: 'work_order',
        entity_id: wo.id,
        wo_number: wo.wo_number,
        tenant_id: tenantId,
        details: {
          metric: 'completion_time_hours',
          value: Math.round(completionTime * 10) / 10,
          expected_min: Math.round((timeMean - 2 * timeStd) * 10) / 10,
          expected_max: Math.round((timeMean + 2 * timeStd) * 10) / 10,
          z_score: Math.round(timeZ * 100) / 100,
          mean: Math.round(timeMean * 10) / 10,
        },
        status: 'open',
        detected_at: new Date(),
      });
    }
  }

  // Store anomalies
  for (const anomaly of anomalies) {
    try {
      await insertOne('detected_anomalies', anomaly);
    } catch (e) { console.warn('Anomaly store error:', e.message); }
  }

  return anomalies;
}

export async function detectFinancialAnomalies(tenantId) {
  const invoices = await findMany('invoices', { tenant_id: tenantId }, { sort: { created_at: -1 }, limit: 500 });
  if (invoices.length < 5) return [];

  const amounts = invoices.map(inv => inv.total || inv.subtotal || 0).filter(a => a > 0);
  const amountMean = mean(amounts);
  const amountStd = stdDev(amounts);

  const anomalies = [];

  // Z-score analysis on amounts
  for (const inv of invoices) {
    const amount = inv.total || inv.subtotal || 0;
    if (amount <= 0) continue;

    const z = zScore(amount, amountMean, amountStd);
    if (Math.abs(z) > 2.5) {
      anomalies.push({
        id: randomUUID(),
        type: 'unusual_invoice_amount',
        severity: Math.abs(z) > 3.5 ? 'high' : 'medium',
        confidence: Math.min(99, Math.round(50 + Math.abs(z) * 15)),
        entity_type: 'invoice',
        entity_id: inv.id,
        invoice_number: inv.invoice_number,
        tenant_id: tenantId,
        details: {
          metric: 'invoice_amount',
          value: amount,
          expected_min: Math.round((amountMean - 2 * amountStd) * 100) / 100,
          expected_max: Math.round((amountMean + 2 * amountStd) * 100) / 100,
          z_score: Math.round(z * 100) / 100,
        },
        status: 'open',
        detected_at: new Date(),
      });
    }
  }

  // Benford's law check on leading digits
  const leadingDigits = amounts.map(a => parseInt(String(Math.floor(a))[0])).filter(d => d > 0);
  const benfordExpected = { 1: 0.301, 2: 0.176, 3: 0.125, 4: 0.097, 5: 0.079, 6: 0.067, 7: 0.058, 8: 0.051, 9: 0.046 };

  if (leadingDigits.length >= 50) {
    const digitCounts = {};
    for (const d of leadingDigits) digitCounts[d] = (digitCounts[d] || 0) + 1;

    for (const [digit, expected] of Object.entries(benfordExpected)) {
      const observed = (digitCounts[digit] || 0) / leadingDigits.length;
      const deviation = Math.abs(observed - expected);
      if (deviation > 0.1) {
        anomalies.push({
          id: randomUUID(),
          type: 'benford_law_violation',
          severity: deviation > 0.15 ? 'high' : 'medium',
          confidence: Math.min(95, Math.round(deviation * 500)),
          entity_type: 'financial',
          entity_id: `digit_${digit}`,
          tenant_id: tenantId,
          details: {
            digit: parseInt(digit),
            observed_frequency: Math.round(observed * 1000) / 1000,
            expected_frequency: expected,
            deviation: Math.round(deviation * 1000) / 1000,
            sample_size: leadingDigits.length,
          },
          status: 'open',
          detected_at: new Date(),
        });
      }
    }
  }

  // Duplicate detection
  const amountMap = {};
  for (const inv of invoices) {
    const key = `${inv.total}_${inv.customer_id || ''}`;
    if (!amountMap[key]) amountMap[key] = [];
    amountMap[key].push(inv);
  }
  for (const [key, dupes] of Object.entries(amountMap)) {
    if (dupes.length >= 3) {
      anomalies.push({
        id: randomUUID(),
        type: 'duplicate_amount_pattern',
        severity: dupes.length > 5 ? 'high' : 'medium',
        confidence: Math.min(90, 50 + dupes.length * 8),
        entity_type: 'invoice',
        entity_id: dupes[0].id,
        tenant_id: tenantId,
        details: {
          amount: dupes[0].total,
          occurrence_count: dupes.length,
          invoice_ids: dupes.map(d => d.id).slice(0, 10),
        },
        status: 'open',
        detected_at: new Date(),
      });
    }
  }

  for (const anomaly of anomalies) {
    try { await insertOne('detected_anomalies', anomaly); } catch (e) { /* skip */ }
  }

  return anomalies;
}

export async function detectPhotoAnomalies(images, context = {}) {
  const results = [];

  for (const image of images) {
    const imageUrl = image.url || image.file_url;
    if (!imageUrl) {
      results.push({ image_id: image.id, status: 'skipped', reason: 'No URL provided' });
      continue;
    }

    const analysis = await visionAnalysis(imageUrl, PROMPTS.PHOTO_ANALYSIS.user({
      stage: context.stage || 'unknown',
    }));

    let parsed;
    try {
      parsed = typeof analysis.analysis === 'string' ? JSON.parse(analysis.analysis) : analysis.analysis;
    } catch (e) {
      parsed = { quality_score: 0.7, anomalies: [], recommendation: 'review' };
    }

    results.push({
      image_id: image.id,
      ...parsed,
      provider: analysis.provider,
    });
  }

  return results;
}
