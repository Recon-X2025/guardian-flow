import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './utils/errorHandler.js';
import logger from './utils/logger.js';
import authRoutes from './routes/auth.js';
import dbRoutes from './routes/database.js';
import storageRoutes from './routes/storage.js';
import functionRoutes from './routes/functions.js';
import paymentsRoutes from './routes/payments.js';
import knowledgeBaseRoutes from './routes/knowledge-base.js';
import faqsRoutes from './routes/faqs.js';
import mlRoutesFactory from './routes/ml.js';
import aiRoutes from './routes/ai.js';
import securityMonitorRoutes from './routes/security-monitor.js';
import logFrontendErrorRoutes from './routes/log-frontend-error.js';
import slaMonitorRoutes from './routes/sla-monitor.js';
import partnerApiGatewayRoutes from './routes/partner-api-gateway.js';
import orgRoutes from './routes/org.js';
import flowspaceRoutes from './routes/flowspace.js';
import dexRoutes from './routes/dex.js';
import ssoRoutes from './routes/sso.js';
import currencyRoutes from './routes/currency.js';
import ledgerRoutes from './routes/ledger.js';
import skillsRoutes from './routes/skills.js';
import scheduleRoutes from './routes/schedule.js';
import customerBookingRoutes from './routes/customer-booking.js';
import customer360Routes from './routes/customer360.js';
import commsRoutes from './routes/comms.js';
import assetsRoutes from './routes/assets.js';
import connectorsRoutes from './routes/connectors.js';
import mlExperimentsRoutes from './routes/ml-experiments.js';
import xaiRoutes from './routes/xai.js';
import finetuneRoutes from './routes/finetune.js';
import visionRoutes from './routes/vision.js';
import assetsHealthRoutes from './routes/assets-health.js';
import knowledgeQueryRoutes from './routes/knowledge-query.js';
import anomaliesRoutes from './routes/anomalies.js';
import aiGovernanceRoutes from './routes/ai-governance.js';
import aiPromptsRoutes from './routes/ai-prompts.js';
import iotTelemetryRoutes from './routes/iot-telemetry.js';
import maintenanceTriggersRoutes from './routes/maintenance-triggers.js';
import revenueRecognitionRoutes from './routes/revenue-recognition.js';
import budgetingRoutes from './routes/budgeting.js';
import dexFlowsRoutes from './routes/dex-flows.js';
import slaEngineRoutes from './routes/sla-engine.js';
import customerSuccessRoutes from './routes/customer-success.js';
import esgRoutes from './routes/esg.js';
import digitalTwinRoutes from './routes/digital-twin.js';
import rulRoutes from './routes/rul.js';
import sandboxRoutes from './routes/sandbox.js';
import inventoryOptRoutes from './routes/inventory-optimisation.js';
import auditFrameworkRoutes from './routes/audit-framework.js';
import platformConfigRoutes from './routes/platform-config.js';
import federatedLearningRoutes from './routes/federated-learning.js';
import dexMarketplaceRoutes from './routes/dex-marketplace.js';
import neuroConsoleRoutes from './routes/neuro-console.js';
import whiteLabelRoutes from './routes/white-label.js';
import partnerGatewayV2Routes from './routes/partner-gateway-v2.js';
import reportingEngineRoutes from './routes/reporting-engine.js';
import fieldAppRoutes from './routes/field-app.js';
import observabilityRoutes from './routes/observability.js';
import dataResidencyRoutes from './routes/data-residency.js';
import aiEthicsRoutes from './routes/ai-ethics.js';
import e2eTestsRoutes from './routes/e2e-tests.js';
import launchReadinessRoutes from './routes/launch-readiness.js';
import cbmRoutes from './routes/cbm.js';
import webhookDeliveryRoutes from './routes/webhook-delivery.js';
import compliancePolicyRoutes from './routes/compliance-policy.js';
import modelPerformanceMonitorRoutes from './routes/model-performance-monitor.js';
import crewRoutes from './routes/crew.js';
import crowdRoutes from './routes/crowd.js';
import emailToWoRoutes from './routes/email-to-wo.js';
import workOrdersMultidayRoutes from './routes/work-orders-multiday.js';
import territoriesRoutes from './routes/territories.js';
import mfaRoutes from './routes/mfa.js';
import assetGraphRoutes from './routes/asset-graph.js';
import complianceCertsRoutes from './routes/compliance-certs.js';
import vehicleStockRoutes from './routes/vehicle-stock.js';
import accountsPayableRoutes from './routes/accounts-payable.js';
import supplierPortalRoutes from './routes/supplier-portal.js';
import fixedAssetsRoutes from './routes/fixed-assets.js';
import intercompanyRoutes from './routes/intercompany.js';
import eInvoiceRoutes from './routes/e-invoice.js';
import expensesRoutes from './routes/expenses.js';
import crmRoutes from './routes/crm.js';
import surveysRoutes from './routes/surveys.js';
import nlpQueryRoutes from './routes/nlp-query.js';
import anomalyRoutes from './routes/anomaly.js';
import webhooksRoutes from './routes/webhooks.js';
import { isConnected } from './db/client.js';
import { getAdapter } from './db/factory.js';
import { authenticateToken } from './middleware/auth.js';
import WebSocketManager from './websocket/server.js';
import { correlationId } from './middleware/correlationId.js';
import { metricsMiddleware } from './metrics/middleware.js';
import metricsRoutes from './routes/metrics.js';
import { validateSecrets } from './config/secrets.js';

