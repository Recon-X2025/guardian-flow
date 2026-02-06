import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, History, Loader2 } from 'lucide-react';
import { Invoice, PaymentHistoryItem } from './types';

interface InvoiceDetailDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentHistory: PaymentHistoryItem[];
  loadingPaymentHistory: boolean;
  formatCurrency: (amount: number) => string;
  onFetchPaymentHistory: () => void;
  onProcessPayment: () => void;
}

export function InvoiceDetailDialog({
  invoice,
  open,
  onOpenChange,
  paymentHistory,
  loadingPaymentHistory,
  formatCurrency,
  onFetchPaymentHistory,
  onProcessPayment,
}: InvoiceDetailDialogProps) {
  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invoice {invoice.invoice_number}</DialogTitle>
          <DialogDescription>
            Invoice details and payment information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Amount</p>
              <p className="text-lg font-bold">{formatCurrency(Number(invoice.total_amount))}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Payment Status</p>
              <Badge
                variant={
                  invoice.payment_status === 'paid' ? 'default' :
                  invoice.payment_status === 'partial' ? 'secondary' :
                  'destructive'
                }
              >
                {invoice.payment_status || invoice.status || 'pending'}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Created</p>
            <p className="text-sm text-muted-foreground">
              {new Date(invoice.created_at).toLocaleDateString()}
            </p>
            {invoice.payment_received_at && (
              <p className="text-sm text-muted-foreground mt-1">
                Paid: {new Date(invoice.payment_received_at).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Payment History */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Payment History</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={onFetchPaymentHistory}
                disabled={loadingPaymentHistory}
              >
                {loadingPaymentHistory ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <History className="h-4 w-4" />
                )}
              </Button>
            </div>
            {paymentHistory.length > 0 ? (
              <div className="space-y-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{formatCurrency(Number(payment.payment_amount))}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.payment_method || 'N/A'} - {new Date(payment.payment_date || payment.created_at).toLocaleDateString()}
                      </p>
                      {payment.payment_reference && (
                        <p className="text-xs text-muted-foreground">Ref: {payment.payment_reference}</p>
                      )}
                    </div>
                    <Badge
                      variant={
                        payment.payment_status === 'paid' ? 'default' :
                        payment.payment_status === 'partial' ? 'secondary' :
                        'destructive'
                      }
                    >
                      {payment.payment_status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                No payment history yet
              </p>
            )}
          </div>

          {invoice.payment_status !== 'paid' && (
            <Button
              className="w-full"
              onClick={onProcessPayment}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Now
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
