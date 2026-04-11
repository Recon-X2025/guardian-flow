/**
 * Stripe Payment Gateway Implementation
 */

import BaseGateway from './baseGateway.js';
import crypto from 'crypto';

export default class StripeGateway extends BaseGateway {
  constructor(config = {}) {
    super(config);
    this.provider = 'stripe';
    
    // Initialize Stripe SDK (will be installed: npm install stripe)
    // For now, using fetch API
    this.apiKey = config.apiKey || process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
    this.publishableKey = config.publishableKey || process.env.STRIPE_PUBLISHABLE_KEY;
    this.baseUrl = 'https://api.stripe.com/v1';
    this.webhookSecret = config.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(amount, currency, metadata = {}) {
    try {
      const formattedAmount = this.formatAmount(amount, currency);
      
      const response = await fetch(`${this.baseUrl}/payment_intents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: formattedAmount.toString(),
          currency: currency.toLowerCase(),
          metadata: JSON.stringify(metadata),
          automatic_payment_methods: JSON.stringify({ enabled: true }),
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create payment intent');
      }

      return {
        success: true,
        clientSecret: data.client_secret,
        paymentIntentId: data.id,
        publishableKey: this.publishableKey,
      };
    } catch (error) {
      console.error('Stripe createPaymentIntent error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process payment (already handled via client-side Stripe.js)
   */
  async processPayment(paymentData) {
    // For Stripe, payment is processed client-side via Stripe.js
    // This endpoint is for confirming payment intent
    const { paymentIntentId } = paymentData;
    
    try {
      const response = await fetch(`${this.baseUrl}/payment_intents/${paymentIntentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to retrieve payment intent');
      }

      return {
        success: data.status === 'succeeded',
        status: data.status,
        transactionId: data.id,
        amount: this.parseAmount(data.amount, data.currency),
        currency: data.currency,
        paymentMethod: data.payment_method_types?.[0] || 'card',
        metadata: data.metadata,
      };
    } catch (error) {
      console.error('Stripe processPayment error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify webhook signature using Stripe's HMAC-SHA256 scheme.
   *
   * Stripe sends a `Stripe-Signature` header with the format:
   *   t=<unix-timestamp>,v1=<hmac-sha256-hex>
   *
   * Verification:
   *   signed_payload = "<timestamp>.<raw_body>"
   *   expected = HMAC-SHA256(webhookSecret, signed_payload)
   *   compare expected against each v1= token in the header
   *
   * The timestamp is also checked to reject replays older than 5 minutes.
   *
   * @param {string|Buffer} payload   - Raw request body (must be the unparsed buffer)
   * @param {string}        signature - Value of the Stripe-Signature header
   */
  async verifyWebhook(payload, signature) {
    try {
      if (!this.webhookSecret) {
        return { valid: false, error: 'Webhook secret not configured' };
      }
      if (!signature) {
        return { valid: false, error: 'Missing Stripe-Signature header' };
      }

      // Parse header: t=<ts>,v1=<sig1>,v1=<sig2>,...
      const parts = Object.fromEntries(
        signature.split(',').map(part => {
          const idx = part.indexOf('=');
          return [part.slice(0, idx), part.slice(idx + 1)];
        })
      );

      const timestamp = parts.t;
      if (!timestamp) {
        return { valid: false, error: 'No timestamp in signature header' };
      }

      // Reject replays older than 5 minutes
      const ageSeconds = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
      if (ageSeconds > 300) {
        return { valid: false, error: 'Webhook timestamp too old (replay protection)' };
      }

      const rawBody = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;
      const signedPayload = `${timestamp}.${rawBody}`;

      const expected = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signedPayload, 'utf8')
        .digest('hex');

      // Collect all v1 signatures from the header and compare each
      const v1Sigs = signature.split(',')
        .filter(p => p.startsWith('v1='))
        .map(p => p.slice(3));

      const isValid = v1Sigs.some(
        sig => crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
      );

      if (!isValid) {
        return { valid: false, error: 'Signature mismatch' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Handle webhook event
   */
  async handleWebhook(payload) {
    try {
      const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          return {
            processed: true,
            transactionId: event.data.object.id,
            status: 'succeeded',
            amount: this.parseAmount(event.data.object.amount, event.data.object.currency),
            currency: event.data.object.currency,
          };
        
        case 'payment_intent.payment_failed':
          return {
            processed: true,
            transactionId: event.data.object.id,
            status: 'failed',
            error: event.data.object.last_payment_error?.message,
          };
        
        default:
          return { processed: false, message: 'Event type not handled' };
      }
    } catch (error) {
      return { processed: false, error: error.message };
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(transactionId, amount = null) {
    try {
      const body = {
        payment_intent: transactionId,
      };
      
      if (amount) {
        body.amount = this.formatAmount(amount);
      }

      const response = await fetch(`${this.baseUrl}/refunds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(body),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to process refund');
      }

      return {
        success: true,
        refundId: data.id,
        status: data.status,
        amount: this.parseAmount(data.amount, data.currency),
      };
    } catch (error) {
      console.error('Stripe refund error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionId) {
    try {
      const response = await fetch(`${this.baseUrl}/payment_intents/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to retrieve payment status');
      }

      return {
        status: data.status,
        amount: this.parseAmount(data.amount, data.currency),
        currency: data.currency,
      };
    } catch (error) {
      console.error('Stripe getPaymentStatus error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

