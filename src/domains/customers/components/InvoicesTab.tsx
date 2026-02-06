import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Eye, Receipt } from 'lucide-react';
import { Invoice } from './types';

interface InvoicesTabProps {
  invoices: Invoice[];
  totalPending: number;
  formatCurrency: (amount: number) => string;
  onProcessPayment: (invoice: Invoice) => void;
  onViewDetails: (invoice: Invoice) => void;
}

export function InvoicesTab({
  invoices,
  totalPending,
  formatCurrency,
  onProcessPayment,
  onViewDetails,
}: InvoicesTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>View and pay your invoices</CardDescription>
          </div>
          <Badge variant="outline" className="text-lg px-3 py-1">
            Outstanding: {formatCurrency(totalPending)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {invoices.length > 0 ? (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{invoice.invoice_number}</span>
                    <Badge variant={invoice.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {invoice.payment_status || invoice.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Amount: {formatCurrency(Number(invoice.total_amount))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(invoice.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    {invoice.payment_status && (
                      <Badge
                        variant={
                          invoice.payment_status === 'paid' ? 'default' :
                          invoice.payment_status === 'partial' ? 'secondary' :
                          'destructive'
                        }
                      >
                        {invoice.payment_status}
                      </Badge>
                    )}
                    {invoice.payment_status !== 'paid' && (
                      <Button size="sm" onClick={() => onProcessPayment(invoice)}>
                        <CreditCard className="h-4 w-4 mr-1" />
                        Pay Now
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(invoice)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No invoices found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