dotenv.config();

// Validate required secrets before proceeding
try {
  validateSecrets();
} catch (err) {
  logger.error(err.message);
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const startTime = Date.now();

// Initialize WebSocket server
const wsManager = new WebSocketManager(server);
export { wsManager };

// Wire wsManager into anomaly stream singleton
import anomalyStream from './services/streaming/anomaly-stream.js';
anomalyStream.wsManager = wsManager;

const isProduction = process.env.NODE_ENV === 'production';

// Correlation ID and metrics
app.use(correlationId);
app.use(metricsMiddleware);

// Security headers via Helmet
app.use(helmet({
  contentSecurityPolicy: false, // CSP disabled — API-only server, no HTML rendering
  crossOriginEmbedderPolicy: false, // Allow cross-origin resources (CORS handles origin policy)
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
}));

// CORS — strict in production
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:8080'];

if (isProduction && !process.env.FRONTEND_URL) {
  logger.error('FRONTEND_URL must be set in production for CORS');
  process.exit(1);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin && !isProduction) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    logger.warn('CORS blocked', { origin });
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  maxAge: 86400,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting (disabled in development/test to avoid interfering with test suites)
const noOp = (req, res, next) => next();
const generalLimiter = isProduction ? rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }) : noOp;
const authLimiter = isProduction ? rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many auth attempts, try again later' } }) : noOp;
const mlTrainLimiter = isProduction ? rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false }) : noOp;

app.use('/api/', generalLimiter);

