import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { Invoice, InvoiceItem, InvoiceType, CustomerType, TaxType, PaymentTerms } from "@/types/invoice";
import { convertInvoiceToRow, numberToWords, calculateItemTax } from "@/lib/invoiceUtils";
import { useAuth } from "@/contexts/AuthContext";

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice | null;
  onSuccess?: () => void;
}

export function InvoiceFormDialog({ open, onOpenChange, invoice, onSuccess }: InvoiceFormDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Invoice>>({
    supplier: {
      business_name: '',
      trade_name: '',
      logo_url: '',
      address: '',
      gstin: '',
      pan: '',
      cin: '',
      msme_registration_number: '',
      state: '',
      state_code: '',
      contact: { email: '', phone: '' },
      bank_details: {
        bank_name: '',
        account_number: '',
        ifsc: '',
        upi_id: '',
      },
    },
    customer: {
      name: '',
      billing_address: '',
      shipping_address: '',
      gstin: '',
      state: '',
      state_code: '',
      contact: { email: '', phone: '' },
      customer_type: 'B2C',
      customer_reference: '',
    },
    invoice: {
      type: 'TAX_INVOICE',
      number: '',
      date: new Date().toISOString().split('T')[0],
      version: 1,
      po_number: '',
      job_card_number: '',
      project_code: '',
      department: '',
      reverse_charge: false,
      is_export: false,
      due_date: '',
      payment_terms: 'NET30',
      notes: '',
      terms_and_conditions: '',
      currency: 'INR',
      exchange_rate: 1.0,
      eway_bill_required: false,
    },
    items: [],
    tax_summary: {
      total_taxable_value: 0,
      total_discount: 0,
      cgst_total: 0,
      sgst_total: 0,
      igst_total: 0,
      cess_total: 0,
      adjustments: 0,
      round_off: 0,
      total_invoice_value: 0,
      amount_in_words: '',
    },
    payment: {
      status: 'UNPAID',
      method: 'BANK_TRANSFER',
      method_details: {
        bank_name: '',
        account_number: '',
        ifsc: '',
        upi_id: '',
        upi_qr_url: '',
        payment_link: '',
      },
      transactions: [],
      tds: {
        applicable: false,
        tds_rate: 0,
        tds_amount: 0,
      },
    },
    attachments: [],
    custom_fields: {},
    metadata: {
      status_history: [],
      created_by: user?.id || '',
      created_at: new Date().toISOString(),
      updated_by: user?.id || '',
      updated_at: new Date().toISOString(),
    },
  });

  useEffect(() => {
    if (invoice) {
      setFormData(invoice);
    } else {
      // Reset form for new invoice
      setFormData({
        ...formData,
        invoice: {
          ...formData.invoice!,
          number: generateInvoiceNumber(),
          date: new Date().toISOString().split('T')[0],
        },
      });
    }
  }, [invoice, open]);

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  };

  const addLineItem = () => {
    const newItem: InvoiceItem = {
      line_number: (formData.items?.length || 0) + 1,
      name: '',
      description: '',
      hsn_sac: '',
      sac_is_service: false,
      quantity: 1,
      unit: 'pcs',
      rate: 0,
      discount_amount: 0,
      discount_percent: 0,
      taxable_value: 0,
      tax: {
        tax_type: 'INTRA_STATE',
        cgst_rate: 0,
        sgst_rate: 0,
        igst_rate: 0,
        cess_rate: 0,
      },
      warranty_months: 0,
      supply_start_date: '',
      supply_end_date: '',
      attachments: [],
    };
    setFormData({
      ...formData,
      items: [...(formData.items || []), newItem],
    });
  };

  const removeLineItem = (index: number) => {
    const newItems = formData.items?.filter((_, i) => i !== index) || [];
    // Renumber items
    newItems.forEach((item, i) => {
      item.line_number = i + 1;
    });
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems);
  };

  const updateLineItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...(formData.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate taxable value if rate or quantity changed
    if (field === 'rate' || field === 'quantity' || field === 'discount_amount' || field === 'discount_percent') {
      const item = newItems[index];
      const subtotal = item.quantity * item.rate;
      const discount = item.discount_percent > 0 
        ? (subtotal * item.discount_percent) / 100 
        : item.discount_amount;
      item.taxable_value = subtotal - discount;
    }
    
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems);
  };

  const calculateTotals = (items: InvoiceItem[] = formData.items || []) => {
    let totalTaxableValue = 0;
    let totalDiscount = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let cessTotal = 0;

    items.forEach((item) => {
      totalTaxableValue += item.taxable_value;
      totalDiscount += item.discount_amount + (item.taxable_value * item.discount_percent) / 100;
      
      const taxCalc = calculateItemTax(
        item.taxable_value,
        item.tax.tax_type,
        item.tax.cgst_rate,
        item.tax.sgst_rate,
        item.tax.igst_rate,
        item.tax.cess_rate
      );
      
      cgstTotal += taxCalc.cgst;
      sgstTotal += taxCalc.sgst;
      igstTotal += taxCalc.igst;
      cessTotal += taxCalc.cess;
    });

    const totalTax = cgstTotal + sgstTotal + igstTotal + cessTotal;
    const totalInvoiceValue = totalTaxableValue + totalTax;
    const roundOff = Math.round(totalInvoiceValue) - totalInvoiceValue;

    setFormData({
      ...formData,
      tax_summary: {
        total_taxable_value: totalTaxableValue,
        total_discount: totalDiscount,
        cgst_total: cgstTotal,
        sgst_total: sgstTotal,
        igst_total: igstTotal,
        cess_total: cessTotal,
        adjustments: 0,
        round_off: roundOff,
        total_invoice_value: Math.round(totalInvoiceValue),
        amount_in_words: numberToWords(Math.round(totalInvoiceValue)),
      },
    });
  };

  const handleSubmit = async () => {
    if (!formData.supplier?.business_name || !formData.customer?.name || !formData.items?.length) {
      toast({
        title: "Validation Error",
        description: "Please fill in supplier name, customer name, and add at least one line item",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const invoiceToSave: Invoice = {
        ...formData,
        supplier: formData.supplier!,
        customer: formData.customer!,
        invoice: formData.invoice!,
        items: formData.items || [],
        tax_summary: formData.tax_summary!,
        payment: formData.payment!,
        attachments: formData.attachments || [],
        custom_fields: formData.custom_fields || {},
        metadata: {
          ...formData.metadata!,
          updated_by: user?.id || '',
          updated_at: new Date().toISOString(),
        },
      } as Invoice;

      const invoiceRow = convertInvoiceToRow(invoiceToSave);

      if (invoice?.id) {
        // Update existing invoice
        await apiClient
          .from('invoices')
          .update(invoiceRow)
          .eq('id', invoice.id)
          .then();
        
        toast({
          title: "Invoice Updated",
          description: "Invoice has been updated successfully",
        });
      } else {
        // Create new invoice
        await apiClient
          .from('invoices')
          .insert(invoiceRow)
          .then();

        // Insert line items
        if (invoiceToSave.items.length > 0) {
          const lineItems = invoiceToSave.items.map((item) => ({
            invoice_id: invoiceRow.id,
            tenant_id: invoiceRow.tenant_id,
            ...item,
            tax_type: item.tax.tax_type,
            cgst_rate: item.tax.cgst_rate,
            sgst_rate: item.tax.sgst_rate,
            igst_rate: item.tax.igst_rate,
            cess_rate: item.tax.cess_rate,
          }));

          await apiClient
            .from('invoice_line_items')
            .insert(lineItems)
            .then();
        }

        toast({
          title: "Invoice Created",
          description: "Invoice has been created successfully",
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
          <DialogDescription>
            {invoice ? 'Update invoice details' : 'Fill in the invoice information below'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="supplier">Supplier</TabsTrigger>
            <TabsTrigger value="customer">Customer</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Invoice Number</Label>
                <Input
                  value={formData.invoice?.number || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    invoice: { ...formData.invoice!, number: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>Invoice Type</Label>
                <Select
                  value={formData.invoice?.type || 'TAX_INVOICE'}
                  onValueChange={(value: InvoiceType) => setFormData({
                    ...formData,
                    invoice: { ...formData.invoice!, type: value },
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TAX_INVOICE">Tax Invoice</SelectItem>
                    <SelectItem value="BILL_OF_SUPPLY">Bill of Supply</SelectItem>
                    <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                    <SelectItem value="DEBIT_NOTE">Debit Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Invoice Date</Label>
                <Input
                  type="date"
                  value={formData.invoice?.date || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    invoice: { ...formData.invoice!, date: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.invoice?.due_date || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    invoice: { ...formData.invoice!, due_date: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>PO Number</Label>
                <Input
                  value={formData.invoice?.po_number || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    invoice: { ...formData.invoice!, po_number: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>Payment Terms</Label>
                <Select
                  value={formData.invoice?.payment_terms || 'NET30'}
                  onValueChange={(value: PaymentTerms) => setFormData({
                    ...formData,
                    invoice: { ...formData.invoice!, payment_terms: value },
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NET15">Net 15</SelectItem>
                    <SelectItem value="NET30">Net 30</SelectItem>
                    <SelectItem value="NET45">Net 45</SelectItem>
                    <SelectItem value="NET60">Net 60</SelectItem>
                    <SelectItem value="DUE_ON_RECEIPT">Due on Receipt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.invoice?.notes || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  invoice: { ...formData.invoice!, notes: e.target.value },
                })}
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Supplier Tab */}
          <TabsContent value="supplier" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Business Name *</Label>
                <Input
                  value={formData.supplier?.business_name || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    supplier: { ...formData.supplier!, business_name: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>Trade Name</Label>
                <Input
                  value={formData.supplier?.trade_name || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    supplier: { ...formData.supplier!, trade_name: e.target.value },
                  })}
                />
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Textarea
                  value={formData.supplier?.address || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    supplier: { ...formData.supplier!, address: e.target.value },
                  })}
                  rows={2}
                />
              </div>
              <div>
                <Label>GSTIN</Label>
                <Input
                  value={formData.supplier?.gstin || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    supplier: { ...formData.supplier!, gstin: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>PAN</Label>
                <Input
                  value={formData.supplier?.pan || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    supplier: { ...formData.supplier!, pan: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={formData.supplier?.state || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    supplier: { ...formData.supplier!, state: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>State Code</Label>
                <Input
                  value={formData.supplier?.state_code || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    supplier: { ...formData.supplier!, state_code: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.supplier?.contact.email || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    supplier: {
                      ...formData.supplier!,
                      contact: { ...formData.supplier!.contact, email: e.target.value },
                    },
                  })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.supplier?.contact.phone || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    supplier: {
                      ...formData.supplier!,
                      contact: { ...formData.supplier!.contact, phone: e.target.value },
                    },
                  })}
                />
              </div>
            </div>
          </TabsContent>

          {/* Customer Tab */}
          <TabsContent value="customer" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer Name *</Label>
                <Input
                  value={formData.customer?.name || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    customer: { ...formData.customer!, name: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>Customer Type</Label>
                <Select
                  value={formData.customer?.customer_type || 'B2C'}
                  onValueChange={(value: CustomerType) => setFormData({
                    ...formData,
                    customer: { ...formData.customer!, customer_type: value },
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B2B">B2B</SelectItem>
                    <SelectItem value="B2C">B2C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Billing Address</Label>
                <Textarea
                  value={formData.customer?.billing_address || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    customer: { ...formData.customer!, billing_address: e.target.value },
                  })}
                  rows={2}
                />
              </div>
              <div>
                <Label>GSTIN</Label>
                <Input
                  value={formData.customer?.gstin || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    customer: { ...formData.customer!, gstin: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={formData.customer?.state || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    customer: { ...formData.customer!, state: e.target.value },
                  })}
                />
              </div>
            </div>
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Line Items</h3>
              <Button onClick={addLineItem} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            <div className="space-y-4">
              {formData.items?.map((item, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm">Item {item.line_number}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Name *</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateLineItem(index, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>HSN/SAC</Label>
                        <Input
                          value={item.hsn_sac}
                          onChange={(e) => updateLineItem(index, 'hsn_sac', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Description</Label>
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Input
                          value={item.unit}
                          onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Rate</Label>
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Discount %</Label>
                        <Input
                          type="number"
                          value={item.discount_percent}
                          onChange={(e) => updateLineItem(index, 'discount_percent', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Tax Type</Label>
                        <Select
                          value={item.tax.tax_type}
                          onValueChange={(value: TaxType) => updateLineItem(index, 'tax', {
                            ...item.tax,
                            tax_type: value,
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INTRA_STATE">Intra-State</SelectItem>
                            <SelectItem value="INTER_STATE">Inter-State</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {item.tax.tax_type === 'INTRA_STATE' ? (
                        <>
                          <div>
                            <Label>CGST Rate %</Label>
                            <Input
                              type="number"
                              value={item.tax.cgst_rate}
                              onChange={(e) => updateLineItem(index, 'tax', {
                                ...item.tax,
                                cgst_rate: parseFloat(e.target.value) || 0,
                              })}
                            />
                          </div>
                          <div>
                            <Label>SGST Rate %</Label>
                            <Input
                              type="number"
                              value={item.tax.sgst_rate}
                              onChange={(e) => updateLineItem(index, 'tax', {
                                ...item.tax,
                                sgst_rate: parseFloat(e.target.value) || 0,
                              })}
                            />
                          </div>
                        </>
                      ) : (
                        <div>
                          <Label>IGST Rate %</Label>
                          <Input
                            type="number"
                            value={item.tax.igst_rate}
                            onChange={(e) => updateLineItem(index, 'tax', {
                              ...item.tax,
                              igst_rate: parseFloat(e.target.value) || 0,
                            })}
                          />
                        </div>
                      )}
                      <div>
                        <Label>Taxable Value</Label>
                        <Input
                          type="number"
                          value={item.taxable_value.toFixed(2)}
                          disabled
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!formData.items || formData.items.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No line items. Click "Add Item" to get started.
                </div>
              )}
            </div>

            <Separator />

            {/* Tax Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Tax Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Taxable Value:</span>
                  <span className="font-semibold">
                    ₹{formData.tax_summary?.total_taxable_value.toFixed(2) || '0.00'}
                  </span>
                </div>
                {formData.tax_summary && formData.tax_summary.cgst_total > 0 && (
                  <div className="flex justify-between">
                    <span>CGST:</span>
                    <span>₹{formData.tax_summary.cgst_total.toFixed(2)}</span>
                  </div>
                )}
                {formData.tax_summary && formData.tax_summary.sgst_total > 0 && (
                  <div className="flex justify-between">
                    <span>SGST:</span>
                    <span>₹{formData.tax_summary.sgst_total.toFixed(2)}</span>
                  </div>
                )}
                {formData.tax_summary && formData.tax_summary.igst_total > 0 && (
                  <div className="flex justify-between">
                    <span>IGST:</span>
                    <span>₹{formData.tax_summary.igst_total.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Invoice Value:</span>
                  <span>₹{formData.tax_summary?.total_invoice_value.toFixed(2) || '0.00'}</span>
                </div>
                {formData.tax_summary?.amount_in_words && (
                  <p className="text-sm text-muted-foreground italic">
                    {formData.tax_summary.amount_in_words}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment Status</Label>
                <Select
                  value={formData.payment?.status || 'UNPAID'}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    payment: { ...formData.payment!, status: value as any },
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNPAID">Unpaid</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select
                  value={formData.payment?.method || 'BANK_TRANSFER'}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    payment: { ...formData.payment!, method: value as any },
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : invoice ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

