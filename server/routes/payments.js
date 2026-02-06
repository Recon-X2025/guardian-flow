import express from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { db } from '../db/client.js';
import { findOne, findMany, insertOne, updateOne, aggregate } from '../db/query.js';
import { randomUUID } from 'crypto';
import paymentGatewayService from '../services/paymentGateways.js';

const router = express.Router();

/**
 * Get available payment gateways
 * GET /api/payments/gateways
 */
router.get('/gateways', optionalAuth, async (req, res) => {
  try {
    const gateways = await findMany(
      'payment_gateways',
      { enabled: true },
      {
        projection: {
          id: 1, provider: 1, name: 1, description: 1,
          enabled: 1, test_mode: 1, supported_currencies: 1,
          supported_payment_methods: 1, config: 1,
        },
        sort: { provider: 1 },
      }
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
    res.status(500).json({ error: 'Failed to fetch gateways' });
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
    const invoice = await findOne('invoices', { id: invoiceId });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const paymentAmount = amount || invoice.total_amount;
    const paymentCurrency = currency || 'USD';

    // Get gateway config
    const gatewayConfig = await findOne('payment_gateways', {
      provider: gateway,
      enabled: true,
    });

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
    await insertOne('payment_transactions', {
      id: transactionId,
      invoice_id: invoiceId,
      gateway_provider: gateway,
      amount: paymentAmount,
      currency: paymentCurrency,
      status: 'pending',
      gateway_response: intentResult,
      customer_id: invoice.customer_id,
      metadata: {
        invoiceNumber: invoice.invoice_number,
        gateway: gateway,
      },
      created_at: new Date(),
    });

    res.json({
      success: true,
      transactionId,
      ...intentResult,
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
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
    const transaction = await findOne('payment_transactions', { id: transactionId });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Process payment via gateway
    const result = await paymentGatewayService.processPayment(gateway, paymentData);

    if (!result.success) {
      // Update transaction status to failed
      await updateOne(
        'payment_transactions',
        { id: transactionId },
        { status: 'failed', error_message: result.error || 'Payment failed', updated_at: new Date() }
      );

      return res.status(400).json({ error: result.error || 'Payment failed' });
    }

    // Update transaction
    const paymentStatus = result.status === 'succeeded' ? 'succeeded' :
                         result.status === 'pending' ? 'pending' : 'processing';

    await updateOne(
      'payment_transactions',
      { id: transactionId },
      {
        status: paymentStatus,
        gateway_transaction_id: result.transactionId,
        gateway_response: result,
        processed_at: new Date(),
        updated_at: new Date(),
      }
    );

    // Update invoice payment status if payment succeeded
    if (paymentStatus === 'succeeded') {
      await updateOne(
        'invoices',
        { id: transaction.invoice_id },
        {
          payment_status: 'paid',
          payment_received_at: new Date(),
          payment_amount: result.amount || transaction.amount,
          payment_method: result.paymentMethod || 'card',
          payment_transaction_id: transactionId,
          gateway_provider: gateway,
          updated_at: new Date(),
        }
      );

      // Create payment history entry
      await insertOne('payment_history', {
        id: randomUUID(),
        invoice_id: transaction.invoice_id,
        payment_amount: result.amount || transaction.amount,
        payment_method: result.paymentMethod || 'card',
        payment_status: 'paid',
        payment_reference: result.transactionId,
        processed_by: req.user.id,
        notes: `Payment processed via ${gateway}`,
        created_at: new Date(),
      });
    }

    // Get updated invoice
    const invoice = await findOne('invoices', { id: transaction.invoice_id });

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
    res.status(500).json({ error: 'Failed to process payment' });
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
    const invoice = await findOne('invoices', { id: invoiceId });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Create payment history entry
    const paymentHistoryDoc = {
      id: randomUUID(),
      invoice_id: invoiceId,
      payment_amount: paymentAmount,
      payment_method: paymentMethod || null,
      payment_status: paymentStatus,
      payment_reference: paymentReference || null,
      processed_by: req.user.id,
      notes: notes || null,
      created_at: new Date(),
    };
    const paymentHistory = await insertOne('payment_history', paymentHistoryDoc);

    // Get total paid via aggregation (replaces the SUM ... FILTER ... LEFT JOIN query)
    const totalPaidResult = await aggregate('payment_history', [
      { $match: { invoice_id: invoiceId, payment_status: { $in: ['paid', 'partial'] } } },
      { $group: { _id: null, total_paid: { $sum: '$payment_amount' } } },
    ]);
    const totalPaid = totalPaidResult.length > 0 ? totalPaidResult[0].total_paid : 0;

    // Fetch updated invoice and attach total_paid
    const updatedInvoice = await findOne('invoices', { id: invoiceId });
    if (updatedInvoice) {
      updatedInvoice.total_paid = totalPaid;
    }

    res.json({
      success: true,
      payment_history: paymentHistory,
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('Payment status update error:', error);
    res.status(500).json({ error: 'Unknown error' });
  }
});

/**
 * Get payment history for an invoice
 * GET /api/payments/history/:invoiceId
 */
router.get('/history/:invoiceId', authenticateToken, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    // Fetch payment history records
    const history = await findMany(
      'payment_history',
      { invoice_id: invoiceId },
      { sort: { payment_date: -1 } }
    );

    // Look up user info for each processed_by value (replaces LEFT JOIN users)
    const processedByIds = [...new Set(history.map(h => h.processed_by).filter(Boolean))];
    let usersMap = {};
    if (processedByIds.length > 0) {
      const users = await findMany('users', { id: { $in: processedByIds } }, {
        projection: { id: 1, email: 1, full_name: 1 },
      });
      usersMap = Object.fromEntries(users.map(u => [u.id, u]));
    }

    // Merge user info into history records
    const enrichedHistory = history.map(h => ({
      ...h,
      processed_by_email: usersMap[h.processed_by]?.email || null,
      processed_by_name: usersMap[h.processed_by]?.full_name || null,
    }));

    res.json({ payment_history: enrichedHistory });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Unknown error' });
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
    await insertOne('payment_webhook_logs', {
      id: webhookLogId,
      gateway_provider: gateway,
      payload: typeof req.body === 'string' ? JSON.parse(req.body) : req.body,
      created_at: new Date(),
    });

    // Verify webhook
    const verification = await paymentGatewayService.verifyWebhook(
      gateway,
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      signature
    );

    if (!verification.valid) {
      await updateOne(
        'payment_webhook_logs',
        { id: webhookLogId },
        { processed: false, error_message: verification.error || 'Invalid signature' }
      );
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    // Handle webhook
    const result = await paymentGatewayService.handleWebhook(gateway, req.body);

    if (result.processed && result.transactionId) {
      // Update transaction based on webhook
      await updateOne(
        'payment_transactions',
        { gateway_transaction_id: result.transactionId },
        {
          status: result.status,
          gateway_response: result,
          processed_at: new Date(),
          updated_at: new Date(),
        }
      );

      // Find the transaction to get its id for the webhook log
      const txn = await findOne('payment_transactions', { gateway_transaction_id: result.transactionId });

      // Update webhook log
      await updateOne(
        'payment_webhook_logs',
        { id: webhookLogId },
        { processed: true, transaction_id: txn ? txn.id : null }
      );

      // Update invoice if payment succeeded
      if (result.status === 'succeeded' && txn) {
        await updateOne(
          'invoices',
          { id: txn.invoice_id },
          {
            payment_status: 'paid',
            payment_received_at: new Date(),
            updated_at: new Date(),
          }
        );
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Generic webhook handler (legacy)
 * POST /api/payments/webhook
 * Requires HMAC signature verification via X-Webhook-Signature header.
 * The signature must be HMAC-SHA256(WEBHOOK_SECRET, raw body) encoded as hex.
 */
router.post('/webhook', async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-webhook-signature'];
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('WEBHOOK_SECRET not configured — rejecting legacy webhook');
      return res.status(503).json({ error: 'Webhook endpoint not configured' });
    }

    if (!signature) {
      return res.status(401).json({ error: 'Missing webhook signature' });
    }

    const { createHmac } = await import('crypto');
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const { invoiceId, paymentAmount, paymentMethod, paymentReference, paymentStatus } = req.body;

    if (!invoiceId || !paymentAmount || !paymentStatus) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify invoice exists
    const invoice = await findOne('invoices', { id: invoiceId });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Create payment history entry (webhook processed by system)
    const paymentHistoryDoc = {
      id: randomUUID(),
      invoice_id: invoiceId,
      payment_amount: paymentAmount,
      payment_method: paymentMethod || 'webhook',
      payment_status: paymentStatus,
      payment_reference: paymentReference || null,
      notes: `Payment received via webhook: ${paymentMethod || 'unknown'}`,
      created_at: new Date(),
    };
    const paymentHistory = await insertOne('payment_history', paymentHistoryDoc);

    // Get total paid via aggregation (replaces the SUM ... FILTER ... LEFT JOIN query)
    const totalPaidResult = await aggregate('payment_history', [
      { $match: { invoice_id: invoiceId, payment_status: { $in: ['paid', 'partial'] } } },
      { $group: { _id: null, total_paid: { $sum: '$payment_amount' } } },
    ]);
    const totalPaid = totalPaidResult.length > 0 ? totalPaidResult[0].total_paid : 0;

    // Fetch updated invoice and attach total_paid
    const updatedInvoice = await findOne('invoices', { id: invoiceId });
    if (updatedInvoice) {
      updatedInvoice.total_paid = totalPaid;
    }

    res.json({
      success: true,
      payment_history: paymentHistory,
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
