class MetricsCollector {
  constructor() {
    this.requestCounts = {};
    this.durations = {};
    this.errorCounts = {};
    this.activeRequests = 0;
    this.startTime = Date.now();
  }

  recordRequest(method, path, statusCode, durationMs) {
    const key = `${method}:${statusCode}`;
    this.requestCounts[key] = (this.requestCounts[key] || 0) + 1;

    const dKey = `${method}:${path}`;
    if (!this.durations[dKey]) this.durations[dKey] = { sum: 0, count: 0, max: 0 };
    const d = this.durations[dKey];
    d.sum += durationMs;
    d.count++;
    if (durationMs > d.max) d.max = durationMs;
  }

  recordError(type) {
    this.errorCounts[type] = (this.errorCounts[type] || 0) + 1;
  }

  incActive() { this.activeRequests++; }
  decActive() { this.activeRequests--; }

  toPrometheus(dbPool) {
    const lines = [];
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    lines.push('# HELP process_uptime_seconds Process uptime');
    lines.push('# TYPE process_uptime_seconds counter');
    lines.push(`process_uptime_seconds ${uptime}`);

    lines.push('# HELP http_requests_active Active HTTP requests');
    lines.push('# TYPE http_requests_active gauge');
    lines.push(`http_requests_active ${this.activeRequests}`);

    lines.push('# HELP http_requests_total Total HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    for (const [key, count] of Object.entries(this.requestCounts)) {
      const [method, status] = key.split(':');
      lines.push(`http_requests_total{method="${method}",status="${status}"} ${count}`);
    }

    lines.push('# HELP http_request_duration_ms Request duration');
    lines.push('# TYPE http_request_duration_ms summary');
    for (const [key, d] of Object.entries(this.durations)) {
      const [method, path] = key.split(':');
      const avg = d.count > 0 ? Math.round(d.sum / d.count) : 0;
      lines.push(`http_request_duration_ms{method="${method}",path="${path}",stat="avg"} ${avg}`);
      lines.push(`http_request_duration_ms{method="${method}",path="${path}",stat="max"} ${d.max}`);
    }

    lines.push('# HELP errors_total Application errors');
    lines.push('# TYPE errors_total counter');
    for (const [type, count] of Object.entries(this.errorCounts)) {
      lines.push(`errors_total{type="${type}"} ${count}`);
    }

    if (dbPool) {
      lines.push('# HELP db_pool_total Total pool connections');
      lines.push('# TYPE db_pool_total gauge');
      lines.push(`db_pool_total ${dbPool.totalCount || 0}`);
      lines.push(`db_pool_idle ${dbPool.idleCount || 0}`);
      lines.push(`db_pool_waiting ${dbPool.waitingCount || 0}`);
    }

    lines.push(`# HELP nodejs_heap_bytes Node.js heap usage`);
    lines.push(`# TYPE nodejs_heap_bytes gauge`);
    const mem = process.memoryUsage();
    lines.push(`nodejs_heap_bytes{type="used"} ${mem.heapUsed}`);
    lines.push(`nodejs_heap_bytes{type="total"} ${mem.heapTotal}`);
    lines.push(`nodejs_heap_bytes{type="rss"} ${mem.rss}`);

    return lines.join('\n') + '\n';
  }

  toJSON(dbPool) {
    return {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      activeRequests: this.activeRequests,
      requests: this.requestCounts,
      errors: this.errorCounts,
      database: {
        total: dbPool?.totalCount || 0,
        idle: dbPool?.idleCount || 0,
        waiting: dbPool?.waitingCount || 0,
      },
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }
}

export const metrics = new MetricsCollector();
