import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { apiClient } from '@/integrations/api/client';

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: { id: string; company_name?: string; email?: string } | null;
  onSuccess: () => void;
}

export function CustomerDialog({ open, onOpenChange, customer, onSuccess }: CustomerDialogProps) {
  const [formData, setFormData] = useState(customer || {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (customer) {
      const updateResult = apiClient.from('customers').update(formData).eq('id', customer.id);
      await updateResult;
    } else {
      await apiClient.functions.invoke('customer-create', { body: formData });
    }
    
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer' : 'New Customer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Company Name</Label>
              <Input value={formData.company_name || ''} onChange={e => setFormData({...formData, company_name: e.target.value})} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>
          <Button type="submit">Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}