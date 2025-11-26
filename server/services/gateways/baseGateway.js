/**
 * Base Payment Gateway Class
 * All gateway implementations should extend this
 */

export default class BaseGateway {
  constructor(config = {}) {
    this.config = config;
    this.provider = this.constructor.name.toLowerCase().replace('gateway', '');
  }

  /**
   * Process payment - must be implemented by each gateway
   */
  async processPayment(paymentData) {
    throw new Error('processPayment must be implemented by gateway');
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhook(payload, signature) {
    return { valid: false, error: 'Webhook verification not implemented' };
  }

  /**
   * Handle webhook event
   */
  async handleWebhook(payload) {
    return { processed: false, error: 'Webhook handling not implemented' };
  }

  /**
   * Create payment intent/order
   */
  async createPaymentIntent(amount, currency, metadata = {}) {
    throw new Error('createPaymentIntent must be implemented by gateway');
  }

  /**
   * Refund payment
   */
  async refundPayment(transactionId, amount = null) {
    throw new Error('refundPayment must be implemented by gateway');
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionId) {
    throw new Error('getPaymentStatus must be implemented by gateway');
  }

  /**
   * Format amount for gateway (convert to smallest currency unit if needed)
   */
  formatAmount(amount, currency = 'USD') {
    // Most gateways expect amount in smallest currency unit (cents, paise, etc.)
    const multipliers = {
      USD: 100,  // cents
      EUR: 100,  // cents
      GBP: 100,  // pence
      INR: 100,  // paise
    };
    return Math.round(amount * (multipliers[currency] || 100));
  }

  /**
   * Parse amount from gateway response
   */
  parseAmount(amount, currency = 'USD') {
    const divisors = {
      USD: 100,
      EUR: 100,
      GBP: 100,
      INR: 100,
    };
    return amount / (divisors[currency] || 100);
  }
}

