import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { apiClient } from '@/integrations/api/client';
import { Loader2, FileText, Download } from 'lucide-react';
import DOMPurify from 'dompurify';

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
    console.log('Generating Service Order for:', workOrderId);
    setLoading(true);
    try {
      const result = await apiClient.functions.invoke('generate-service-order', {
        body: { workOrderId, templateId: null }
      });

      console.log('SO generation response:', result);

      if (result.error) {
        console.error('SO generation error:', result.error);
        throw result.error;
      }

      if (!result.data?.serviceOrder) {
        throw new Error('Service order generation returned no data');
      }

      setServiceOrder(result.data.serviceOrder);

      // Update work order status
      await apiClient
        .from('work_orders')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', workOrderId)
        .then();

      // Generate invoice
      await generateInvoice(workOrderId, result.data.serviceOrder.id);

      toast({
        title: 'Service Order Generated',
        description: `${result.data.serviceOrder.so_number} created successfully`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('SO generation failed:', error);
      toast({
        title: 'Generation failed',
        description: error.message || 'Failed to generate Service Order. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async (woId: string, soId: string) => {
    try {
      // Get work order details
      const { data: woList } = await apiClient
        .from('work_orders')
        .select('*')
        .eq('id', woId)
        .limit(1)
        .then();

      const wo = woList?.[0];
      if (!wo) return;

      // Get ticket details if available
      let ticket: any = null;
      if (wo.ticket_id) {
        const { data: tickets } = await apiClient
          .from('tickets')
          .select('*')
          .eq('id', wo.ticket_id)
          .limit(1)
          .then();
        ticket = tickets?.[0];
      }

      // Get penalties
      const { data: penalties } = await apiClient
        .from('penalty_applications')
        .select('*')
        .eq('work_order_id', woId)
        .then();

      const penaltyTotal = penalties?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
      const subtotal = Number(wo.cost_to_customer) || 0;
      const totalAmount = subtotal - penaltyTotal;

      // Get invoice count
      const year = new Date().getFullYear();
      const { data: existingInvoices } = await apiClient
        .from('invoices')
        .select('invoice_number')
        .then();

      const invoiceNumber = `INV-${year}-${String((existingInvoices?.length || 0) + 1).padStart(4, '0')}`;

      await apiClient
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          work_order_id: woId,
          customer_id: ticket?.customer_id || null,
          subtotal: subtotal,
          penalties: penaltyTotal,
          total_amount: totalAmount,
          status: 'sent',
        })
        .then();

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
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(serviceOrder.html_content, {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'img'],
                  ALLOWED_ATTR: ['class', 'style', 'src', 'alt', 'width', 'height']
                })
              }}
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