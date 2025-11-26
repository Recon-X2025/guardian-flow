import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { apiClient } from '@/integrations/api/client';

export function ContractDialog({ open, onOpenChange, contract, onSuccess }: any) {
  const [formData, setFormData] = useState(contract || {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiClient.functions.invoke('contract-create', { body: { contract: formData, line_items: [] } });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Service Contract</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Title</Label><Input value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} required /></div>
          <div><Label>Contract Type</Label><Input value={formData.contract_type || ''} onChange={e => setFormData({...formData, contract_type: e.target.value})} required /></div>
          <Button type="submit">Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}