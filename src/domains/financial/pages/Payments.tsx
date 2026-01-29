import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, CreditCard, TrendingUp, AlertCircle, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { useCurrency } from '@/domains/shared/hooks/useCurrency';

export default function Payments() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      const result = await apiClient
        .from('invoices')
        .select(`
          *,
          work_order:work_orders(wo_number, ticket:tickets(customer_name, unit_serial))
        `)
        .in('status', ['draft', 'sent', 'overdue'])
        .order('created_at', { ascending: false })
        .then();

      if (result.error) throw result.error;
      const { data } = result;
      
      // If no data, use mock data
      if (!data || data.length === 0) {
        const mockPendingInvoices = [
          {
            id: 'mock-pay-1',
            invoice_number: 'INV-2025-002',
            status: 'sent',
            total_amount: 1200.00,
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            work_order: { wo_number: 'WO-1235', ticket: { customer_name: 'TechStart Inc', unit_serial: 'TS-123789' } }
          },
          {
            id: 'mock-pay-2',
            invoice_number: 'INV-2025-003',
            status: 'overdue',
            total_amount: 552.50,
            created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            work_order: { wo_number: 'WO-1236', ticket: { customer_name: 'Global Services LLC', unit_serial: 'GS-456123' } }
          },
          {
            id: 'mock-pay-3',
            invoice_number: 'INV-2025-006',
            status: 'sent',
            total_amount: 780.00,
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            work_order: { wo_number: 'WO-1239', ticket: { customer_name: 'Premier Industries', unit_serial: 'PI-159753' } }
          },
          {
            id: 'mock-pay-4',
            invoice_number: 'INV-2025-007',
            status: 'draft',
            total_amount: 925.00,
            created_at: new Date().toISOString(),
            work_order: { wo_number: 'WO-1240', ticket: { customer_name: 'Advanced Tech Co', unit_serial: 'AT-357159' } }
          }
        ];
        setInvoices(mockPendingInvoices);
      } else {
        setInvoices(data);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading payments',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async (invoiceId: string) => {
    try {
      const response = await apiClient.functions.invoke('process-invoice-payment', {
        body: {
          invoiceId,
          paymentMethod: 'credit_card',
          transactionId: `TXN-${Date.now()}`,
          amount: invoices.find(inv => inv.id === invoiceId)?.total_amount
        }
      });

      if (response.error) throw response.error;

      toast({
        title: 'Payment Processed',
        description: 'Payment completed successfully',
      });

      fetchPendingPayments();
    } catch (error: any) {
      toast({
        title: 'Payment Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const totalPending = invoices.filter(inv => ['draft', 'sent'].includes(inv.status)).reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const overdueCount = invoices.filter(inv => inv.status === 'overdue').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground">Process customer payments and manage transactions</p>
        </div>
        <Button>
          <CreditCard className="mr-2 h-4 w-4" />
          Configure Payment Gateway
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground">{invoices.length} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.5%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Outstanding Invoices</CardTitle>
              <CardDescription>Process payments for invoices</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search payments..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-2" />
              <p>All invoices paid! No pending payments.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}</span>
                      <Badge variant="outline" className={invoice.status === 'overdue' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-warning/10 text-warning border-warning/20'}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Customer:</span> {invoice.work_order?.ticket?.customer_name || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Amount:</span> <span className="font-bold text-foreground">{formatCurrency(Number(invoice.total_amount))}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Due: {new Date(invoice.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleProcessPayment(invoice.id)}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Process Payment
                    </Button>
                    <Button variant="outline" size="sm">
                      View Invoice
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Gateway Integration
          </CardTitle>
          <CardDescription>Connect your payment processor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Guardian Flow supports multiple payment processors:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg bg-card">
                <p className="font-semibold mb-1">Stripe</p>
                <p className="text-xs text-muted-foreground">Full PCI compliance, global coverage</p>
              </div>
              <div className="p-4 border rounded-lg bg-card">
                <p className="font-semibold mb-1">Custom Gateway</p>
                <p className="text-xs text-muted-foreground">Integrate your preferred processor</p>
              </div>
              <div className="p-4 border rounded-lg bg-card">
                <p className="font-semibold mb-1">ACH/Wire Transfer</p>
                <p className="text-xs text-muted-foreground">Direct bank transfers</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure payment methods in Settings → Integrations
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
