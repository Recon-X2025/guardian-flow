/**
 * ML Utilities — shared foundation for all ML modules
 */

function sigmoid(z) {
  if (z > 500) return 1;
  if (z < -500) return 0;
  return 1 / (1 + Math.exp(-z));
}

function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function std(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function normalize(values) {
  const m = mean(values);
  const s = std(values) || 1;
  return {
    normalized: values.map(v => (v - m) / s),
    mean: m,
    std: s,
  };
}

function normalizeWithParams(values, featureMean, featureStd) {
  return values.map(v => (v - featureMean) / (featureStd || 1));
}

function normalizeMatrix(X) {
  const nFeatures = X[0].length;
  const means = [];
  const stds = [];
  for (let j = 0; j < nFeatures; j++) {
    const col = X.map(row => row[j]);
    const m = mean(col);
    const s = std(col) || 1;
    means.push(m);
    stds.push(s);
  }
  const normalized = X.map(row =>
    row.map((v, j) => (v - means[j]) / stds[j])
  );
  return { normalized, means, stds };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function trainTestSplit(X, y, testRatio = 0.2) {
  const indices = shuffle(Array.from({ length: X.length }, (_, i) => i));
  const splitAt = Math.floor(X.length * (1 - testRatio));
  const trainIdx = indices.slice(0, splitAt);
  const testIdx = indices.slice(splitAt);
  return {
    Xtrain: trainIdx.map(i => X[i]),
    Xtest: testIdx.map(i => X[i]),
    ytrain: trainIdx.map(i => y[i]),
    ytest: testIdx.map(i => y[i]),
  };
}

/**
 * Logistic regression via gradient descent
 */
function logisticRegressionTrain(X, y, { lr = 0.1, epochs = 500, lambda = 0.01 } = {}) {
  const n = X.length;
  const d = X[0].length;
  const weights = new Array(d).fill(0);
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const dw = new Array(d).fill(0);
    let db = 0;

    for (let i = 0; i < n; i++) {
      const z = dotProduct(weights, X[i]) + bias;
      const pred = sigmoid(z);
      const err = pred - y[i];

      for (let j = 0; j < d; j++) {
        dw[j] += err * X[i][j];
      }
      db += err;
    }

    for (let j = 0; j < d; j++) {
      weights[j] -= lr * (dw[j] / n + lambda * weights[j]);
    }
    bias -= lr * (db / n);
  }

  return { weights, bias };
}

function logisticRegressionPredict(model, X) {
  return X.map(row => {
    const z = dotProduct(model.weights, row) + model.bias;
    return sigmoid(z);
  });
}

function crossValidate(trainFn, X, y, k = 5) {
  const n = X.length;
  const indices = shuffle(Array.from({ length: n }, (_, i) => i));
  const foldSize = Math.floor(n / k);
  const foldMetrics = [];

  for (let fold = 0; fold < k; fold++) {
    const testStart = fold * foldSize;
    const testEnd = fold === k - 1 ? n : (fold + 1) * foldSize;
    const testIdx = indices.slice(testStart, testEnd);
    const trainIdx = [...indices.slice(0, testStart), ...indices.slice(testEnd)];

    const Xtrain = trainIdx.map(i => X[i]);
    const ytrain = trainIdx.map(i => y[i]);
    const Xtest = testIdx.map(i => X[i]);
    const ytest = testIdx.map(i => y[i]);

    const model = trainFn(Xtrain, ytrain);
    const preds = logisticRegressionPredict(model, Xtest);
    const predLabels = preds.map(p => p >= 0.5 ? 1 : 0);
    foldMetrics.push(computeClassificationMetrics(ytest, predLabels));
  }

  const avgMetrics = {};
  const keys = Object.keys(foldMetrics[0]);
  for (const key of keys) {
    avgMetrics[key] = mean(foldMetrics.map(m => m[key]));
  }
  return avgMetrics;
}

function computeClassificationMetrics(yTrue, yPred) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === 1 && yPred[i] === 1) tp++;
    else if (yTrue[i] === 0 && yPred[i] === 1) fp++;
    else if (yTrue[i] === 1 && yPred[i] === 0) fn++;
    else tn++;
  }
  const accuracy = (tp + tn) / (tp + fp + fn + tn) || 0;
  const precision = tp / (tp + fp) || 0;
  const recall = tp / (tp + fn) || 0;
  const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
  return { accuracy, precision, recall, f1 };
}

function computeRegressionMetrics(yTrue, yPred) {
  const n = yTrue.length;
  let sse = 0, sae = 0, sst = 0;
  const yMean = mean(yTrue);
  for (let i = 0; i < n; i++) {
    const err = yTrue[i] - yPred[i];
    sse += err * err;
    sae += Math.abs(err);
    sst += (yTrue[i] - yMean) ** 2;
  }
  return {
    mse: sse / n,
    mae: sae / n,
    r2: sst > 0 ? 1 - sse / sst : 0,
  };
}

export {
  sigmoid,
  dotProduct,
  mean,
  std,
  normalize,
  normalizeWithParams,
  normalizeMatrix,
  shuffle,
  trainTestSplit,
  logisticRegressionTrain,
  logisticRegressionPredict,
  crossValidate,
  computeClassificationMetrics,
  computeRegressionMetrics,
};