// Health check — comprehensive
const healthCheck = async (req, res) => {
  let dbStatus = 'unknown';
  if (isConnected()) {
    try {
      const adapter = await getAdapter();
      await adapter.ping();
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }
  } else {
    dbStatus = 'disconnected';
  }
  const status = dbStatus === 'connected' ? 'ok' : 'degraded';
  const response = {
    status,
    database: dbStatus,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  };
  // Only expose version in non-production (attackers can use it to find CVEs)
  if (!isProduction) {
    response.version = process.env.npm_package_version || '6.0.0';
  }
  res.status(status === 'ok' ? 200 : 503).json(response);
};
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/db', dbRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/functions', functionRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/faqs', faqsRoutes);
app.use('/api/ml/train', mlTrainLimiter);
app.use('/api/ml', mlRoutesFactory());
app.use('/api/ai', aiRoutes);
app.use('/api/security', securityMonitorRoutes);
app.use('/api/log-error', logFrontendErrorRoutes);
app.use('/api/sla', slaMonitorRoutes);
app.use('/api/partner', partnerApiGatewayRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/flowspace', flowspaceRoutes);
app.use('/api/dex', dexRoutes);
app.use('/api/sso', ssoRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/ledger', authenticateToken, ledgerRoutes);
app.use('/api/skills', authenticateToken, skillsRoutes);
app.use('/api/schedule', authenticateToken, scheduleRoutes);
app.use('/api/customer-booking', customerBookingRoutes);
app.use('/api/customer360', customer360Routes);
app.use('/api/comms', commsRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/connectors', connectorsRoutes);
app.use('/api/ml', mlExperimentsRoutes);
app.use('/api/ml', xaiRoutes);
app.use('/api/ai', finetuneRoutes);
app.use('/api/ai', visionRoutes);
app.use('/api/assets', assetsHealthRoutes);
app.use('/api/knowledge', knowledgeQueryRoutes);
app.use('/api/analytics', anomaliesRoutes);
app.use('/api/analytics', nlpQueryRoutes);
app.use('/api/anomaly', anomalyRoutes);
app.use('/api/webhooks', authenticateToken, webhooksRoutes);
app.use('/api/ai', aiGovernanceRoutes);
app.use('/api/ai', aiPromptsRoutes);
app.use('/api/iot', authenticateToken, iotTelemetryRoutes);
app.use('/api/maintenance-triggers', authenticateToken, maintenanceTriggersRoutes);
app.use('/api/rev-rec', authenticateToken, revenueRecognitionRoutes);
app.use('/api/budgets', authenticateToken, budgetingRoutes);
app.use('/api/dex-flows', authenticateToken, dexFlowsRoutes);
app.use('/api/sla-engine', authenticateToken, slaEngineRoutes);
app.use('/api/customer-success', authenticateToken, customerSuccessRoutes);
app.use('/api/esg', authenticateToken, esgRoutes);
app.use('/api/digital-twin', authenticateToken, digitalTwinRoutes);
app.use('/api/assets/:id/rul', rulRoutes);
app.use('/api/admin/sandbox', sandboxRoutes);
app.use('/api/inventory-opt', authenticateToken, inventoryOptRoutes);
app.use('/api/audit', authenticateToken, auditFrameworkRoutes);
app.use('/api/platform', authenticateToken, platformConfigRoutes);
app.use('/api/federated', authenticateToken, federatedLearningRoutes);
app.use('/api/dex-marketplace', authenticateToken, dexMarketplaceRoutes);
app.use('/api/neuro', authenticateToken, neuroConsoleRoutes);
app.use('/api/white-label', authenticateToken, whiteLabelRoutes);
app.use('/api/partner-v2', authenticateToken, partnerGatewayV2Routes);
app.use('/api/reporting', authenticateToken, reportingEngineRoutes);
app.use('/api/field-app', authenticateToken, fieldAppRoutes);
app.use('/api/observability', authenticateToken, observabilityRoutes);
app.use('/api/data-residency', authenticateToken, dataResidencyRoutes);
app.use('/api/ai-ethics', authenticateToken, aiEthicsRoutes);
app.use('/api/e2e', authenticateToken, e2eTestsRoutes);
app.use('/api/launch', authenticateToken, launchReadinessRoutes);
app.use('/api/cbm', authenticateToken, cbmRoutes);
app.use('/api/webhook-delivery', authenticateToken, webhookDeliveryRoutes);
app.use('/api/compliance', compliancePolicyRoutes);
app.use('/api/model-performance', modelPerformanceMonitorRoutes);
app.use('/api/work-orders', crewRoutes);
app.use('/api/crowd', crowdRoutes);
app.use('/api/work-orders', crowdRoutes); // provides /:id/assign-crowd
app.use('/api/work-orders', authenticateToken, emailToWoRoutes);
app.use('/api/work-orders', workOrdersMultidayRoutes);
app.use('/api/territories', authenticateToken, territoriesRoutes);
app.use('/api/auth/mfa', authLimiter, mfaRoutes);
app.use('/api/assets', assetGraphRoutes);
app.use('/api/assets', complianceCertsRoutes);
app.use('/api/technicians', authenticateToken, vehicleStockRoutes);
app.use('/api/ap', authenticateToken, accountsPayableRoutes);
app.use('/api/suppliers', supplierPortalRoutes);
app.use('/api/finance/fixed-assets', authenticateToken, fixedAssetsRoutes);
app.use('/api/finance/intercompany', authenticateToken, intercompanyRoutes);
app.use('/api/finance/consolidation', authenticateToken, intercompanyRoutes);
app.use('/api/finance/invoices', authenticateToken, eInvoiceRoutes);
app.use('/api/expenses', authenticateToken, expensesRoutes);
app.use('/api/crm', authenticateToken, crmRoutes);
app.use('/api/surveys', surveysRoutes); // /respond/:token is public
app.use('/metrics', metricsRoutes);

// API v1 alias — forward /api/v1/* to /api/*
app.use('/api/v1', (req, res, next) => {
  req.url = req.url; // already at correct path after stripping /api/v1
  next('route');
});

// Frontend error reporting
app.post('/api/errors', express.json(), (req, res) => {
  const { message, stack, source, context } = req.body || {};
  logger.error('Frontend error', { message, stack, source, context });
  res.json({ received: true });
});

// Fallback for unmigrated functions
app.post('/api/functions/:functionName', authenticateToken, async (req, res) => {
  const { functionName } = req.params;
  res.status(501).json({
    error: `Function ${functionName} not yet implemented`,
    message: 'This function handler needs to be migrated to a regular API route'
  });
});

// API 404 handler
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling
app.use(errorHandler);

// Uncaught error handlers
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { error: String(reason) });
});

// Start server
server.listen(PORT, () => {
  logger.info('Server started', { port: PORT, database: process.env.DB_NAME || 'guardianflow', nodeEnv: process.env.NODE_ENV || 'development' });
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
function shutdown(signal) {
  logger.info('Shutdown initiated', { signal });

  server.close(async () => {
    logger.info('HTTP server closed');

    // Close WebSocket
    if (wsManager && wsManager.wss) {
      wsManager.wss.close();
      logger.info('WebSocket server closed');
    }

    // Close DB connection via adapter
    try {
      const adapter = await getAdapter();
      await adapter.close();
      logger.info('Database connection closed');
    } catch {
      // ignore
    }
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
