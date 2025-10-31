import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, FileText } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

interface InvoiceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

export function InvoiceDetailDialog({ open, onOpenChange, invoice }: InvoiceDetailDialogProps) {
  const { formatCurrency } = useCurrency();

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
    // Mock download functionality
    const invoiceData = `
Invoice: ${invoice.invoice_number}
Date: ${new Date(invoice.created_at).toLocaleDateString()}
Work Order: ${invoice.work_orders?.wo_number || 'N/A'}

Subtotal: ${formatCurrency(Number(invoice.subtotal))}
Penalties: -${formatCurrency(Number(invoice.penalties || 0))}
---
Total: ${formatCurrency(Number(invoice.total_amount))}
    `.trim();

    const blob = new Blob([invoiceData], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoice_number || 'invoice'}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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
              </p>
            </div>
            <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
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
