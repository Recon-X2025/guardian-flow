/**
 * @file server/routes/currency.js
 * @description Currency exchange rate and conversion API.
 *
 * Routes
 * ------
 * GET /api/currency/rates              — list all rates (optionally base=CCY)
 * GET /api/currency/convert            — convert amount (?amount=&from=&to=)
 */

import express from 'express';
import { getExchangeRates, convertAmount, getSupportedCurrencies } from '../services/currency.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/currency/rates
router.get('/rates', (req, res) => {
  try {
    const base = req.query.base || 'GBP';
    const rates = getExchangeRates(base);
    res.json({ base: base.toUpperCase(), rates, supported: getSupportedCurrencies() });
  } catch (err) {
    logger.warn('Currency rates error', { error: err.message });
    res.status(400).json({ error: err.message });
  }
});

// GET /api/currency/convert?amount=100&from=USD&to=GBP
router.get('/convert', (req, res) => {
  try {
    const { amount, from, to } = req.query;
    if (amount === undefined || !from || !to) {
      return res.status(400).json({ error: 'amount, from, and to query params are required' });
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      return res.status(400).json({ error: 'amount must be a number' });
    }
    const result = convertAmount(numericAmount, from, to);
    res.json({
      amount: numericAmount,
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      result: Math.round(result * 10000) / 10000,
    });
  } catch (err) {
    logger.warn('Currency convert error', { error: err.message });
    res.status(400).json({ error: err.message });
  }
});

export default router;
