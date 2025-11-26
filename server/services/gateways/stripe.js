/**
 * Stripe Payment Gateway Implementation
 */

import BaseGateway from './baseGateway.js';

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
   * Verify webhook signature
   */
  async verifyWebhook(payload, signature) {
    try {
      // Stripe webhook verification requires crypto
      // For now, return basic validation
      // In production, use Stripe's webhook signature verification
      if (!this.webhookSecret || !signature) {
        return { valid: false, error: 'Missing webhook secret or signature' };
      }

      // TODO: Implement proper Stripe webhook signature verification
      // const stripe = require('stripe')(this.apiKey);
      // const event = stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      
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

