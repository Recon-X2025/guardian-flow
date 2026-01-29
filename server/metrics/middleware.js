import { metrics } from './collector.js';

export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  metrics.incActive();

  const onFinish = () => {
    const duration = Date.now() - start;
    const path = req.route?.path || req.baseUrl || req.path;
    metrics.recordRequest(req.method, path, res.statusCode, duration);
    metrics.decActive();
    res.removeListener('finish', onFinish);
  };

  res.on('finish', onFinish);
  next();
}
