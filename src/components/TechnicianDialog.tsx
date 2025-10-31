import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function TechnicianDialog({ open, onOpenChange, technician, onSuccess }: any) {
  const [formData, setFormData] = useState(technician || {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (technician) {
      await supabase.from('technicians').update(formData).eq('id', technician.id);
    } else {
      await supabase.from('technicians').insert(formData);
    }
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{technician ? 'Edit Technician' : 'New Technician'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>First Name</Label><Input value={formData.first_name || ''} onChange={e => setFormData({...formData, first_name: e.target.value})} required /></div>
          <div><Label>Last Name</Label><Input value={formData.last_name || ''} onChange={e => setFormData({...formData, last_name: e.target.value})} required /></div>
          <div><Label>Phone</Label><Input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} required /></div>
          <Button type="submit">Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}