/**
 * Payment Gateway Service
 * Abstraction layer for multiple payment gateway providers
 */

// Gateway implementations will be imported here
import StripeGateway from './gateways/stripe.js';
import RazorpayGateway from './gateways/razorpay.js';
import PayPalGateway from './gateways/paypal.js';
import ManualGateway from './gateways/manual.js';
import BankTransferGateway from './gateways/bankTransfer.js';

class PaymentGatewayService {
  constructor() {
    this.gateways = {
      stripe: StripeGateway,
      razorpay: RazorpayGateway,
      paypal: PayPalGateway,
      manual: ManualGateway,
      bank_transfer: BankTransferGateway,
    };
  }

  /**
   * Get gateway instance
   */
  async getGateway(provider, config = null) {
    const GatewayClass = this.gateways[provider];
    if (!GatewayClass) {
      throw new Error(`Payment gateway '${provider}' not supported`);
    }
    
    // If config provided, use it; otherwise will use env vars
    return new GatewayClass(config);
  }

  /**
   * Get all available gateways
   */
  getAvailableGateways() {
    return Object.keys(this.gateways);
  }

  /**
   * Process payment
   */
  async processPayment(provider, paymentData) {
    const gateway = await this.getGateway(provider);
    return await gateway.processPayment(paymentData);
  }

  /**
   * Verify webhook
   */
  async verifyWebhook(provider, payload, signature) {
    const gateway = await this.getGateway(provider);
    if (!gateway.verifyWebhook) {
      return { valid: false, error: 'Webhook verification not supported' };
    }
    return await gateway.verifyWebhook(payload, signature);
  }

  /**
   * Handle webhook
   */
  async handleWebhook(provider, payload) {
    const gateway = await this.getGateway(provider);
    if (!gateway.handleWebhook) {
      return { processed: false, error: 'Webhook handling not supported' };
    }
    return await gateway.handleWebhook(payload);
  }

  /**
   * Create payment intent/order
   */
  async createPaymentIntent(provider, amount, currency, metadata = {}) {
    const gateway = await this.getGateway(provider);
    if (!gateway.createPaymentIntent) {
      throw new Error(`Payment intent creation not supported for ${provider}`);
    }
    return await gateway.createPaymentIntent(amount, currency, metadata);
  }

  /**
   * Refund payment
   */
  async refundPayment(provider, transactionId, amount = null) {
    const gateway = await this.getGateway(provider);
    if (!gateway.refundPayment) {
      throw new Error(`Refunds not supported for ${provider}`);
    }
    return await gateway.refundPayment(transactionId, amount);
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(provider, transactionId) {
    const gateway = await this.getGateway(provider);
    if (!gateway.getPaymentStatus) {
      throw new Error(`Status check not supported for ${provider}`);
    }
    return await gateway.getPaymentStatus(transactionId);
  }
}

export default new PaymentGatewayService();

