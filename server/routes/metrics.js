import express from 'express';
import { metrics } from '../metrics/collector.js';
import { client } from '../db/client.js';

const router = express.Router();

// Prometheus text format
router.get('/', (req, res) => {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(metrics.toPrometheus(client));
});

// JSON format for dashboards
router.get('/json', (req, res) => {
  res.json(metrics.toJSON(client));
});

export default router;
