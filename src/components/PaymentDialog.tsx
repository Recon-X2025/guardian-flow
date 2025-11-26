import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Building2, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';

interface PaymentGateway {
  id: string;
  provider: string;
  name: string;
  description?: string;
  testMode: boolean;
  supportedCurrencies: string[];
  supportedPaymentMethods: string[];
  publicConfig?: any;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    total_amount: number;
    currency?: string;
  };
  onSuccess?: () => void;
}

export function PaymentDialog({ open, onOpenChange, invoice, onSuccess }: PaymentDialogProps) {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>('');
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      fetchGateways();
    }
  }, [open]);

  const fetchGateways = async () => {
    try {
      const response = await apiClient.request('/api/payments/gateways', { method: 'GET' });
      if (response.error) throw response.error;
      setGateways(response.data?.gateways || []);
      
      // Auto-select first gateway
      if (response.data?.gateways?.length > 0) {
        setSelectedGateway(response.data.gateways[0].provider);
      }
    } catch (error: any) {
      console.error('Error fetching gateways:', error);
    }
  };

  const selectedGatewayData = gateways.find(g => g.provider === selectedGateway);

  const handleCreateIntent = async () => {
    if (!selectedGateway) {
      toast({
        title: 'Select Payment Method',
        description: 'Please select a payment gateway',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.request('/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: invoice.id,
          gateway: selectedGateway,
          amount: invoice.total_amount,
          currency: invoice.currency || 'USD',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.error) throw response.error;

      const intent = response.data;
      setPaymentIntent(intent);

      // Handle gateway-specific payment flows
      if (selectedGateway === 'stripe' && intent.clientSecret) {
        // Stripe will be handled via Stripe.js on the frontend
        handleStripePayment(intent);
      } else if (selectedGateway === 'razorpay' && intent.orderId) {
        handleRazorpayPayment(intent);
      } else if (selectedGateway === 'paypal' && intent.approvalUrl) {
        // Redirect to PayPal
        window.location.href = intent.approvalUrl;
      } else if (selectedGateway === 'manual' || selectedGateway === 'bank_transfer') {
        handleManualPayment(intent);
      }
    } catch (error: any) {
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to initiate payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async (intent: any) => {
    // Load Stripe.js dynamically if not already loaded
    try {
      if (!(window as any).Stripe) {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(() => reject(new Error('Stripe.js load timeout')), 10000);
        });
      }

      const Stripe = (window as any).Stripe;
      if (!intent.publishableKey) {
        throw new Error('Stripe publishable key not configured');
      }

      const stripe = Stripe(intent.publishableKey);
      
      // Redirect to Stripe Checkout or use Payment Element
      // For simplicity, we'll use a redirect-based approach
      toast({
        title: 'Redirecting to Stripe',
        description: 'You will be redirected to complete your payment securely.',
      });

      // In a production app, you might use Stripe Checkout Session or Payment Element
      // For now, we'll show a modal with payment instructions
      // The actual payment confirmation will happen via webhook
      
      // Store payment intent for later confirmation
      localStorage.setItem('stripe_payment_intent', JSON.stringify({
        clientSecret: intent.clientSecret,
        paymentIntentId: intent.paymentIntentId,
        invoiceId: invoice.id,
      }));

      // Open Stripe Checkout (if you have a checkout session endpoint)
      // Or display card element for direct payment
      showStripeCardElement(intent);
    } catch (error: any) {
      toast({
        title: 'Stripe Error',
        description: error.message || 'Failed to initialize Stripe',
        variant: 'destructive',
      });
    }
  };

  const showStripeCardElement = async (intent: any) => {
    // This would show Stripe Elements form
    // For now, we'll use a simplified flow that processes payment via backend
    toast({
      title: 'Stripe Payment Method',
      description: 'Stripe integration is configured. Payment will be processed via secure form.',
    });
    
    // In production, implement full Stripe Elements form here
    // This requires additional UI components for card input
    setPaymentIntent(intent);
  };

  const handleRazorpayPayment = async (intent: any) => {
    try {
      // Load Razorpay Checkout script dynamically if not already loaded
      if (!(window as any).Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(() => reject(new Error('Razorpay script load timeout')), 10000);
        });
      }

      const Razorpay = (window as any).Razorpay;
      
      if (!intent.keyId || !intent.orderId) {
        throw new Error('Razorpay configuration incomplete');
      }

      const options = {
        key: intent.keyId,
        amount: intent.amount, // Amount in paise (for INR) or smallest currency unit
        currency: intent.currency,
        order_id: intent.orderId,
        name: 'Guardian Flow',
        description: `Payment for Invoice ${invoice.invoice_number}`,
        prefill: {
          // Could prefill with customer details if available
        },
        handler: async function(response: any) {
          // Payment successful
          await confirmRazorpayPayment(response, intent);
        },
        modal: {
          ondismiss: function() {
            // User closed the checkout form
            toast({
              title: 'Payment Cancelled',
              description: 'You cancelled the payment process.',
              variant: 'destructive',
            });
          }
        }
      };

      const razorpay = new Razorpay(options);
      razorpay.open();
      
      // Store payment intent for confirmation
      localStorage.setItem('razorpay_payment_intent', JSON.stringify({
        orderId: intent.orderId,
        invoiceId: invoice.id,
        transactionId: intent.orderId,
      }));
    } catch (error: any) {
      toast({
        title: 'Razorpay Error',
        description: error.message || 'Failed to initialize Razorpay',
        variant: 'destructive',
      });
    }
  };

  const confirmRazorpayPayment = async (razorpayResponse: any, intent: any) => {
    try {
      setLoading(true);
      
      // Verify and process payment via backend
      const response = await apiClient.request('/api/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          transactionId: intent.orderId,
          gateway: 'razorpay',
          paymentData: {
            orderId: intent.orderId,
            paymentId: razorpayResponse.razorpay_payment_id,
            razorpaySignature: razorpayResponse.razorpay_signature,
            amount: intent.amount,
            currency: intent.currency,
          },
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Payment Successful!',
        description: 'Your payment has been processed successfully.',
      });

      localStorage.removeItem('razorpay_payment_intent');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to confirm payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualPayment = async (intent: any) => {
    // Manual payments require reference number
    if (!referenceNumber) {
      toast({
        title: 'Reference Required',
        description: 'Please provide a payment reference number',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.request('/api/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          transactionId: intent.orderId || intent.transactionId,
          gateway: selectedGateway,
          paymentData: {
            orderId: intent.orderId || intent.transactionId,
            amount: invoice.total_amount,
            currency: invoice.currency || 'USD',
            referenceNumber,
            notes,
          },
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Payment Submitted',
        description: 'Your payment is pending verification. We will update you once confirmed.',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to submit payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getGatewayIcon = (provider: string) => {
    switch (provider) {
      case 'stripe':
      case 'razorpay':
      case 'paypal':
        return <CreditCard className="h-5 w-5" />;
      case 'manual':
      case 'bank_transfer':
        return <Building2 className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  const isManualGateway = selectedGateway === 'manual' || selectedGateway === 'bank_transfer';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pay Invoice {invoice.invoice_number}</DialogTitle>
          <DialogDescription>
            Select a payment method to complete your payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Amount Due</p>
                  <p className="text-2xl font-bold">{formatCurrency(invoice.total_amount)}</p>
                </div>
                {invoice.currency && (
                  <Badge variant="outline">{invoice.currency}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gateway Selection */}
          {!paymentIntent && (
            <>
              <div>
                <Label className="text-base font-semibold mb-3 block">Select Payment Method</Label>
                <RadioGroup value={selectedGateway} onValueChange={setSelectedGateway}>
                  <div className="space-y-3">
                    {gateways.map((gateway) => (
                      <Card key={gateway.id} className={`cursor-pointer transition-colors ${
                        selectedGateway === gateway.provider ? 'border-primary' : ''
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-4">
                            <RadioGroupItem value={gateway.provider} id={gateway.provider} className="mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {getGatewayIcon(gateway.provider)}
                                <Label htmlFor={gateway.provider} className="font-semibold cursor-pointer">
                                  {gateway.name}
                                </Label>
                                {gateway.testMode && (
                                  <Badge variant="secondary" className="text-xs">Test Mode</Badge>
                                )}
                              </div>
                              {gateway.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {gateway.description}
                                </p>
                              )}
                              <div className="flex gap-2 mt-2">
                                {gateway.supportedPaymentMethods.map((method) => (
                                  <Badge key={method} variant="outline" className="text-xs">
                                    {method}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Manual Payment Fields */}
              {isManualGateway && selectedGatewayData && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base">Payment Instructions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {paymentIntent?.instructions && (
                      <div className="bg-card p-4 rounded-lg">
                        <pre className="text-sm whitespace-pre-wrap font-mono">
                          {JSON.stringify(paymentIntent.instructions, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div>
                      <Label htmlFor="reference">Reference Number *</Label>
                      <Input
                        id="reference"
                        placeholder="Transaction/Check/Wire reference number"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any additional information about this payment"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateIntent} 
                  disabled={loading || !selectedGateway}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Continue to Payment
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Payment Intent Created (for gateways requiring external processing) */}
          {paymentIntent && !isManualGateway && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6 text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                <div>
                  <h3 className="font-semibold text-lg">Payment Intent Created</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedGateway === 'stripe' && 'Stripe integration requires frontend Stripe.js setup.'}
                    {selectedGateway === 'razorpay' && 'Razorpay integration requires Razorpay checkout script.'}
                    {selectedGateway === 'paypal' && 'Redirecting to PayPal...'}
                  </p>
                </div>
                <Button variant="outline" onClick={() => {
                  setPaymentIntent(null);
                  setSelectedGateway('');
                }}>
                  Change Payment Method
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

