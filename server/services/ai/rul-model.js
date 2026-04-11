// server/services/ai/rul-model.js
/**
 * RUL (Remaining Useful Life) estimation using exponential decay model.
 * y = a * exp(-b * t)
 * Log-linear regression: ln(y) = ln(a) - b*t
 */

export function fitExponentialDecay(readings) {
  // readings: [{value, timestamp}], sorted by timestamp ascending
  if (!readings || readings.length < 2) return { a: 0, b: 0, r2: 0 };

  // Convert timestamps to days from first reading
  const t0 = new Date(readings[0].timestamp).getTime();
  const points = readings
    .filter(r => r.value > 0)
    .map(r => ({
      t: (new Date(r.timestamp).getTime() - t0) / (1000 * 86400),
      lnY: Math.log(r.value),
    }));

  if (points.length < 2) return { a: readings[0].value, b: 0, r2: 0 };

  const n = points.length;
  const sumT = points.reduce((s, p) => s + p.t, 0);
  const sumLnY = points.reduce((s, p) => s + p.lnY, 0);
  const sumT2 = points.reduce((s, p) => s + p.t * p.t, 0);
  const sumTLnY = points.reduce((s, p) => s + p.t * p.lnY, 0);

  const denom = n * sumT2 - sumT * sumT;
  if (Math.abs(denom) < 1e-10) return { a: Math.exp(sumLnY / n), b: 0, r2: 0 };

  // slope = (n*sumTLnY - sumT*sumLnY) / denom
  const slope = (n * sumTLnY - sumT * sumLnY) / denom;
  const lnAFit = (sumLnY - slope * sumT) / n;
  const aFit = Math.exp(lnAFit);
  const bFit = -slope; // b >= 0 for decay

  // R² on ln(y) scale
  const meanLnY = sumLnY / n;
  const ssTot = points.reduce((s, p) => s + (p.lnY - meanLnY) ** 2, 0);
  const ssRes = points.reduce((s, p) => s + (p.lnY - (lnAFit + slope * p.t)) ** 2, 0);
  const r2 = ssTot < 1e-10 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { a: aFit, b: bFit, r2 };
}

export function estimateRUL(readings, failureThreshold) {
  if (!readings || readings.length < 2) return { estimatedRULDays: null, confidence: 0, degradationCurve: [] };

  const { a, b, r2 } = fitExponentialDecay(readings);

  // Project forward: y = a * exp(-b * t)
  // Find t where y = failureThreshold: t = ln(a / failureThreshold) / b
  let estimatedRULDays = null;
  if (b > 0 && a > failureThreshold) {
    const tFail = Math.log(a / failureThreshold) / b;
    // tFail is days from first reading; subtract elapsed days
    const t0 = new Date(readings[0].timestamp).getTime();
    const tNow = new Date(readings[readings.length - 1].timestamp).getTime();
    const elapsedDays = (tNow - t0) / (1000 * 86400);
    estimatedRULDays = Math.max(0, tFail - elapsedDays);
  }

  // Build degradation curve: 30 days from now
  const t0 = new Date(readings[0].timestamp).getTime();
  const tNow = new Date(readings[readings.length - 1].timestamp).getTime();
  const elapsedDays = (tNow - t0) / (1000 * 86400);

  const degradationCurve = [];
  for (let day = 0; day <= 30; day++) {
    const t = elapsedDays + day;
    const predictedValue = a * Math.exp(-b * t);
    degradationCurve.push({ day, predictedValue: Math.max(0, predictedValue) });
  }

  return { estimatedRULDays, confidence: r2, degradationCurve };
}
