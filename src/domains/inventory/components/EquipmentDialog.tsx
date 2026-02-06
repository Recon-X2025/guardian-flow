import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { apiClient } from '@/integrations/api/client';

interface Equipment {
  id?: string;
  name: string;
  category: string;
  serial_number?: string;
}

interface EquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: Equipment | null;
  onSuccess: () => void;
}

export function EquipmentDialog({ open, onOpenChange, equipment, onSuccess }: EquipmentDialogProps) {
  const [formData, setFormData] = useState<Partial<Equipment>>(equipment || {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (equipment) {
      const updateResult = apiClient.from('equipment').update(formData).eq('id', equipment.id);
      await updateResult;
    } else {
      await apiClient.functions.invoke('equipment-register', { body: formData });
    }
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{equipment ? 'Edit Equipment' : 'Register Equipment'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Name</Label><Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
          <div><Label>Category</Label><Input value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} required /></div>
          <div><Label>Serial Number</Label><Input value={formData.serial_number || ''} onChange={e => setFormData({...formData, serial_number: e.target.value})} /></div>
          <Button type="submit">Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}