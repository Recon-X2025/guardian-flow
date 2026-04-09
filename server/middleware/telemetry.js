import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';
import { trackEvent } from '../services/analytics.js';

/**
 * Factory that returns Express middleware recording every HTTP request
 * into the function_telemetry collection.
 */
export function telemetryMiddleware(securityLevel = 'authenticated') {
  return (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const executionTimeMs = Date.now() - startTime;
      const statusCode = res.statusCode;
      const status =
        statusCode < 400 ? 'success' : statusCode >= 500 ? 'error' : 'warning';

      const tenantId = req.user?.tenantId || null;
      const userId = req.user?.id || null;

      (async () => {
        try {
          const adapter = await getAdapter();
          await adapter.insertOne('function_telemetry', {
            id: randomUUID(),
            function_name: `${req.method} ${req.route?.path || req.path}`,
            execution_time_ms: executionTimeMs,
            status,
            error_message: null,
            security_level: securityLevel,
            tenant_id: tenantId,
            user_id: userId,
            ip_address: req.ip || req.headers['x-forwarded-for'] || null,
            user_agent: req.headers['user-agent'] || null,
            created_at: new Date(),
          });
        } catch (err) {
          logger.error('telemetryMiddleware insert failed', { error: err.message });
        }
      })();

      trackEvent({
        tenantId,
        eventType: 'api_request',
        eventCategory: 'user_action',
        entityType: null,
        entityId: null,
        userId,
        metadata: {
          method: req.method,
          path: req.route?.path || req.path,
          status_code: statusCode,
          execution_time_ms: executionTimeMs,
        },
      });
    });

    next();
  };
}
