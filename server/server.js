import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { errorHandler } from './utils/errorHandler.js';
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

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket server
const wsManager = new WebSocketManager(server);
export { wsManager };

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:8080'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/db', dbRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/functions', functionRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/faqs', faqsRoutes);
app.use('/api/ml', mlRoutesFactory(pool));

// Fallback for unmigrated functions
app.post('/api/functions/:functionName', authenticateToken, async (req, res) => {
  const { functionName } = req.params;
  res.status(501).json({ 
    error: `Function ${functionName} not yet implemented`,
    message: 'This edge function needs to be migrated to a regular API route'
  });
});

// Error handling - use standardized error handler
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME || 'guardianflow'}`);
  console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}/ws`);
});

