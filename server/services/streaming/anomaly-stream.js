export class AnomalyStream {
  constructor(wsManager) {
    this.wsManager = wsManager;
    this.assetStates = new Map();
  }

  processReading(tenantId, assetId, metric, value, timestamp) {
    const key = `${tenantId}:${assetId}:${metric}`;
    let state = this.assetStates.get(key);

    if (!state) {
      state = { cusum_pos: 0, cusum_neg: 0, mean: value, stddev: 1, count: 0 };
      this.assetStates.set(key, state);
    }

    const alpha = 0.1;
    const k = 0.5;
    const h = 5;

    if (state.count === 0) {
      state.mean = value;
    } else {
      state.mean = alpha * value + (1 - alpha) * state.mean;
    }

    state.cusum_pos = Math.max(0, state.cusum_pos + (value - state.mean) / state.stddev - k);
    state.cusum_neg = Math.max(0, state.cusum_neg - (value - state.mean) / state.stddev - k);
    state.count++;

    if (state.cusum_pos > h || state.cusum_neg > h) {
      const direction = state.cusum_pos > h ? 'high' : 'low';

      if (this.wsManager) {
        this.wsManager.broadcast(`tenant:${tenantId}`, {
          type: 'anomaly_alert',
          assetId,
          metric,
          value,
          threshold: h,
          timestamp,
          direction,
        });
      }

      state.cusum_pos = 0;
      state.cusum_neg = 0;

      return { anomaly: true, direction, value, threshold: h };
    }

    return { anomaly: false };
  }
}

const anomalyStream = new AnomalyStream(null);
export default anomalyStream;
