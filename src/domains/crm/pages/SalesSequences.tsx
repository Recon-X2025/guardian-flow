import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

export default function SalesSequences() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '' });
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };

  const { data, isLoading } = useQuery({
    queryKey: ['crm-sequences'],
    queryFn: () => fetch('/api/crm/sequences', { headers }).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (body: any) => fetch('/api/crm/sequences', { method: 'POST', headers, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-sequences'] }); setOpen(false); toast({ title: 'Sequence created' }); },
  });

  const sequences = data?.sequences ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Sales Sequences</h1>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />New Sequence</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? <p className="text-muted-foreground">Loading…</p> : sequences.map((s: any) => (
          <Card key={s.id}>
            <CardHeader><CardTitle className="text-base">{s.name}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{s.steps?.length ?? 0} steps</p>
              <p className="text-sm">{s.enrolled_count ?? 0} enrolled</p>
              <span className={`mt-2 inline-block px-2 py-0.5 rounded text-xs ${s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{s.status}</span>
            </CardContent>
          </Card>
        ))}
        {!isLoading && sequences.length === 0 && <p className="text-muted-foreground col-span-3">No sequences yet.</p>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Sales Sequence</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate({ ...form, steps: [], status: 'active' })}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
