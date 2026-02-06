import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';

interface WarrantyData {
  id?: string;
  unit_serial?: string;
  model?: string;
  coverage_type?: string;
  warranty_start?: string;
  warranty_end?: string;
}

interface WarrantyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty?: WarrantyData;
  onSuccess: () => void;
}

export function WarrantyDialog({ open, onOpenChange, warranty, onSuccess }: WarrantyDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    unitSerial: warranty?.unit_serial || '',
    model: warranty?.model || '',
    coverageType: warranty?.coverage_type || 'standard',
    warrantyStart: warranty?.warranty_start ? new Date(warranty.warranty_start) : new Date(),
    warrantyEnd: warranty?.warranty_end ? new Date(warranty.warranty_end) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });

  const handleSubmit = async () => {
    if (!formData.unitSerial || !formData.model) {
      toast({
        title: 'Validation Error',
        description: 'Unit serial and model are required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const warrantyData = {
        unit_serial: formData.unitSerial,
        model: formData.model,
        coverage_type: formData.coverageType,
        warranty_start: formData.warrantyStart.toISOString(),
        warranty_end: formData.warrantyEnd.toISOString(),
      };

      if (warranty?.id) {
        // Update existing warranty
        const updateResult = apiClient.from('warranty_records')
          .update(warrantyData)
          .eq('id', warranty.id);
        const result = await updateResult;

        if (result.error) throw result.error;

        toast({
          title: 'Warranty Updated',
          description: 'Warranty record updated successfully',
        });
      } else {
        // Create new warranty
        const insertResult = apiClient.from('warranty_records').insert(warrantyData);
        const result = await insertResult;

        if (result.error) throw result.error;

        toast({
          title: 'Warranty Created',
          description: 'Warranty record created successfully',
        });
      }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{warranty ? 'Edit' : 'Register'} Warranty</DialogTitle>
          <DialogDescription>
            {warranty ? 'Update warranty details' : 'Register a new warranty record'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="unitSerial">Unit Serial Number *</Label>
            <Input
              id="unitSerial"
              value={formData.unitSerial}
              onChange={(e) => setFormData({ ...formData, unitSerial: e.target.value })}
              placeholder="Enter unit serial number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model *</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="Enter equipment model"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverageType">Coverage Type</Label>
            <Select
              value={formData.coverageType}
              onValueChange={(value) => setFormData({ ...formData, coverageType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select coverage type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="extended">Extended</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="comprehensive">Comprehensive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Warranty Start *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.warrantyStart, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.warrantyStart}
                    onSelect={(date) => date && setFormData({ ...formData, warrantyStart: date })}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Warranty End *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.warrantyEnd, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.warrantyEnd}
                    onSelect={(date) => date && setFormData({ ...formData, warrantyEnd: date })}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : warranty ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
