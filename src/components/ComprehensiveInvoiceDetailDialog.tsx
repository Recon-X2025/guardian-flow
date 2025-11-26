import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, CreditCard, History, CheckCircle2, Clock, AlertCircle, Building2, User, Truck, FileCheck } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { apiClient } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { Invoice } from "@/types/invoice";
import { convertInvoiceRowToInvoice, numberToWords } from "@/lib/invoiceUtils";
import jsPDF from 'jspdf';

interface ComprehensiveInvoiceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any; // Can be InvoiceRow or legacy invoice format
}

export function ComprehensiveInvoiceDetailDialog({ open, onOpenChange, invoice }: ComprehensiveInvoiceDetailDialogProps) {
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const [invoiceData, setInvoiceData] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && invoice?.id) {
      loadInvoiceData();
    }
  }, [open, invoice?.id]);

  const loadInvoiceData = async () => {
    if (!invoice?.id) return;
    
    setLoading(true);
    try {
      // Convert invoice row to Invoice type
      const converted = convertInvoiceRowToInvoice(invoice);
      setInvoiceData(converted);

      // Load line items
      const { data: items } = await apiClient
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('line_number', { ascending: true })
        .then();

      setLineItems(items || []);

      // Load payment transactions
      const { data: transactions } = await apiClient
        .from('invoice_payment_transactions')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('date', { ascending: false })
        .then();

      setPaymentTransactions(transactions || []);
    } catch (error: any) {
      console.error('Error loading invoice data:', error);
      toast({
        title: "Error loading invoice",
        description: error.message || "Failed to load invoice data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!invoice || !invoiceData) return null;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
      on_hold: "bg-orange-100 text-orange-800",
      UNPAID: "bg-yellow-100 text-yellow-800",
      PARTIALLY_PAID: "bg-blue-100 text-blue-800",
      PAID: "bg-green-100 text-green-800",
      OVERDUE: "bg-red-100 text-red-800",
    };
    return colors[status] || colors.draft;
  };

  const handleDownload = () => {
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.text('TAX INVOICE', 105, yPos, { align: 'center' });
    yPos += 10;

    // Supplier Info
    if (invoiceData.supplier.business_name) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('From:', 20, yPos);
      yPos += 7;
      doc.setFont(undefined, 'normal');
      doc.text(invoiceData.supplier.business_name, 20, yPos);
      yPos += 7;
      if (invoiceData.supplier.address) {
        doc.setFontSize(10);
        doc.text(invoiceData.supplier.address, 20, yPos);
        yPos += 5;
      }
      if (invoiceData.supplier.gstin) {
        doc.text(`GSTIN: ${invoiceData.supplier.gstin}`, 20, yPos);
        yPos += 5;
      }
    }

    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    // Customer Info
    if (invoiceData.customer.name) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Bill To:', 20, yPos);
      yPos += 7;
      doc.setFont(undefined, 'normal');
      doc.text(invoiceData.customer.name, 20, yPos);
      yPos += 7;
      if (invoiceData.customer.billing_address) {
        doc.setFontSize(10);
        doc.text(invoiceData.customer.billing_address, 20, yPos);
        yPos += 5;
      }
      if (invoiceData.customer.gstin) {
        doc.text(`GSTIN: ${invoiceData.customer.gstin}`, 20, yPos);
        yPos += 5;
      }
    }

    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    // Invoice Details
    doc.setFontSize(10);
    doc.text(`Invoice Number: ${invoiceData.invoice.number}`, 120, yPos);
    yPos += 5;
    doc.text(`Date: ${invoiceData.invoice.date}`, 120, yPos);
    yPos += 5;
    if (invoiceData.invoice.po_number) {
      doc.text(`PO Number: ${invoiceData.invoice.po_number}`, 120, yPos);
      yPos += 5;
    }

    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    // Line Items Table Header
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('S.No', 20, yPos);
    doc.text('Description', 40, yPos);
    doc.text('HSN/SAC', 100, yPos);
    doc.text('Qty', 130, yPos);
    doc.text('Rate', 145, yPos);
    doc.text('Amount', 170, yPos);
    yPos += 7;
    doc.line(20, yPos, 190, yPos);
    yPos += 5;

    // Line Items
    doc.setFont(undefined, 'normal');
    invoiceData.items.forEach((item, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(String(item.line_number), 20, yPos);
      doc.text(item.name.substring(0, 30), 40, yPos);
      doc.text(item.hsn_sac || '-', 100, yPos);
      doc.text(String(item.quantity), 130, yPos);
      doc.text(formatCurrency(item.rate), 145, yPos);
      doc.text(formatCurrency(item.taxable_value), 170, yPos);
      yPos += 7;
    });

    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    // Tax Summary
    doc.setFontSize(10);
    doc.text(`Taxable Value: ${formatCurrency(invoiceData.tax_summary.total_taxable_value)}`, 120, yPos);
    yPos += 5;
    if (invoiceData.tax_summary.cgst_total > 0) {
      doc.text(`CGST: ${formatCurrency(invoiceData.tax_summary.cgst_total)}`, 120, yPos);
      yPos += 5;
    }
    if (invoiceData.tax_summary.sgst_total > 0) {
      doc.text(`SGST: ${formatCurrency(invoiceData.tax_summary.sgst_total)}`, 120, yPos);
      yPos += 5;
    }
    if (invoiceData.tax_summary.igst_total > 0) {
      doc.text(`IGST: ${formatCurrency(invoiceData.tax_summary.igst_total)}`, 120, yPos);
      yPos += 5;
    }
    if (invoiceData.tax_summary.cess_total > 0) {
      doc.text(`CESS: ${formatCurrency(invoiceData.tax_summary.cess_total)}`, 120, yPos);
      yPos += 5;
    }

    yPos += 5;
    doc.line(120, yPos, 190, yPos);
    yPos += 7;

    // Total
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${formatCurrency(invoiceData.tax_summary.total_invoice_value)}`, 120, yPos);
    yPos += 7;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Amount in Words: ${invoiceData.tax_summary.amount_in_words}`, 20, yPos);

    // Footer
    doc.setFontSize(8);
    doc.text('Generated by Guardian Flow Field Service Platform', 105, 280, { align: 'center' });

    doc.save(`${invoiceData.invoice.number || 'invoice'}.pdf`);

    toast({
      title: "Invoice Downloaded",
      description: `${invoiceData.invoice.number}.pdf has been downloaded.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Details - {invoiceData.invoice.number}
          </DialogTitle>
          <DialogDescription>
            Comprehensive GST-compliant invoice information
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading invoice data...</div>
        ) : (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold">{invoiceData.invoice.number}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Date: {invoiceData.invoice.date} | Type: {invoiceData.invoice.type}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge className={getStatusColor(invoiceData.payment.status)}>
                  {invoiceData.payment.status}
                </Badge>
                {invoiceData.invoice.type && (
                  <Badge variant="outline">{invoiceData.invoice.type}</Badge>
                )}
              </div>
            </div>

            <Separator />

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="tax">Tax Summary</TabsTrigger>
                <TabsTrigger value="payment">Payment</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* Supplier Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <h4 className="font-semibold">Supplier</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{invoiceData.supplier.business_name}</p>
                      {invoiceData.supplier.trade_name && (
                        <p className="text-muted-foreground">Trade Name: {invoiceData.supplier.trade_name}</p>
                      )}
                      {invoiceData.supplier.address && (
                        <p className="text-muted-foreground">{invoiceData.supplier.address}</p>
                      )}
                      {invoiceData.supplier.gstin && (
                        <p className="text-muted-foreground">GSTIN: {invoiceData.supplier.gstin}</p>
                      )}
                      {invoiceData.supplier.pan && (
                        <p className="text-muted-foreground">PAN: {invoiceData.supplier.pan}</p>
                      )}
                      {invoiceData.supplier.contact.email && (
                        <p className="text-muted-foreground">Email: {invoiceData.supplier.contact.email}</p>
                      )}
                      {invoiceData.supplier.contact.phone && (
                        <p className="text-muted-foreground">Phone: {invoiceData.supplier.contact.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <h4 className="font-semibold">Customer</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{invoiceData.customer.name}</p>
                      {invoiceData.customer.billing_address && (
                        <p className="text-muted-foreground">{invoiceData.customer.billing_address}</p>
                      )}
                      {invoiceData.customer.gstin && (
                        <p className="text-muted-foreground">GSTIN: {invoiceData.customer.gstin}</p>
                      )}
                      {invoiceData.customer.customer_type && (
                        <Badge variant="outline" className="mt-1">
                          {invoiceData.customer.customer_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Summary */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Taxable Value</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(invoiceData.tax_summary.total_taxable_value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tax</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(
                        invoiceData.tax_summary.cgst_total +
                        invoiceData.tax_summary.sgst_total +
                        invoiceData.tax_summary.igst_total +
                        invoiceData.tax_summary.cess_total
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(invoiceData.tax_summary.total_invoice_value)}
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Items Tab */}
              <TabsContent value="items" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Line</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>HSN/SAC</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Taxable Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceData.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No line items found
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoiceData.items.map((item) => (
                        <TableRow key={item.line_number}>
                          <TableCell>{item.line_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.hsn_sac || '-'}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>{formatCurrency(item.rate)}</TableCell>
                          <TableCell>
                            {item.discount_amount > 0 && formatCurrency(item.discount_amount)}
                            {item.discount_percent > 0 && ` (${item.discount_percent}%)`}
                          </TableCell>
                          <TableCell>{formatCurrency(item.taxable_value)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              {/* Tax Summary Tab */}
              <TabsContent value="tax" className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Taxable Value</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(invoiceData.tax_summary.total_taxable_value)}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Total Discount</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(invoiceData.tax_summary.total_discount)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {invoiceData.tax_summary.cgst_total > 0 && (
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">CGST</p>
                        <p className="text-xl font-semibold">
                          {formatCurrency(invoiceData.tax_summary.cgst_total)}
                        </p>
                      </div>
                    )}
                    {invoiceData.tax_summary.sgst_total > 0 && (
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">SGST</p>
                        <p className="text-xl font-semibold">
                          {formatCurrency(invoiceData.tax_summary.sgst_total)}
                        </p>
                      </div>
                    )}
                    {invoiceData.tax_summary.igst_total > 0 && (
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">IGST</p>
                        <p className="text-xl font-semibold">
                          {formatCurrency(invoiceData.tax_summary.igst_total)}
                        </p>
                      </div>
                    )}
                    {invoiceData.tax_summary.cess_total > 0 && (
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">CESS</p>
                        <p className="text-xl font-semibold">
                          {formatCurrency(invoiceData.tax_summary.cess_total)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-lg font-semibold">Total Invoice Value</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(invoiceData.tax_summary.total_invoice_value)}
                      </p>
                    </div>
                    {invoiceData.tax_summary.amount_in_words && (
                      <p className="text-sm text-muted-foreground italic">
                        {invoiceData.tax_summary.amount_in_words}
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Payment Tab */}
              <TabsContent value="payment" className="space-y-4">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Status</p>
                        <Badge className={getStatusColor(invoiceData.payment.status)}>
                          {invoiceData.payment.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Method</p>
                        <p className="font-medium">{invoiceData.payment.method}</p>
                      </div>
                    </div>

                    {invoiceData.payment.method_details.upi_id && (
                      <p className="text-sm text-muted-foreground">
                        UPI ID: {invoiceData.payment.method_details.upi_id}
                      </p>
                    )}
                  </div>

                  {paymentTransactions.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Payment Transactions
                      </h4>
                      <div className="space-y-2">
                        {paymentTransactions.map((txn) => (
                          <div key={txn.id} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{formatCurrency(Number(txn.amount))}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(txn.date).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge>{txn.status}</Badge>
                            </div>
                            {txn.reference && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Reference: {txn.reference}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {invoiceData.invoice.po_number && (
                    <div>
                      <p className="text-muted-foreground">PO Number</p>
                      <p className="font-medium">{invoiceData.invoice.po_number}</p>
                    </div>
                  )}
                  {invoiceData.invoice.job_card_number && (
                    <div>
                      <p className="text-muted-foreground">Job Card Number</p>
                      <p className="font-medium">{invoiceData.invoice.job_card_number}</p>
                    </div>
                  )}
                  {invoiceData.invoice.project_code && (
                    <div>
                      <p className="text-muted-foreground">Project Code</p>
                      <p className="font-medium">{invoiceData.invoice.project_code}</p>
                    </div>
                  )}
                  {invoiceData.invoice.department && (
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium">{invoiceData.invoice.department}</p>
                    </div>
                  )}
                  {invoiceData.invoice.due_date && (
                    <div>
                      <p className="text-muted-foreground">Due Date</p>
                      <p className="font-medium">{invoiceData.invoice.due_date}</p>
                    </div>
                  )}
                  {invoiceData.invoice.payment_terms && (
                    <div>
                      <p className="text-muted-foreground">Payment Terms</p>
                      <p className="font-medium">{invoiceData.invoice.payment_terms}</p>
                    </div>
                  )}
                </div>

                {invoiceData.invoice.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Notes</p>
                    <p className="text-sm">{invoiceData.invoice.notes}</p>
                  </div>
                )}

                {invoiceData.transport && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Truck className="h-4 w-4" />
                      <h4 className="font-semibold">Transport Details</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {invoiceData.transport.eway_bill && (
                        <div>
                          <p className="text-muted-foreground">E-Way Bill</p>
                          <p className="font-medium">{invoiceData.transport.eway_bill}</p>
                        </div>
                      )}
                      {invoiceData.transport.vehicle_number && (
                        <div>
                          <p className="text-muted-foreground">Vehicle Number</p>
                          <p className="font-medium">{invoiceData.transport.vehicle_number}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="flex gap-2">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download Invoice PDF
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

