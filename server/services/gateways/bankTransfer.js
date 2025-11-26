/**
 * Bank Transfer / ACH Payment Gateway Implementation
 */

import BaseGateway from './baseGateway.js';

export default class BankTransferGateway extends BaseGateway {
  constructor(config = {}) {
    super(config);
    this.provider = 'bank_transfer';
    
    // Bank details from config or env
    this.bankDetails = config.bankDetails || {
      accountName: process.env.BANK_ACCOUNT_NAME,
      accountNumber: process.env.BANK_ACCOUNT_NUMBER,
      routingNumber: process.env.BANK_ROUTING_NUMBER,
      bankName: process.env.BANK_NAME,
      iban: process.env.BANK_IBAN,
      bic: process.env.BANK_BIC,
      ifsc: process.env.BANK_IFSC,
    };
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(amount, currency, metadata = {}) {
    return {
      success: true,
      orderId: `bank_${Date.now()}`,
      amount: amount,
      currency: currency,
      requiresManualVerification: true,
      bankDetails: this.getBankDetails(currency),
      instructions: this.getTransferInstructions(currency),
      metadata: {
        ...metadata,
        transferType: currency === 'INR' ? 'NEFT/RTGS' : currency === 'EUR' ? 'SEPA' : 'ACH/Wire',
      },
    };
  }

  /**
   * Process payment (creates pending record)
   */
  async processPayment(paymentData) {
    const { orderId, amount, currency, referenceNumber } = paymentData;
    
    return {
      success: true,
      status: 'pending',
      transactionId: orderId || `bank_${Date.now()}`,
      amount: amount,
      currency: currency,
      paymentMethod: currency === 'INR' ? 'neft' : currency === 'EUR' ? 'sepa' : 'ach',
      requiresVerification: true,
      referenceNumber: referenceNumber || 'Pending verification',
      notes: `Bank transfer pending verification. Reference: ${referenceNumber || 'N/A'}`,
      metadata: {
        processedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Get bank details for currency
   */
  getBankDetails(currency = 'USD') {
    const details = { ...this.bankDetails };
    
    if (currency === 'INR' && this.bankDetails.ifsc) {
      return {
        accountName: details.accountName,
        accountNumber: details.accountNumber,
        ifscCode: details.ifsc,
        bankName: details.bankName,
      };
    }
    
    if (currency === 'EUR' && this.bankDetails.iban) {
      return {
        accountName: details.accountName,
        iban: details.iban,
        bic: details.bic,
        bankName: details.bankName,
      };
    }
    
    // USD/Default
    return {
      accountName: details.accountName,
      accountNumber: details.accountNumber,
      routingNumber: details.routingNumber,
      bankName: details.bankName,
    };
  }

  /**
   * Get transfer instructions
   */
  getTransferInstructions(currency = 'USD') {
    const instructions = {
      USD: `Please transfer the amount via ACH or Wire Transfer to:
Account Name: ${this.bankDetails.accountName || '[Account Name]'}
Account Number: ${this.bankDetails.accountNumber || '[Account Number]'}
Routing Number: ${this.bankDetails.routingNumber || '[Routing Number]'}
Bank: ${this.bankDetails.bankName || '[Bank Name]'}

Please include the invoice number in the transfer reference.`,
      
      INR: `Please transfer the amount via NEFT/RTGS to:
Account Name: ${this.bankDetails.accountName || '[Account Name]'}
Account Number: ${this.bankDetails.accountNumber || '[Account Number]'}
IFSC Code: ${this.bankDetails.ifsc || '[IFSC Code]'}
Bank: ${this.bankDetails.bankName || '[Bank Name]'}

Please include the invoice number in the transfer reference.`,
      
      EUR: `Please transfer the amount via SEPA to:
Account Name: ${this.bankDetails.accountName || '[Account Name]'}
IBAN: ${this.bankDetails.iban || '[IBAN]'}
BIC: ${this.bankDetails.bic || '[BIC]'}
Bank: ${this.bankDetails.bankName || '[Bank Name]'}

Please include the invoice number in the transfer reference.`,
    };

    return instructions[currency] || instructions.USD;
  }

  /**
   * Verify webhook (not applicable)
   */
  async verifyWebhook(payload, signature) {
    return { valid: false, error: 'Bank transfers do not support webhooks' };
  }

  /**
   * Handle webhook (not applicable)
   */
  async handleWebhook(payload) {
    return { processed: false, error: 'Bank transfers do not support webhooks' };
  }

  /**
   * Refund payment
   */
  async refundPayment(transactionId, amount = null) {
    return {
      success: true,
      status: 'pending',
      refundId: `refund_${Date.now()}`,
      requiresManualProcessing: true,
      notes: `Bank transfer refund initiated for transaction ${transactionId}. Will be processed manually.`,
    };
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionId) {
    return {
      status: 'pending',
      requiresManualVerification: true,
    };
  }
}

