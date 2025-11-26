import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Download, DollarSign, Clock, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { InvoiceDetailDialog } from '@/components/InvoiceDetailDialog';
import { ComprehensiveInvoiceDetailDialog } from '@/components/ComprehensiveInvoiceDetailDialog';
import { InvoiceFormDialog } from '@/components/InvoiceFormDialog';
import { useActionPermissions } from '@/hooks/useActionPermissions';
import jsPDF from 'jspdf';

export default function Invoicing() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const invoicePerms = useActionPermissions('invoices');
  const isViewOnly = !invoicePerms.create && !invoicePerms.edit && !invoicePerms.execute;

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await apiClient
        .from('invoices')
        .select(`
          *,
          work_order:work_orders(wo_number, ticket:tickets(customer_name, unit_serial))
        `)
        .order('created_at', { ascending: false })
        .then();

      if (error) throw error;
      
      // If no data, use mock data
      if (!data || data.length === 0) {
        const mockInvoices = [
          {
            id: 'mock-1',
            invoice_number: 'INV-2025-001',
            status: 'paid',
            subtotal: 850.00,
            penalties: 42.50,
            total_amount: 807.50,
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            work_order: { wo_number: 'WO-1234', ticket: { customer_name: 'Acme Corp', unit_serial: 'AC-789456' } }
          },
          {
            id: 'mock-2',
            invoice_number: 'INV-2025-002',
            status: 'sent',
            subtotal: 1200.00,
            penalties: 0,
            total_amount: 1200.00,
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            work_order: { wo_number: 'WO-1235', ticket: { customer_name: 'TechStart Inc', unit_serial: 'TS-123789' } }
          },
          {
            id: 'mock-3',
            invoice_number: 'INV-2025-003',
            status: 'overdue',
            subtotal: 650.00,
            penalties: 97.50,
            total_amount: 552.50,
            hold_reason: 'Pending fraud investigation',
            created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            work_order: { wo_number: 'WO-1236', ticket: { customer_name: 'Global Services LLC', unit_serial: 'GS-456123' } }
          },
          {
            id: 'mock-4',
            invoice_number: 'INV-2025-004',
            status: 'draft',
            subtotal: 425.00,
            penalties: 0,
            total_amount: 425.00,
            created_at: new Date().toISOString(),
            work_order: { wo_number: 'WO-1237', ticket: { customer_name: 'Metro Repair', unit_serial: 'MR-987654' } }
          },
          {
            id: 'mock-5',
            invoice_number: 'INV-2025-005',
            status: 'paid',
            subtotal: 1500.00,
            penalties: 0,
            total_amount: 1500.00,
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            work_order: { wo_number: 'WO-1238', ticket: { customer_name: 'Elite Solutions', unit_serial: 'ES-741852' } }
          }
        ];
        setInvoices(mockInvoices);
      } else {
        setInvoices(data);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading invoices',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="h-4 w-4" />;
      case 'sent': return <Clock className="h-4 w-4" />;
      case 'draft': return <Clock className="h-4 w-4" />;
      case 'overdue': return <AlertCircle className="h-4 w-4" />;
      case 'hold': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-success/10 text-success border-success/20';
      case 'sent': return 'bg-warning/10 text-warning border-warning/20';
      case 'draft': return 'bg-muted/10 text-muted-foreground border-muted/20';
      case 'overdue': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'hold': return 'bg-muted/10 text-muted-foreground border-muted/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalPending = invoices.filter(inv => ['draft', 'sent'].includes(inv.status)).reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalOverdue = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + Number(inv.total_amount), 0);

  const handleDownload = (invoice: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('INVOICE', 105, 20, { align: 'center' });
    
    // Invoice details
    doc.setFontSize(12);
    doc.text(`Invoice Number: ${invoice.invoice_number}`, 20, 40);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, 50);
    
    // Customer info
    doc.text(`Customer: ${invoice.work_order?.ticket?.customer_name || 'N/A'}`, 20, 60);
    doc.text(`Unit: ${invoice.work_order?.ticket?.unit_serial || 'N/A'}`, 20, 70);
    
    // Divider
    doc.line(20, 80, 190, 80);
    
    // Financial details
    doc.text(`Subtotal: ${formatCurrency(Number(invoice.subtotal))}`, 20, 90);
    
    if (invoice.penalties && Number(invoice.penalties) > 0) {
      doc.setTextColor(255, 0, 0);
      doc.text(`Penalties: -${formatCurrency(Number(invoice.penalties))}`, 20, 100);
      doc.setTextColor(0, 0, 0);
    }
    
    // Divider
    doc.line(20, 110, 190, 110);
    
    // Total
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${formatCurrency(Number(invoice.total_amount))}`, 20, 125);
    
    // Footer
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Generated by Guardian Flow Field Service Platform', 105, 280, { align: 'center' });
    
    // Save
    doc.save(`${invoice.invoice_number || 'invoice'}.pdf`);

    toast({
      title: "Invoice Downloaded",
      description: `${invoice.invoice_number}.pdf has been downloaded.`,
    });
  };

  return (
    <div className="space-y-6">
      {isViewOnly && (
        <Alert>
          <AlertDescription>
            <strong>View-Only Mode:</strong> You have read-only access to Invoices.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoicing</h1>
          <p className="text-muted-foreground">Manage customer invoices and payments</p>
        </div>
        {!isViewOnly && invoicePerms.create && (
          <Button onClick={() => setInvoiceFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPending)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOverdue)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>View and manage customer invoices</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search invoices..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No invoices found</div>
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
                      <Badge variant="outline" className={getStatusColor(invoice.status)}>
                        {getStatusIcon(invoice.status)}
                        <span className="ml-1">{invoice.status}</span>
                      </Badge>
                      {invoice.payment_status && (
                        <Badge 
                          variant="outline" 
                          className={
                            invoice.payment_status === 'paid' ? 'bg-green-100 text-green-800 border-green-200' :
                            invoice.payment_status === 'partial' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            invoice.payment_status === 'failed' ? 'bg-red-100 text-red-800 border-red-200' :
                            'bg-yellow-100 text-yellow-800 border-yellow-200'
                          }
                        >
                          Payment: {invoice.payment_status}
                        </Badge>
                      )}
                      {invoice.penalties && Number(invoice.penalties) > 0 && (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          Penalties: {formatCurrency(Number(invoice.penalties))}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Customer:</span> {invoice.work_order?.ticket?.customer_name || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Unit:</span> {invoice.work_order?.ticket?.unit_serial || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Subtotal:</span> {formatCurrency(Number(invoice.subtotal || 0))}
                      </div>
                      <div>
                        <span className="font-medium">Total:</span> <span className="font-bold text-foreground">{formatCurrency(Number(invoice.total_amount))}</span>
                      </div>
                    </div>
                    {invoice.hold_reason && (
                      <p className="text-xs text-warning">Hold Reason: {invoice.hold_reason}</p>
                    )}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Created: {new Date(invoice.created_at).toLocaleDateString()}</span>
                      {invoice.payment_received_at && (
                        <span>Paid: {new Date(invoice.payment_received_at).toLocaleDateString()}</span>
                      )}
                      {invoice.payment_amount !== undefined && Number(invoice.payment_amount) > 0 && (
                        <span className="text-green-600 font-medium">
                          Paid: {formatCurrency(Number(invoice.payment_amount))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {invoicePerms.view && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(invoice);
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInvoice(invoice);
                        setInvoiceDialogOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Invoice Workflow</CardTitle>
          <CardDescription>Automated invoice generation and penalty application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Invoices auto-generated when Service Order is completed</p>
            <p>• Penalties applied based on penalty matrix rules</p>
            <p>• Payment integration ready for Stripe or custom gateway</p>
            <p>• Hold status available for disputed penalties or compliance issues</p>
          </div>
        </CardContent>
      </Card>

      {/* Use ComprehensiveInvoiceDetailDialog for invoices with comprehensive data, fallback to basic dialog */}
      {selectedInvoice?.invoice_data || selectedInvoice?.supplier_data ? (
        <ComprehensiveInvoiceDetailDialog
          open={invoiceDialogOpen}
          onOpenChange={setInvoiceDialogOpen}
          invoice={selectedInvoice}
        />
      ) : (
        <InvoiceDetailDialog
          open={invoiceDialogOpen}
          onOpenChange={setInvoiceDialogOpen}
          invoice={selectedInvoice}
        />
      )}

      <InvoiceFormDialog
        open={invoiceFormOpen}
        onOpenChange={setInvoiceFormOpen}
        onSuccess={() => {
          fetchInvoices();
        }}
      />
    </div>
  );
}
