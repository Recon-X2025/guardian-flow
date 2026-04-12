import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

export default function Subcontractors() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_name: '', contact_name: '', email: '', phone: '', hourly_rate: '' });
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };

  const { data, isLoading } = useQuery({
    queryKey: ['subcontractors'],
    queryFn: () => fetch('/api/subcontractors', { headers }).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (body: any) => fetch('/api/subcontractors', { method: 'POST', headers, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subcontractors'] }); setOpen(false); toast({ title: 'Subcontractor added' }); },
  });

  const subcontractors = data?.subcontractors ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Subcontractors</h1>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Subcontractor</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Registered Subcontractors</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Company</th>
                    <th className="py-2 pr-4">Contact</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Rate/hr</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subcontractors.map((s: any) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 pr-4 font-medium">{s.company_name}</td>
                      <td className="py-2 pr-4">{s.contact_name}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{s.email}</td>
                      <td className="py-2 pr-4">${s.hourly_rate}/hr</td>
                      <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs ${s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{s.status}</span></td>
                    </tr>
                  ))}
                  {subcontractors.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No subcontractors added yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Subcontractor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Company Name</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
            <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>Hourly Rate ($)</Label><Input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate({ ...form, hourly_rate: Number(form.hourly_rate) })}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
