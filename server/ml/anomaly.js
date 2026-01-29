/**
 * Statistical Anomaly Detection
 * Replaces Math.random() > 0.7 with real statistical methods
 */

import * as ss from 'simple-statistics';

/**
 * Z-Score anomaly detection
 * Flags points with |z| > threshold standard deviations from mean
 */
function detectZScore(values, threshold = 3.0) {
  const m = ss.mean(values);
  const s = ss.standardDeviation(values);
  if (s === 0) return values.map((v, i) => ({ index: i, value: v, score: 0, isAnomaly: false }));

  return values.map((v, i) => {
    const z = Math.abs((v - m) / s);
    return { index: i, value: v, score: z, isAnomaly: z > threshold, method: 'zscore' };
  });
}

/**
 * Modified Z-Score using Median Absolute Deviation (MAD)
 * More robust to outliers than standard z-score
 */
function detectModifiedZScore(values, threshold = 3.5) {
  const med = ss.median(values);
  const deviations = values.map(v => Math.abs(v - med));
  const mad = ss.median(deviations);
  if (mad === 0) return values.map((v, i) => ({ index: i, value: v, score: 0, isAnomaly: false }));

  const k = 0.6745; // consistency constant for normal distribution
  return values.map((v, i) => {
    const modZ = Math.abs(k * (v - med) / mad);
    return { index: i, value: v, score: modZ, isAnomaly: modZ > threshold, method: 'modified_zscore' };
  });
}

/**
 * IQR (Interquartile Range) method
 * Flags points outside Q1 - multiplier*IQR or Q3 + multiplier*IQR
 */
function detectIQR(values, multiplier = 1.5) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = ss.quantile(sorted, 0.25);
  const q3 = ss.quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - multiplier * iqr;
  const upper = q3 + multiplier * iqr;

  return values.map((v, i) => {
    const isAnomaly = v < lower || v > upper;
    const score = isAnomaly ? Math.max(Math.abs(v - lower), Math.abs(v - upper)) / (iqr || 1) : 0;
    return { index: i, value: v, score, isAnomaly, method: 'iqr' };
  });
}

/**
 * Sliding window anomaly detection for time series
 * Computes local z-score within a rolling window
 */
function detectSlidingWindow(values, windowSize = 24, threshold = 3.0) {
  return values.map((v, i) => {
    const start = Math.max(0, i - windowSize);
    const window = values.slice(start, i);
    if (window.length < 3) return { index: i, value: v, score: 0, isAnomaly: false, method: 'sliding_window' };

    const m = ss.mean(window);
    const s = ss.standardDeviation(window);
    if (s === 0) return { index: i, value: v, score: 0, isAnomaly: false, method: 'sliding_window' };

    const z = Math.abs((v - m) / s);
    return { index: i, value: v, score: z, isAnomaly: z > threshold, method: 'sliding_window' };
  });
}

/**
 * Consensus anomaly detection — combines all methods
 * A point is anomalous if flagged by >= minMethods methods
 */
function detectAnomalies(values, config = {}) {
  const {
    zThreshold = 3.0,
    modZThreshold = 3.5,
    iqrMultiplier = 1.5,
    windowSize = 24,
    windowThreshold = 3.0,
    minMethods = 2,
  } = config;

  const zResults = detectZScore(values, zThreshold);
  const modZResults = detectModifiedZScore(values, modZThreshold);
  const iqrResults = detectIQR(values, iqrMultiplier);
  const windowResults = detectSlidingWindow(values, windowSize, windowThreshold);

  const results = values.map((v, i) => {
    const methods = [zResults[i], modZResults[i], iqrResults[i], windowResults[i]];
    const flagCount = methods.filter(m => m.isAnomaly).length;
    const maxScore = Math.max(...methods.map(m => m.score));
    const isAnomaly = flagCount >= minMethods;

    // Classify anomaly type
    let anomalyType = null;
    if (isAnomaly) {
      // Check if consecutive points are anomalous (trend break)
      const prevAnomaly = i > 0 && zResults[i - 1]?.isAnomaly;
      const nextAnomaly = i < values.length - 1 && zResults[i + 1]?.isAnomaly;
      if (prevAnomaly || nextAnomaly) {
        anomalyType = 'trend_break';
      } else {
        anomalyType = 'outlier';
      }
    }

    // Severity based on deviation
    let severity = null;
    if (isAnomaly) {
      severity = maxScore > 5 ? 'high' : maxScore > 3 ? 'medium' : 'low';
    }

    return {
      index: i,
      value: v,
      isAnomaly,
      confidence: isAnomaly ? flagCount / 4 : 0,
      deviationScore: maxScore,
      severity,
      anomalyType,
      methodsAgreed: flagCount,
    };
  });

  const anomalies = results.filter(r => r.isAnomaly);
  const stats = {
    total: values.length,
    anomalyCount: anomalies.length,
    anomalyRate: anomalies.length / values.length,
    mean: ss.mean(values),
    median: ss.median(values),
    std: ss.standardDeviation(values),
  };

  return { results, anomalies, stats };
}

export {
  detectZScore,
  detectModifiedZScore,
  detectIQR,
  detectSlidingWindow,
  detectAnomalies,
};
