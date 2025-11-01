import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';

interface PurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  stockLevel: any;
  onSuccess: () => void;
}

export function PurchaseOrderDialog({ open, onOpenChange, item, stockLevel, onSuccess }: PurchaseOrderDialogProps) {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);
  
  const suggestedQty = (stockLevel?.min_threshold || 10) * 2;
  
  const [formData, setFormData] = useState({
    quantity: suggestedQty,
    unitPrice: item?.unit_price || 0,
    deliveryDate: new Date(Date.now() + (item?.lead_time_days || 7) * 24 * 60 * 60 * 1000),
    notes: '',
  });

  const totalAmount = formData.quantity * formData.unitPrice;

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
      const response = await supabase.functions.invoke('create-purchase-order', {
        body: {
          itemId: item.id,
          supplierId: null, // TODO: Add supplier selection
          quantity: formData.quantity,
          unitPrice: formData.unitPrice,
          deliveryDate: formData.deliveryDate.toISOString(),
          notes: formData.notes,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Purchase Order Created',
        description: `PO created for ${formData.quantity} units`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>
            {item?.sku} - {item?.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Current Stock</Label>
              <p className="text-lg font-semibold">{stockLevel?.qty_available || 0}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Min Threshold</Label>
              <p className="text-lg font-semibold">{stockLevel?.min_threshold || 10}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Order Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              placeholder="Enter quantity to order"
            />
            <p className="text-xs text-muted-foreground">
              Suggested: {suggestedQty} units (2x min threshold)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitPrice">Unit Price *</Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
              placeholder="Enter unit price"
            />
          </div>

          <div className="space-y-2">
            <Label>Expected Delivery Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.deliveryDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.deliveryDate}
                  onSelect={(date) => date && setFormData({ ...formData, deliveryDate: date })}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Lead time: {item?.lead_time_days || 7} days
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any special instructions"
              rows={3}
            />
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <Label className="text-lg">Total Amount</Label>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create PO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
