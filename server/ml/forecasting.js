/**
 * Holt-Winters Triple Exponential Smoothing
 * Replaces simple moving average + linear trend
 */

import { mean, computeRegressionMetrics } from './utils.js';

/**
 * Initialize Holt-Winters components from data
 */
function initializeComponents(data, seasonLength) {
  // Level: average of first season
  const firstSeason = data.slice(0, seasonLength);
  const level = mean(firstSeason);

  // Trend: average difference between corresponding points in first two seasons
  let trend = 0;
  if (data.length >= 2 * seasonLength) {
    for (let i = 0; i < seasonLength; i++) {
      trend += (data[seasonLength + i] - data[i]) / seasonLength;
    }
    trend /= seasonLength;
  }

  // Seasonal: deviation from level for first season
  const seasonal = new Array(seasonLength);
  for (let i = 0; i < seasonLength; i++) {
    seasonal[i] = data[i] - level;
  }

  return { level, trend, seasonal };
}

/**
 * Run Holt-Winters with given parameters, return fitted values + error
 */
function holtWintersFit(data, alpha, beta, gamma, seasonLength) {
  const { level: initLevel, trend: initTrend, seasonal: initSeasonal } = initializeComponents(data, seasonLength);

  let level = initLevel;
  let trend = initTrend;
  const seasonal = [...initSeasonal];
  const fitted = [];
  const residuals = [];

  for (let i = 0; i < data.length; i++) {
    const si = i % seasonLength;
    const forecast = (level + trend) + seasonal[si];
    fitted.push(forecast);
    residuals.push(data[i] - forecast);

    // Update components
    const prevLevel = level;
    level = alpha * (data[i] - seasonal[si]) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonal[si] = gamma * (data[i] - level) + (1 - gamma) * seasonal[si];
  }

  const mse = residuals.reduce((s, r) => s + r * r, 0) / residuals.length;

  return { level, trend, seasonal, fitted, residuals, mse };
}

/**
 * Train Holt-Winters by grid search over alpha, beta, gamma
 * Returns optimal parameters and model state
 */
function holtWintersTrain(data, seasonLength = 7) {
  if (data.length < 2 * seasonLength) {
    // Not enough data for seasonal model, use simple exponential smoothing
    return trainSimpleExponentialSmoothing(data);
  }

  let bestMSE = Infinity;
  let bestParams = { alpha: 0.3, beta: 0.1, gamma: 0.1 };
  let bestResult = null;

  // Grid search with step 0.1
  for (let a = 0.1; a <= 0.9; a += 0.1) {
    for (let b = 0.01; b <= 0.5; b += 0.1) {
      for (let g = 0.01; g <= 0.5; g += 0.1) {
        const result = holtWintersFit(data, a, b, g, seasonLength);
        if (result.mse < bestMSE) {
          bestMSE = result.mse;
          bestParams = { alpha: a, beta: b, gamma: g };
          bestResult = result;
        }
      }
    }
  }

  // Compute metrics
  const metrics = computeRegressionMetrics(data, bestResult.fitted);
  const residualStd = Math.sqrt(bestResult.residuals.reduce((s, r) => s + r * r, 0) / bestResult.residuals.length);

  return {
    alpha: bestParams.alpha,
    beta: bestParams.beta,
    gamma: bestParams.gamma,
    seasonLength,
    level: bestResult.level,
    trend: bestResult.trend,
    seasonal: bestResult.seasonal,
    residualStd,
    metrics,
    trainedAt: new Date().toISOString(),
  };
}

/**
 * Fallback: Simple exponential smoothing when insufficient data for seasonality
 */
function trainSimpleExponentialSmoothing(data) {
  let bestAlpha = 0.3;
  let bestMSE = Infinity;

  for (let a = 0.1; a <= 0.9; a += 0.05) {
    let level = data[0];
    let sse = 0;
    for (let i = 1; i < data.length; i++) {
      const forecast = level;
      sse += (data[i] - forecast) ** 2;
      level = a * data[i] + (1 - a) * level;
    }
    const mse = sse / (data.length - 1);
    if (mse < bestMSE) {
      bestMSE = mse;
      bestAlpha = a;
    }
  }

  // Refit with best alpha
  let level = data[0];
  const fitted = [data[0]];
  for (let i = 1; i < data.length; i++) {
    fitted.push(level);
    level = bestAlpha * data[i] + (1 - bestAlpha) * level;
  }

  // Compute trend from last few points
  const recentWindow = Math.min(5, data.length);
  const recentSlope = (data[data.length - 1] - data[data.length - recentWindow]) / recentWindow;

  const residualStd = Math.sqrt(bestMSE);

  return {
    alpha: bestAlpha,
    beta: 0,
    gamma: 0,
    seasonLength: 1,
    level,
    trend: recentSlope,
    seasonal: [0],
    residualStd,
    metrics: computeRegressionMetrics(data, fitted),
    trainedAt: new Date().toISOString(),
  };
}

/**
 * Predict future values using trained Holt-Winters model
 */
function holtWintersPredict(weights, horizon) {
  const { level, trend, seasonal, seasonLength, residualStd } = weights;
  const predictions = [];

  for (let h = 1; h <= horizon; h++) {
    const si = (h - 1) % seasonLength;
    const seasonalComponent = seasonal?.[si] || 0;
    const value = level + trend * h + seasonalComponent;

    // Confidence intervals widen with horizon
    // Using prediction error that grows with sqrt(h)
    const errorMargin = 1.96 * residualStd * Math.sqrt(h);

    predictions.push({
      step: h,
      value,
      lower: value - errorMargin,
      upper: value + errorMargin,
    });
  }

  return predictions;
}

export {
  holtWintersTrain,
  holtWintersPredict,
  holtWintersFit,
  trainSimpleExponentialSmoothing,
};
