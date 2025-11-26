/**
 * Manual Payment Gateway Implementation
 * For checks, wire transfers, cash, etc.
 */

import BaseGateway from './baseGateway.js';

export default class ManualGateway extends BaseGateway {
  constructor(config = {}) {
    super(config);
    this.provider = 'manual';
  }

  /**
   * Create payment intent (manual approval required)
   */
  async createPaymentIntent(amount, currency, metadata = {}) {
    return {
      success: true,
      orderId: `manual_${Date.now()}`,
      amount: amount,
      currency: currency,
      requiresManualApproval: true,
      instructions: this.getPaymentInstructions(currency),
      metadata: metadata,
    };
  }

  /**
   * Process payment (manual - just creates pending record)
   */
  async processPayment(paymentData) {
    const { orderId, amount, currency, notes } = paymentData;
    
    return {
      success: true,
      status: 'pending',
      transactionId: orderId || `manual_${Date.now()}`,
      amount: amount,
      currency: currency,
      paymentMethod: 'manual',
      requiresApproval: true,
      notes: notes || 'Pending manual verification',
      metadata: {
        processedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Get payment instructions based on currency
   */
  getPaymentInstructions(currency = 'USD') {
    const instructions = {
      USD: {
        check: 'Send check to: [Your Business Address]',
        wire: 'Wire Transfer Details:\nAccount Name: [Your Business Name]\nAccount Number: [Account Number]\nRouting Number: [Routing Number]\nBank: [Bank Name]',
        cash: 'Contact us to arrange cash payment pickup',
      },
      INR: {
        neft: 'NEFT Transfer Details:\nAccount Name: [Your Business Name]\nAccount Number: [Account Number]\nIFSC Code: [IFSC Code]\nBank: [Bank Name]',
        upi: 'UPI ID: [Your UPI ID]\nOr scan QR code for payment',
        cash: 'Contact us for cash payment details',
      },
      EUR: {
        sepa: 'SEPA Transfer Details:\nIBAN: [Your IBAN]\nBIC: [Your BIC]\nAccount Holder: [Your Name]',
        cash: 'Contact us for cash payment arrangement',
      },
    };

    return instructions[currency] || instructions.USD;
  }

  /**
   * Verify webhook (not applicable for manual)
   */
  async verifyWebhook(payload, signature) {
    return { valid: false, error: 'Manual payments do not support webhooks' };
  }

  /**
   * Handle webhook (not applicable for manual)
   */
  async handleWebhook(payload) {
    return { processed: false, error: 'Manual payments do not support webhooks' };
  }

  /**
   * Refund payment
   */
  async refundPayment(transactionId, amount = null) {
    return {
      success: true,
      status: 'pending',
      refundId: `refund_${Date.now()}`,
      requiresManualApproval: true,
      notes: `Manual refund initiated for transaction ${transactionId}`,
    };
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionId) {
    // Manual payments status is managed in the database
    return {
      status: 'pending',
      requiresManualCheck: true,
    };
  }
}

