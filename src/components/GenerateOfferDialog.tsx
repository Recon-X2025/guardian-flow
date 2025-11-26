import { useState } from 'react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GenerateOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string | null;
  customerId?: string | null;
  onSuccess?: () => void;
}

export function GenerateOfferDialog({ open, onOpenChange, workOrderId, customerId }: GenerateOfferDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!workOrderId) return;

    setLoading(true);
    console.log('Generating Offer AI offers for:', { workOrderId, customerId });

    try {
      const result = await apiClient.functions.invoke('generate-offers', {
        body: { workOrderId, customerId: customerId || 'demo-customer' }
      });

      console.log('Offer AI generation response:', result);

      if (result.error) {
        console.error('Offer AI generation error:', result.error);
        throw result.error;
      }

      const data = result.data;
      toast({
        title: 'Offer AI Generated',
        description: `Generated ${data?.offers?.length || 0} contextual offers`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Offer AI generation failed:', error);
      toast({
        variant: 'destructive',
        description: error.message || 'Failed to generate offers. Check console for details.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Offer AI - Sales at Point of Service</DialogTitle>
          <DialogDescription>
            AI will analyze work order context and generate personalized product/service offers
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Offers will be based on:
          </p>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Customer service history</li>
            <li>• Unit warranty status</li>
            <li>• Current symptoms and repairs</li>
            <li>• Inventory availability</li>
          </ul>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Offers'}
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 border rounded-md hover:bg-muted"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
