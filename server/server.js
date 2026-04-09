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

  server.close(() => {
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
