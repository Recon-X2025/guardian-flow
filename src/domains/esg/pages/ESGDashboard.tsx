import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/domains/shared/hooks/use-toast';

export default function ESGDashboard() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ scope: '1', category: '', source: '', quantity_kg_co2e: '', period_start: '', period_end: '' });
  const { toast } = useToast();
  const qc = useQueryClient();
  const year = new Date().getFullYear();
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };

  const { data: summary } = useQuery({
    queryKey: ['esg-summary', year],
    queryFn: () => fetch(`/api/esg/emissions/summary?year=${year}`, { headers }).then(r => r.json()),
  });

  const { data: targetsData } = useQuery({
    queryKey: ['esg-targets'],
    queryFn: () => fetch('/api/esg/targets', { headers }).then(r => r.json()),
  });

  const { data: emissionsData } = useQuery({
    queryKey: ['esg-emissions'],
    queryFn: () => fetch('/api/esg/emissions', { headers }).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (body: any) => fetch('/api/esg/emissions', { method: 'POST', headers, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['esg-emissions'] }); qc.invalidateQueries({ queryKey: ['esg-summary'] }); setOpen(false); toast({ title: 'Emission logged' }); },
  });

  const targets = targetsData?.targets ?? [];
  const emissions = emissionsData?.emissions ?? [];

  const scopeCards = [
    { label: 'Scope 1 (Direct)', value: summary?.scope1 ?? 0, color: 'text-red-600' },
    { label: 'Scope 2 (Indirect)', value: summary?.scope2 ?? 0, color: 'text-orange-600' },
    { label: 'Scope 3 (Value Chain)', value: summary?.scope3 ?? 0, color: 'text-yellow-600' },
    { label: 'Total CO₂e (kg)', value: summary?.total ?? 0, color: 'text-gray-800' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ESG Dashboard</h1>
        <Button onClick={() => setOpen(true)}>+ Log Emission</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {scopeCards.map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4 text-center">
              <div className={`text-2xl font-bold ${c.color}`}>{c.value.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {targets.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Reduction Targets</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {targets.map((t: any) => {
              const pct = Math.min(100, Math.round(((t.baseline_kg - (summary?.total ?? t.baseline_kg)) / (t.baseline_kg - t.target_kg)) * 100));
              return (
                <div key={t.id}>
                  <div className="flex justify-between text-sm mb-1"><span>{t.description || t.target_type}</span><span>{pct}%</span></div>
                  <div className="h-2 bg-muted rounded"><div className="h-2 bg-green-500 rounded" style={{ width: `${Math.max(0, pct)}%` }} /></div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Recent Emissions</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">Scope</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">kg CO₂e</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {emissions.slice(0, 20).map((e: any) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="py-2 pr-4"><span className="px-2 py-0.5 rounded text-xs bg-gray-100 font-medium">Scope {e.scope}</span></td>
                  <td className="py-2 pr-4">{e.category}</td>
                  <td className="py-2 pr-4">{e.source}</td>
                  <td className="py-2 pr-4 font-medium">{e.quantity_kg_co2e?.toLocaleString()}</td>
                  <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs ${e.verification_status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{e.verification_status}</span></td>
                </tr>
              ))}
              {emissions.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No emissions logged.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Emission</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Scope</Label><Input value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} placeholder="1, 2, or 3" /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div><Label>Source</Label><Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} /></div>
            <div><Label>Quantity (kg CO₂e)</Label><Input type="number" value={form.quantity_kg_co2e} onChange={e => setForm(f => ({ ...f, quantity_kg_co2e: e.target.value }))} /></div>
            <div><Label>Period Start</Label><Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} /></div>
            <div><Label>Period End</Label><Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate({ ...form, scope: Number(form.scope), quantity_kg_co2e: Number(form.quantity_kg_co2e) })}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
