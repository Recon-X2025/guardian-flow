import express from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { query, getOne, getMany } from '../db/query.js';
import { randomUUID } from 'crypto';
import paymentGatewayService from '../services/paymentGateways.js';

const router = express.Router();

/**
 * Get available payment gateways
 * GET /api/payments/gateways
 */
router.get('/gateways', optionalAuth, async (req, res) => {
  try {
    const gateways = await getMany(
      `SELECT id, provider, name, description, enabled, test_mode, 
       supported_currencies, supported_payment_methods, config
       FROM payment_gateways
       WHERE enabled = true
       ORDER BY provider`
    );

    // Format for frontend (don't expose sensitive credentials)
    const formattedGateways = gateways.map(gw => ({
      id: gw.id,
      provider: gw.provider,
      name: gw.name,
      description: gw.description,
      testMode: gw.test_mode,
      supportedCurrencies: gw.supported_currencies || [],
      supportedPaymentMethods: gw.supported_payment_methods || [],
      // Only include public config (like publishable keys)
      publicConfig: gw.config?.public || {},
    }));

    res.json({ gateways: formattedGateways });
  } catch (error) {
    console.error('Get gateways error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch gateways' });
  }
});

/**
 * Create payment intent/order
 * POST /api/payments/create-intent
 */
