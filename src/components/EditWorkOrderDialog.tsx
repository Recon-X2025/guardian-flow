import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface EditWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: any;
  onSuccess: () => void;
}

const partStatusLabels: Record<string, string> = {
  'not_required': 'No Parts Required',
  'reserved': 'Parts Reserved',
  'issued': 'Parts Issued',
  'received': 'Parts Received',
  'consumed': 'Parts Consumed',
  'unutilized': 'Parts Unutilized',
  'buffer_consumption': 'Consuming from Buffer Stock',
  'buffer_consumed_replacement_requested': 'Buffer Consumed - Replacement Requested',
};

const getNextPartStatuses = (currentStatus: string): string[] => {
  const transitions: Record<string, string[]> = {
    'not_required': ['reserved', 'buffer_consumption'],
    'reserved': ['issued', 'received', 'unutilized'],
    'issued': ['received', 'consumed'],
    'received': ['consumed', 'unutilized'],
    'buffer_consumption': ['buffer_consumed_replacement_requested'],
    'consumed': [],
    'unutilized': [],
    'buffer_consumed_replacement_requested': [],
  };
  
  return transitions[currentStatus] || [];
};

export function EditWorkOrderDialog({ open, onOpenChange, workOrder, onSuccess }: EditWorkOrderDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [partStatus, setPartStatus] = useState(workOrder.part_status || 'not_required');
  const [partNotes, setPartNotes] = useState(workOrder.part_notes || '');

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('work_orders')
        .update({
          part_status: partStatus,
          part_notes: partNotes,
        })
        .eq('id', workOrder.id);

      if (error) throw error;

      toast({
        title: 'Work Order Updated',
        description: 'Part status and notes have been updated successfully.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Update error:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update work order',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = workOrder.part_status || 'not_required';
  const availableStatuses = [currentStatus, ...getNextPartStatuses(currentStatus)];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Work Order</DialogTitle>
          <DialogDescription>
            {workOrder.wo_number} - Update part status and notes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="part-status">Part Status</Label>
            <Select value={partStatus} onValueChange={setPartStatus}>
              <SelectTrigger id="part-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {partStatusLabels[status] || status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Current: {partStatusLabels[currentStatus]}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="part-notes">Part Notes</Label>
            <Textarea
              id="part-notes"
              placeholder="Add notes about part status, delivery, or consumption..."
              value={partNotes}
              onChange={(e) => setPartNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Part Status Workflow:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <span className="font-medium">Reserved</span> → Parts allocated in system</li>
              <li>• <span className="font-medium">Issued</span> → Supply chain initiated movement</li>
              <li>• <span className="font-medium">Received</span> → Partner received parts</li>
              <li>• <span className="font-medium">Consumed</span> → Parts used in service</li>
              <li>• <span className="font-medium">Unutilized</span> → Parts not used</li>
              <li>• <span className="font-medium">Buffer Stock</span> → Direct consumption from buffer</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Work Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
