import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText, Download } from 'lucide-react';

interface GenerateServiceOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  onSuccess: () => void;
}

export function GenerateServiceOrderDialog({ open, onOpenChange, workOrderId, onSuccess }: GenerateServiceOrderDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<any>(null);

  const generateSO = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-service-order', {
        body: { workOrderId, templateId: null }
      });

      if (error) throw error;

      setServiceOrder(data.serviceOrder);

      // Update work order status
      await supabase
        .from('work_orders')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', workOrderId);

      // Generate invoice
      await generateInvoice(workOrderId, data.serviceOrder.id);

      toast({
        title: 'Service Order Generated',
        description: `${data.serviceOrder.so_number} created successfully`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async (woId: string, soId: string) => {
    try {
      // Get work order details
      const { data: wo } = await supabase
        .from('work_orders')
        .select('*, tickets(*)')
        .eq('id', woId)
        .single();

      if (!wo) return;

      // Get penalties
      const { data: penalties } = await supabase
        .from('penalty_applications')
        .select('*')
        .eq('work_order_id', woId);

      const penaltyTotal = penalties?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const subtotal = Number(wo.cost_to_customer) || 0;
      const totalAmount = subtotal - penaltyTotal;

      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true });

      const invoiceNumber = `INV-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

      await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          work_order_id: woId,
          customer_id: wo.tickets?.customer_id,
          subtotal: subtotal,
          penalties: penaltyTotal,
          total_amount: totalAmount,
          status: 'sent',
        });

      console.log(`Invoice ${invoiceNumber} generated for WO ${wo.wo_number}`);
    } catch (error) {
      console.error('Invoice generation error:', error);
    }
  };

  const downloadPDF = () => {
    if (!serviceOrder?.html_content) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(serviceOrder.html_content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Generate Service Order</DialogTitle>
        </DialogHeader>

        {!serviceOrder && !loading && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will generate a service order document with:
            </p>
            <ul className="space-y-2 text-sm">
              <li>✓ Work order details and warranty status</li>
              <li>✓ Parts breakdown (covered vs. chargeable)</li>
              <li>✓ Customer cost calculation</li>
              <li>✓ QR code for photo evidence</li>
              <li>✓ Signature capture areas</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              An invoice will also be automatically generated.
            </p>
            <Button onClick={generateSO} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <FileText className="mr-2 h-4 w-4" />
              Generate Service Order
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Generating service order...</p>
          </div>
        )}

        {serviceOrder && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <p className="font-semibold text-green-900">Service Order Generated</p>
                <p className="text-sm text-green-700">{serviceOrder.so_number}</p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>

            <div 
              className="border rounded-lg p-6 prose prose-sm max-w-none bg-white"
              dangerouslySetInnerHTML={{ __html: serviceOrder.html_content }}
            />

            <div className="flex gap-2">
              <Button onClick={downloadPDF} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
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