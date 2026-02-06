import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';

interface InventoryItem {
  id: string;
  sku?: string;
  description?: string;
}

interface StockLevel {
  location_id?: string;
  qty_available?: number;
}

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
  stockLevel: StockLevel;
  onSuccess: () => void;
}

export function StockAdjustmentDialog({ open, onOpenChange, item, stockLevel, onSuccess }: StockAdjustmentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    adjustmentType: 'add',
    quantity: 0,
    reason: 'stock_count',
    notes: '',
  });

  const handleSubmit = async () => {
    if (formData.quantity <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Quantity must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.functions.invoke('adjust-inventory-stock', {
        body: {
          itemId: item.id,
          locationId: stockLevel.location_id,
          adjustmentType: formData.adjustmentType,
          quantity: formData.quantity,
          reason: formData.reason,
          notes: formData.notes,
        },
      });

      if (response.error) throw response.error;
      // Response data is in response.data

      toast({
        title: 'Stock Adjusted',
        description: `Stock level updated successfully`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const currentStock = stockLevel?.qty_available || 0;
  const newStock = formData.adjustmentType === 'add'
    ? currentStock + formData.quantity
    : formData.adjustmentType === 'remove'
    ? currentStock - formData.quantity
    : formData.quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock Level</DialogTitle>
          <DialogDescription>
            {item?.sku} - {item?.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Current Stock</Label>
              <p className="text-2xl font-bold">{currentStock}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">New Stock</Label>
              <p className="text-2xl font-bold text-primary">{newStock}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustmentType">Adjustment Type *</Label>
            <Select
              value={formData.adjustmentType}
              onValueChange={(value) => setFormData({ ...formData, adjustmentType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select adjustment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Stock</SelectItem>
                <SelectItem value="remove">Remove Stock</SelectItem>
                <SelectItem value="set">Set Stock Level</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              placeholder="Enter quantity"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => setFormData({ ...formData, reason: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock_count">Stock Count</SelectItem>
                <SelectItem value="received_shipment">Received Shipment</SelectItem>
                <SelectItem value="damaged">Damaged/Lost</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="correction">Correction</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adjusting...' : 'Adjust Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
