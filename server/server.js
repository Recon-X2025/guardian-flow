import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
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
import pool from './db/client.js';
import { authenticateToken } from './middleware/auth.js';
import WebSocketManager from './websocket/server.js';
import { correlationId } from './middleware/correlationId.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const startTime = Date.now();

// Initialize WebSocket server
const wsManager = new WebSocketManager(server);
export { wsManager };

// Correlation ID
app.use(correlationId);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:8080'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting (disabled in development/test to avoid interfering with test suites)
const isProduction = process.env.NODE_ENV === 'production';
const noOp = (req, res, next) => next();
const generalLimiter = isProduction ? rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }) : noOp;
const authLimiter = isProduction ? rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many auth attempts, try again later' } }) : noOp;
const mlTrainLimiter = isProduction ? rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false }) : noOp;

app.use('/api/', generalLimiter);

// Health check — comprehensive
const healthCheck = async (req, res) => {
  let dbStatus = 'connected';
  try {
    await pool.query('SELECT 1');
  } catch {
    dbStatus = 'error';
  }
  const status = dbStatus === 'connected' ? 'ok' : 'degraded';
  res.status(status === 'ok' ? 200 : 503).json({
    status,
    database: dbStatus,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '6.0.0',
    timestamp: new Date().toISOString(),
  });
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
app.use('/api/ml', mlRoutesFactory(pool));

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
    message: 'This edge function needs to be migrated to a regular API route'
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

    // Close database pool
    pool.end().then(() => {
      logger.info('Database pool closed');
      process.exit(0);
    }).catch(() => {
      process.exit(1);
    });
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
