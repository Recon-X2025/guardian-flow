import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

const statusColor: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  posted: 'bg-green-100 text-green-800',
};

export default function GoodsReceipt() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', receipt_date: new Date().toISOString().split('T')[0], po_id: '' });
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };

  const { data, isLoading } = useQuery({
    queryKey: ['goods-receipts'],
    queryFn: () => fetch('/api/goods-receipt', { headers }).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (body: any) => fetch('/api/goods-receipt', { method: 'POST', headers, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goods-receipts'] }); setOpen(false); toast({ title: 'GR created' }); },
  });

  const post = useMutation({
    mutationFn: (id: string) => fetch(`/api/goods-receipt/${id}/post`, { method: 'PUT', headers }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goods-receipts'] }); toast({ title: 'GR posted' }); },
  });

  const receipts = data?.receipts ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Goods Receipts</h1>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />New GR</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Receipts</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Supplier</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Total Value</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 pr-4">{r.supplier_id || '—'}</td>
                      <td className="py-2 pr-4">{r.receipt_date}</td>
                      <td className="py-2 pr-4">${(r.total_value ?? 0).toLocaleString()}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[r.status] ?? 'bg-gray-100 text-gray-800'}`}>{r.status}</span>
                      </td>
                      <td className="py-2">
                        {r.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => post.mutate(r.id)}>Post</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {receipts.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No goods receipts found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Goods Receipt</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Supplier ID</Label><Input value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))} /></div>
            <div><Label>PO Reference</Label><Input value={form.po_id} onChange={e => setForm(f => ({ ...f, po_id: e.target.value }))} /></div>
            <div><Label>Receipt Date</Label><Input type="date" value={form.receipt_date} onChange={e => setForm(f => ({ ...f, receipt_date: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate({ ...form, lines: [] })}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
