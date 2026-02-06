import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, CreditCard, History, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useCurrency } from "@/domains/shared/hooks/useCurrency";
import { apiClient } from "@/integrations/api/client";
import { useToast } from "@/domains/shared/hooks/use-toast";
import jsPDF from 'jspdf';

interface InvoiceRecord {
  id: string;
  invoice_number?: string;
  status?: string;
  created_at: string;
  payment_received_at?: string;
  payment_status?: string;
  payment_amount?: number | string;
  subtotal?: number | string;
  penalties?: number | string;
  total_amount?: number | string;
  hold_reason?: string;
  work_orders?: {
    wo_number?: string;
  };
}

interface InvoiceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceRecord | null;
}

export function InvoiceDetailDialog({ open, onOpenChange, invoice }: InvoiceDetailDialogProps) {
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const [paymentHistory, setPaymentHistory] = useState<{ id: string; payment_amount?: number | string; payment_status?: string; payment_date?: string; payment_method?: string; payment_reference?: string; notes?: string; processed_by_name?: string }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (open && invoice?.id) {
      fetchPaymentHistory();
    }
  }, [open, invoice?.id]);

  const fetchPaymentHistory = async () => {
    if (!invoice?.id) return;
    
    setLoadingHistory(true);
    try {
      const response = await apiClient.request(`/api/payments/history/${invoice.id}`, {
        method: 'GET',
      });

      if (response.data) {
        setPaymentHistory(response.data.payment_history || []);
      } else if (response.error) {
        toast({
          title: "Error loading payment history",
          description: response.error.message,
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      console.error('Error fetching payment history:', error);
      toast({
        title: "Error loading payment history",
        description: error instanceof Error ? error.message : "Failed to load payment history",
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      paid: { label: 'Paid', className: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      partial: { label: 'Partial', className: 'bg-blue-100 text-blue-800', icon: Clock },
      failed: { label: 'Failed', className: 'bg-red-100 text-red-800', icon: AlertCircle },
      refunded: { label: 'Refunded', className: 'bg-gray-100 text-gray-800', icon: AlertCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (!invoice) return null;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
      on_hold: "bg-orange-100 text-orange-800",
    };
    return colors[status] || colors.draft;
  };

  const handleDownload = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('INVOICE', 105, 20, { align: 'center' });
    
    // Invoice details
    doc.setFontSize(12);
    doc.text(`Invoice Number: ${invoice.invoice_number || 'Draft'}`, 20, 40);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, 50);
    doc.text(`Status: ${invoice.status?.toUpperCase()}`, 20, 60);
    
    // Divider
    doc.line(20, 70, 190, 70);
    
    // Work order details
    doc.text(`Work Order: ${invoice.work_orders?.wo_number || 'N/A'}`, 20, 80);
    
    if (invoice.hold_reason) {
      doc.setFontSize(10);
      doc.setTextColor(255, 100, 0);
      doc.text(`Hold Reason: ${invoice.hold_reason}`, 20, 90);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
    }
    
    // Divider
    doc.line(20, 100, 190, 100);
    
    // Financial details
    doc.text(`Subtotal: ${formatCurrency(Number(invoice.subtotal))}`, 20, 110);
    
    if (invoice.penalties && Number(invoice.penalties) > 0) {
      doc.setTextColor(255, 0, 0);
      doc.text(`Penalties: -${formatCurrency(Number(invoice.penalties))}`, 20, 120);
      doc.setTextColor(0, 0, 0);
    }
    
    // Total
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${formatCurrency(Number(invoice.total_amount))}`, 20, invoice.penalties ? 135 : 125);
    
    // Footer
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Generated by Guardian Flow Field Service Platform', 105, 280, { align: 'center' });
    
    // Save
    doc.save(`${invoice.invoice_number || 'invoice'}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Details
          </DialogTitle>
          <DialogDescription>
            Complete invoice breakdown and payment information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold">{invoice.invoice_number || 'Draft Invoice'}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Created: {new Date(invoice.created_at).toLocaleDateString()}
                {invoice.payment_received_at && (
                  <span className="ml-2">• Paid: {new Date(invoice.payment_received_at).toLocaleDateString()}</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
              {invoice.payment_status && getPaymentStatusBadge(invoice.payment_status)}
            </div>
          </div>

          <Separator />

          <div className="grid gap-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Work Order:</span>
              <span className="font-medium">{invoice.work_orders?.wo_number || 'N/A'}</span>
            </div>
            
            {invoice.hold_reason && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-sm font-medium text-orange-800">Hold Reason:</p>
                <p className="text-sm text-orange-700">{invoice.hold_reason}</p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-semibold">Invoice Breakdown</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(Number(invoice.subtotal))}</span>
              </div>

              {invoice.penalties && Number(invoice.penalties) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Penalties Applied</span>
                  <span className="font-medium">-{formatCurrency(Number(invoice.penalties))}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span>{formatCurrency(Number(invoice.total_amount))}</span>
              </div>
            </div>
          </div>

          <Separator />

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Invoice Details</TabsTrigger>
              <TabsTrigger value="payments">
                Payment History
                {paymentHistory.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {paymentHistory.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold">Invoice Breakdown</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(Number(invoice.subtotal))}</span>
                  </div>

                  {invoice.penalties && Number(invoice.penalties) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Penalties Applied</span>
                      <span className="font-medium">-{formatCurrency(Number(invoice.penalties))}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount</span>
                    <span>{formatCurrency(Number(invoice.total_amount))}</span>
                  </div>

                  {invoice.payment_status && invoice.payment_amount !== undefined && (
                    <>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount Paid</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(Number(invoice.payment_amount))}
                        </span>
                      </div>
                      {Number(invoice.payment_amount) < Number(invoice.total_amount) && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Balance Due</span>
                          <span className="font-medium text-red-600">
                            {formatCurrency(Number(invoice.total_amount) - Number(invoice.payment_amount))}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Payment History
                  </h4>
                </div>

                {loadingHistory ? (
                  <div className="text-center py-4 text-muted-foreground">Loading payment history...</div>
                ) : paymentHistory.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No payment history available
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paymentHistory.map((payment) => (
                      <div
                        key={payment.id}
                        className="p-3 border rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {formatCurrency(Number(payment.payment_amount))}
                            </span>
                            {getPaymentStatusBadge(payment.payment_status)}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </span>
                        </div>
                        {payment.payment_method && (
                          <div className="text-sm text-muted-foreground">
                            Method: {payment.payment_method}
                          </div>
                        )}
                        {payment.payment_reference && (
                          <div className="text-sm text-muted-foreground">
                            Reference: {payment.payment_reference}
                          </div>
                        )}
                        {payment.notes && (
                          <div className="text-sm text-muted-foreground italic">
                            {payment.notes}
                          </div>
                        )}
                        {payment.processed_by_name && (
                          <div className="text-xs text-muted-foreground">
                            Processed by: {payment.processed_by_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Invoice
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
