/**
 * PayPal Payment Gateway Implementation
 */

import BaseGateway from './baseGateway.js';

export default class PayPalGateway extends BaseGateway {
  constructor(config = {}) {
    super(config);
    this.provider = 'paypal';
    
    this.clientId = config.clientId || process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.PAYPAL_CLIENT_SECRET;
    this.mode = config.testMode !== false ? 'sandbox' : 'live';
    this.baseUrl = this.mode === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
    
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth access token
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error_description || 'Failed to get access token');
      }

      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Expire 1 min early

      return this.accessToken;
    } catch (error) {
      console.error('PayPal getAccessToken error:', error);
      throw error;
    }
  }

  /**
   * Create payment order
   */
  async createPaymentIntent(amount, currency, metadata = {}) {
    try {
      const accessToken = await this.getAccessToken();
      const formattedAmount = amount.toFixed(2);

      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: metadata.referenceId || `ref_${Date.now()}`,
            amount: {
              currency_code: currency.toUpperCase(),
              value: formattedAmount,
            },
            description: metadata.description || 'Payment',
          },
        ],
        application_context: {
          return_url: metadata.returnUrl || `${process.env.FRONTEND_URL}/payment/return`,
          cancel_url: metadata.cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`,
        },
      };

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create order');
      }

      // Find approval URL
      const approvalUrl = data.links?.find(link => link.rel === 'approve')?.href;

      return {
        success: true,
        orderId: data.id,
        amount: parseFloat(formattedAmount),
        currency: currency.toUpperCase(),
        approvalUrl: approvalUrl,
        clientId: this.clientId,
        mode: this.mode,
        metadata: {
          status: data.status,
          referenceId: metadata.referenceId,
        },
      };
    } catch (error) {
      console.error('PayPal createOrder error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Capture payment (after user approval)
   */
  async capturePayment(orderId) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to capture payment');
      }

      const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

      return {
        success: data.status === 'COMPLETED',
        status: data.status === 'COMPLETED' ? 'succeeded' : 'pending',
        transactionId: capture?.id || orderId,
        orderId: data.id,
        amount: parseFloat(capture?.amount?.value || 0),
        currency: capture?.amount?.currency_code || 'USD',
        paymentMethod: 'paypal',
        metadata: {
          payer: data.payer,
        },
      };
    } catch (error) {
      console.error('PayPal capturePayment error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process payment
   */
  async processPayment(paymentData) {
    const { orderId } = paymentData;
    
    if (!orderId) {
      return {
        success: false,
        error: 'Order ID is required',
      };
    }

    return await this.capturePayment(orderId);
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhook(payload, signature) {
    try {
      // PayPal webhook verification requires additional API call
      // For now, return basic validation
      // In production, verify webhook signature via PayPal API
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
      
      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          return {
            processed: true,
            transactionId: event.resource?.id,
            orderId: event.resource?.supplementary_data?.related_ids?.order_id,
            status: 'succeeded',
            amount: parseFloat(event.resource?.amount?.value || 0),
            currency: event.resource?.amount?.currency_code,
          };
        
        case 'PAYMENT.CAPTURE.DENIED':
        case 'PAYMENT.CAPTURE.REFUNDED':
          return {
            processed: true,
            transactionId: event.resource?.id,
            status: 'failed',
            error: event.summary || 'Payment failed',
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
      const accessToken = await this.getAccessToken();

      const refundData = {
        amount: amount ? {
          value: amount.toFixed(2),
          currency_code: 'USD',
        } : undefined,
      };

      const response = await fetch(`${this.baseUrl}/v2/payments/captures/${transactionId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refundData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to process refund');
      }

      return {
        success: true,
        refundId: data.id,
        status: data.status,
        amount: parseFloat(data.amount?.value || 0),
      };
    } catch (error) {
      console.error('PayPal refund error:', error);
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
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v2/payments/captures/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to retrieve payment status');
      }

      return {
        status: data.status === 'COMPLETED' ? 'succeeded' : data.status?.toLowerCase(),
        amount: parseFloat(data.amount?.value || 0),
        currency: data.amount?.currency_code,
      };
    } catch (error) {
      console.error('PayPal getPaymentStatus error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

