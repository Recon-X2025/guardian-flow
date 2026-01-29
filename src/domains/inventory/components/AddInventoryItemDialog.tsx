import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { apiClient } from '@/integrations/api/client';
import { Loader2 } from 'lucide-react';

interface AddInventoryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddInventoryItemDialog({ open, onOpenChange, onSuccess }: AddInventoryItemDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    description: '',
    unitPrice: '',
    leadTimeDays: '',
    consumable: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error: itemError } = await apiClient
        .from('inventory_items')
        .insert({
          sku: formData.sku,
          description: formData.description,
          unit_price: parseFloat(formData.unitPrice) || 0,
          lead_time_days: parseInt(formData.leadTimeDays) || 0,
          consumable: formData.consumable,
        })
        .then();

      if (itemError) throw itemError;

      toast({
        title: 'Inventory item added',
        description: `${formData.sku} has been added to inventory`,
      });

      onSuccess();
      onOpenChange(false);
      setFormData({ sku: '', description: '', unitPrice: '', leadTimeDays: '', consumable: false });
    } catch (error: any) {
      toast({
        title: 'Error adding item',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sku">SKU *</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="e.g., PC-RAM-16GB or PR-TONER-BK"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Part description..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price ($) *</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
              <Input
                id="leadTimeDays"
                type="number"
                value={formData.leadTimeDays}
                onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="consumable"
              checked={formData.consumable}
              onCheckedChange={(checked) => setFormData({ ...formData, consumable: checked })}
            />
            <Label htmlFor="consumable">Consumable Item</Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Item
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
