import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

export default function DashboardBuilder() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };

  const { data, isLoading } = useQuery({
    queryKey: ['custom-dashboards'],
    queryFn: () => fetch('/api/dashboards', { headers }).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (body: any) => fetch('/api/dashboards', { method: 'POST', headers, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['custom-dashboards'] }); setOpen(false); toast({ title: 'Dashboard created' }); },
  });

  const dashboards = data?.dashboards ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard Builder</h1>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />New Dashboard</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dashboards.map((d: any) => (
            <Card key={d.id} className="cursor-pointer hover:border-primary/60 transition-colors">
              <CardHeader><CardTitle className="text-base">{d.name}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{d.description || 'No description'}</p>
                <p className="text-xs text-muted-foreground mt-2">{d.is_public ? '🌐 Public' : '🔒 Private'} · {d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}</p>
              </CardContent>
            </Card>
          ))}
          {dashboards.length === 0 && <p className="text-muted-foreground col-span-3">No dashboards yet. Create one to get started.</p>}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Dashboard</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate(form)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
