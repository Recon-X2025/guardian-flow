/**
 * Razorpay Payment Gateway Implementation
 * Popular in India, supports UPI, cards, wallets, netbanking
 */

import BaseGateway from './baseGateway.js';
import crypto from 'crypto';

export default class RazorpayGateway extends BaseGateway {
  constructor(config = {}) {
    super(config);
    this.provider = 'razorpay';
    
    this.keyId = config.keyId || process.env.RAZORPAY_KEY_ID;
    this.keySecret = config.keySecret || process.env.RAZORPAY_KEY_SECRET;
    this.baseUrl = config.testMode !== false 
      ? 'https://api.razorpay.com/v1'
      : 'https://api.razorpay.com/v1';
  }

  /**
   * Create payment order
   */
  async createPaymentIntent(amount, currency, metadata = {}) {
    try {
      const formattedAmount = this.formatAmount(amount, currency);
      
      const orderData = {
        amount: formattedAmount,
        currency: currency.toUpperCase(),
        receipt: metadata.receipt || `receipt_${Date.now()}`,
        notes: metadata,
      };

      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.description || 'Failed to create order');
      }

      return {
        success: true,
        orderId: data.id,
        amount: data.amount,
        currency: data.currency,
        keyId: this.keyId,
        metadata: {
          receipt: data.receipt,
          status: data.status,
        },
      };
    } catch (error) {
      console.error('Razorpay createOrder error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify payment signature
   */
  verifyPaymentSignature(orderId, paymentId, signature) {
    try {
      const payload = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
      );
    } catch (error) {
      console.error('Razorpay signature verification error:', error);
      return false;
    }
  }

  /**
   * Process payment (verify payment)
   */
  async processPayment(paymentData) {
    const { orderId, paymentId, signature } = paymentData;
    
    try {
      // Verify signature first
      if (!this.verifyPaymentSignature(orderId, paymentId, signature)) {
        return {
          success: false,
          error: 'Invalid payment signature',
        };
      }

      // Fetch payment details from Razorpay
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.description || 'Failed to retrieve payment');
      }

      return {
        success: data.status === 'authorized' || data.status === 'captured',
        status: data.status,
        transactionId: data.id,
        orderId: data.order_id,
        amount: this.parseAmount(data.amount, data.currency),
        currency: data.currency,
        paymentMethod: data.method || 'card',
        metadata: data.notes || {},
      };
    } catch (error) {
      console.error('Razorpay processPayment error:', error);
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
      if (!this.keySecret || !signature) {
        return { valid: false, error: 'Missing webhook secret or signature' };
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(payload)
        .digest('hex');
      
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
      );

      return { valid: isValid };
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
      const entity = event.payload?.payment?.entity || event.payload?.entity;
      
      if (!entity) {
        return { processed: false, message: 'No payment entity found' };
      }

      switch (event.event) {
        case 'payment.authorized':
        case 'payment.captured':
          return {
            processed: true,
            transactionId: entity.id,
            orderId: entity.order_id,
            status: entity.status === 'captured' ? 'succeeded' : 'authorized',
            amount: this.parseAmount(entity.amount, entity.currency),
            currency: entity.currency,
          };
        
        case 'payment.failed':
          return {
            processed: true,
            transactionId: entity.id,
            status: 'failed',
            error: entity.error_description || 'Payment failed',
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
      const refundData = {
        amount: amount ? this.formatAmount(amount) : null,
      };

      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      
      const response = await fetch(`${this.baseUrl}/payments/${transactionId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refundData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.description || 'Failed to process refund');
      }

      return {
        success: true,
        refundId: data.id,
        status: data.status,
        amount: this.parseAmount(data.amount, data.currency),
      };
    } catch (error) {
      console.error('Razorpay refund error:', error);
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
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      
      const response = await fetch(`${this.baseUrl}/payments/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.description || 'Failed to retrieve payment status');
      }

      return {
        status: data.status,
        amount: this.parseAmount(data.amount, data.currency),
        currency: data.currency,
      };
    } catch (error) {
      console.error('Razorpay getPaymentStatus error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