router.post('/create-intent', authenticateToken, async (req, res) => {
  try {
    const { invoiceId, gateway, amount, currency = 'USD' } = req.body;

    if (!invoiceId || !gateway) {
      return res.status(400).json({ error: 'invoiceId and gateway are required' });
    }

    // Get invoice
    const invoice = await getOne('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const paymentAmount = amount || invoice.total_amount;
    const paymentCurrency = currency || 'USD';

    // Get gateway config
    const gatewayConfig = await getOne(
      `SELECT * FROM payment_gateways WHERE provider = $1 AND enabled = true`,
      [gateway]
    );

    if (!gatewayConfig) {
      return res.status(400).json({ error: 'Payment gateway not available' });
    }

    // Create payment intent via gateway service
    const intentResult = await paymentGatewayService.createPaymentIntent(
      gateway,
      paymentAmount,
      paymentCurrency,
      {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        customerId: invoice.customer_id,
        referenceId: invoice.invoice_number,
      }
    );

    if (!intentResult.success) {
      return res.status(400).json({ error: intentResult.error || 'Failed to create payment intent' });
    }

    // Create transaction record
    const transactionId = randomUUID();
    await query(
      `INSERT INTO payment_transactions (
        id, invoice_id, gateway_provider, amount, currency, 
        status, gateway_response, customer_id, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
      [
        transactionId,
        invoiceId,
        gateway,
        paymentAmount,
        paymentCurrency,
        'pending',
        JSON.stringify(intentResult),
        invoice.customer_id,
        JSON.stringify({
          invoiceNumber: invoice.invoice_number,
          gateway: gateway,
        }),
      ]
    );

    res.json({
      success: true,
      transactionId,
      ...intentResult,
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment intent' });
  }
});

/**
 * Process/Confirm payment
 * POST /api/payments/process
 */
router.post('/process', authenticateToken, async (req, res) => {
  try {
    const { transactionId, gateway, paymentData } = req.body;

    if (!transactionId || !gateway) {
      return res.status(400).json({ error: 'transactionId and gateway are required' });
    }

    // Get transaction
    const transaction = await getOne(
      'SELECT * FROM payment_transactions WHERE id = $1',
      [transactionId]
    );

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Process payment via gateway
    const result = await paymentGatewayService.processPayment(gateway, paymentData);

    if (!result.success) {
      // Update transaction status to failed
      await query(
        `UPDATE payment_transactions 
         SET status = 'failed', error_message = $1, updated_at = now()
         WHERE id = $2`,
        [result.error || 'Payment failed', transactionId]
      );

      return res.status(400).json({ error: result.error || 'Payment failed' });
    }

    // Update transaction
    const paymentStatus = result.status === 'succeeded' ? 'succeeded' : 
                         result.status === 'pending' ? 'pending' : 'processing';

    await query(
      `UPDATE payment_transactions 
       SET status = $1, gateway_transaction_id = $2, 
           gateway_response = $3, processed_at = now(), updated_at = now()
       WHERE id = $4`,
      [
        paymentStatus,
        result.transactionId,
        JSON.stringify(result),
        transactionId,
      ]
    );

    // Update invoice payment status if payment succeeded
    if (paymentStatus === 'succeeded') {
      await query(
        `UPDATE invoices 
         SET payment_status = 'paid', 
             payment_received_at = now(),
             payment_amount = $1,
             payment_method = $2,
             payment_transaction_id = $3,
             gateway_provider = $4,
             updated_at = now()
         WHERE id = $5`,
        [
          result.amount || transaction.amount,
          result.paymentMethod || 'card',
          transactionId,
          gateway,
          transaction.invoice_id,
        ]
      );

      // Create payment history entry
      await query(
        `INSERT INTO payment_history (
          id, invoice_id, payment_amount, payment_method, 
          payment_status, payment_reference, processed_by, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
        [
          randomUUID(),
          transaction.invoice_id,
          result.amount || transaction.amount,
          result.paymentMethod || 'card',
          'paid',
          result.transactionId,
          req.user.id,
          `Payment processed via ${gateway}`,
        ]
      );
    }

    // Get updated invoice
    const invoice = await getOne('SELECT * FROM invoices WHERE id = $1', [transaction.invoice_id]);

    res.json({
      success: true,
      transaction: {
        id: transactionId,
        status: paymentStatus,
        ...result,
      },
      invoice,
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ error: error.message || 'Failed to process payment' });
  }
});

/**
 * Update payment status for an invoice
 * POST /api/payments/update-status
 */
router.post('/update-status', authenticateToken, async (req, res) => {
  try {
    const { invoiceId, paymentAmount, paymentMethod, paymentReference, paymentStatus, notes } = req.body;

    if (!invoiceId || !paymentAmount || !paymentStatus) {
      return res.status(400).json({ error: 'invoiceId, paymentAmount, and paymentStatus are required' });
    }

    // Validate payment status
    const validStatuses = ['pending', 'paid', 'partial', 'failed', 'refunded'];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({ error: `Invalid payment status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Get invoice to verify it exists
    const invoice = await getOne('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Create payment history entry
    const paymentHistory = await query(
      `INSERT INTO payment_history (
        id, invoice_id, payment_amount, payment_method, 
        payment_status, payment_reference, processed_by, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
      RETURNING *`,
      [
        randomUUID(),
        invoiceId,
        paymentAmount,
        paymentMethod || null,
        paymentStatus,
        paymentReference || null,
        req.user.id,
        notes || null,
      ]
    );

    // Get updated invoice with payment status
    const updatedInvoice = await getOne(
      `SELECT i.*, 
       COALESCE(SUM(ph.payment_amount) FILTER (WHERE ph.payment_status IN ('paid', 'partial')), 0) as total_paid
       FROM invoices i
       LEFT JOIN payment_history ph ON ph.invoice_id = i.id
       WHERE i.id = $1
       GROUP BY i.id`,
      [invoiceId]
    );

    res.json({
      success: true,
      payment_history: paymentHistory.rows[0],
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('Payment status update error:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

/**
 * Get payment history for an invoice
 * GET /api/payments/history/:invoiceId
 */
router.get('/history/:invoiceId', authenticateToken, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const history = await getMany(
      `SELECT ph.*, u.email as processed_by_email, u.full_name as processed_by_name
       FROM payment_history ph
       LEFT JOIN users u ON ph.processed_by = u.id
       WHERE ph.invoice_id = $1
       ORDER BY ph.payment_date DESC`,
      [invoiceId]
    );

    res.json({ payment_history: history });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

/**
 * Gateway webhook handler
 * POST /api/payments/webhook/:gateway
 */
router.post('/webhook/:gateway', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const { gateway } = req.params;
    const signature = req.headers['x-signature'] || req.headers['stripe-signature'] || req.headers['razorpay-signature'];

    // Log webhook
    const webhookLogId = randomUUID();
    await query(
      `INSERT INTO payment_webhook_logs (id, gateway_provider, payload, created_at)
       VALUES ($1, $2, $3, now())`,
      [webhookLogId, gateway, JSON.stringify(req.body)]
    );

    // Verify webhook
    const verification = await paymentGatewayService.verifyWebhook(
      gateway,
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      signature
    );

    if (!verification.valid) {
      await query(
        `UPDATE payment_webhook_logs SET processed = false, error_message = $1 WHERE id = $2`,
        [verification.error || 'Invalid signature', webhookLogId]
      );
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    // Handle webhook
    const result = await paymentGatewayService.handleWebhook(gateway, req.body);

    if (result.processed && result.transactionId) {
      // Update transaction based on webhook
      await query(
        `UPDATE payment_transactions 
         SET status = $1, gateway_response = $2, processed_at = now(), updated_at = now()
         WHERE gateway_transaction_id = $3`,
        [result.status, JSON.stringify(result), result.transactionId]
      );

      // Update webhook log
      await query(
        `UPDATE payment_webhook_logs 
         SET processed = true, transaction_id = (
           SELECT id FROM payment_transactions WHERE gateway_transaction_id = $1
         ) WHERE id = $2`,
        [result.transactionId, webhookLogId]
      );

      // Update invoice if payment succeeded
      if (result.status === 'succeeded') {
        const transaction = await getOne(
          'SELECT invoice_id FROM payment_transactions WHERE gateway_transaction_id = $1',
          [result.transactionId]
        );

        if (transaction) {
          await query(
            `UPDATE invoices 
             SET payment_status = 'paid', payment_received_at = now(), updated_at = now()
             WHERE id = $1`,
            [transaction.invoice_id]
          );
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({ error: error.message || 'Webhook processing failed' });
  }
});

/**
 * Generic webhook handler (legacy)
 * POST /api/payments/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const { invoiceId, paymentAmount, paymentMethod, paymentReference, paymentStatus } = req.body;

    if (!invoiceId || !paymentAmount || !paymentStatus) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify invoice exists
    const invoice = await getOne('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Create payment history entry (webhook processed by system)
    const paymentHistory = await query(
      `INSERT INTO payment_history (
        id, invoice_id, payment_amount, payment_method, 
        payment_status, payment_reference, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
      RETURNING *`,
      [
        randomUUID(),
        invoiceId,
        paymentAmount,
        paymentMethod || 'webhook',
        paymentStatus,
        paymentReference || null,
        `Payment received via webhook: ${paymentMethod || 'unknown'}`,
      ]
    );

    // Get updated invoice
    const updatedInvoice = await getOne(
      `SELECT i.*, 
       COALESCE(SUM(ph.payment_amount) FILTER (WHERE ph.payment_status IN ('paid', 'partial')), 0) as total_paid
       FROM invoices i
       LEFT JOIN payment_history ph ON ph.invoice_id = i.id
       WHERE i.id = $1
       GROUP BY i.id`,
      [invoiceId]
    );

    res.json({
      success: true,
      payment_history: paymentHistory.rows[0],
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

export default router;
