import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { FileText, Leaf, Calculator, ChevronRight } from 'lucide-react';

export default function ESGDashboard() {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [scope3Open, setScope3Open] = useState(false);
  const [reportFramework, setReportFramework] = useState<'GRI' | 'SASB' | 'TCFD'>('GRI');
  const [reportYear, setReportYear] = useState(String(new Date().getFullYear()));
  const [generatedReport, setGeneratedReport] = useState<Record<string, unknown> | null>(null);
  const [scope3Spend, setScope3Spend] = useState({
    purchased_goods: '', business_travel: '', employee_commuting: '',
    upstream_transport: '', waste_operations: '',
  });
  const [scope3Result, setScope3Result] = useState<Record<string, unknown> | null>(null);
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

  const { data: reportsData, refetch: refetchReports } = useQuery({
    queryKey: ['esg-reports'],
    queryFn: () => fetch('/api/esg/reports', { headers }).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/esg/emissions', { method: 'POST', headers, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['esg-emissions'] }); qc.invalidateQueries({ queryKey: ['esg-summary'] }); setOpen(false); toast({ title: 'Emission logged' }); },
  });

  const generateReport = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/esg/reports/generate', {
        method: 'POST', headers, body: JSON.stringify({ framework: reportFramework, year: parseInt(reportYear) }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    onSuccess: (d) => {
      setGeneratedReport(d.report);
      refetchReports();
      toast({ title: `${reportFramework} report generated`, description: `Reporting year ${reportYear}` });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const calcScope3 = useMutation({
    mutationFn: async () => {
      const spend: Record<string, number> = {};
      for (const [k, v] of Object.entries(scope3Spend)) {
        if (v) spend[k] = parseFloat(v);
      }
      const res = await fetch('/api/esg/scope3/calculate', {
        method: 'POST', headers, body: JSON.stringify({ spend_by_category: spend, year }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    onSuccess: (d) => {
      setScope3Result(d);
      qc.invalidateQueries({ queryKey: ['esg-emissions'] });
      qc.invalidateQueries({ queryKey: ['esg-summary'] });
      toast({ title: 'Scope 3 calculated', description: `${d.total_scope3_tonnes} tCO₂e estimated` });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const targets = targetsData?.targets ?? [];
  const emissions = emissionsData?.records ?? [];
  const reports = reportsData?.reports ?? [];

  const scopeCards = [
    { label: 'Scope 1 (Direct)', value: summary?.scope1 ?? 0, color: 'text-red-600' },
    { label: 'Scope 2 (Indirect)', value: summary?.scope2 ?? 0, color: 'text-orange-600' },
    { label: 'Scope 3 (Value Chain)', value: summary?.scope3 ?? 0, color: 'text-yellow-600' },
    { label: 'Total CO₂e (kg)', value: summary?.total ?? 0, color: 'text-gray-800' },
  ];

  const frameworkColour = (fw: string) => {
    if (fw === 'GRI') return 'bg-green-100 text-green-800';
    if (fw === 'SASB') return 'bg-blue-100 text-blue-800';
    return 'bg-purple-100 text-purple-800';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Leaf className="h-6 w-6 text-green-600" />ESG Dashboard</h1>
          <p className="text-sm text-muted-foreground">Scope 1/2/3 emissions, targets, and GRI/SASB/TCFD reporting</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setScope3Open(true)}>
            <Calculator className="h-4 w-4 mr-2" />Scope 3 Calc
          </Button>
          <Button variant="outline" onClick={() => setReportOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />Generate Report
          </Button>
          <Button onClick={() => setOpen(true)}>+ Log Emission</Button>
        </div>
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

      <Tabs defaultValue="emissions">
        <TabsList>
          <TabsTrigger value="emissions">Emissions Log</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="emissions" className="mt-4">
          <Card>
            <CardContent className="pt-4">
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
                  {emissions.slice(0, 20).map((e: Record<string, unknown>) => (
                    <tr key={e.id as string} className="border-b last:border-0">
                      <td className="py-2 pr-4"><span className="px-2 py-0.5 rounded text-xs bg-gray-100 font-medium">Scope {e.scope as string}</span></td>
                      <td className="py-2 pr-4">{e.category as string}</td>
                      <td className="py-2 pr-4">{e.source as string}</td>
                      <td className="py-2 pr-4 font-medium">{(e.quantity_kg_co2e as number)?.toLocaleString()}</td>
                      <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs ${e.verification_status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{e.verification_status as string}</span></td>
                    </tr>
                  ))}
                  {emissions.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No emissions logged.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targets" className="mt-4">
          {targets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No reduction targets set.</p>
          ) : (
            <Card>
              <CardContent className="pt-4 space-y-3">
                {targets.map((t: Record<string, unknown>) => {
                  const bl = Number(t.baseline_kg) || 0;
                  const tg = Number(t.target_kg) || 0;
                  const pct = Math.min(100, Math.round(((bl - (summary?.total ?? bl)) / (bl - tg || 1)) * 100));
                  return (
                    <div key={t.id as string}>
                      <div className="flex justify-between text-sm mb-1"><span>{t.description as string || t.target_type as string}</span><span>{pct}%</span></div>
                      <div className="h-2 bg-muted rounded"><div className="h-2 bg-green-500 rounded" style={{ width: `${Math.max(0, pct)}%` }} /></div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          {reports.length === 0 ? (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>No reports yet. Click "Generate Report" to create a GRI, SASB, or TCFD disclosure report from your emissions data.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {reports.map((r: Record<string, unknown>) => (
                <Card key={r.id as string}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={frameworkColour(r.framework as string)}>{r.framework as string}</Badge>
                        <span className="font-medium">{r.reporting_year as number || new Date(r.created_at as string).getFullYear()} Report</span>
                        <Badge variant="outline">{r.status as string}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at as string).toLocaleDateString()}</span>
                    </div>
                    {r.emissions_summary && (
                      <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <span>Scope 1: {((r.emissions_summary as Record<string, number>).scope1 / 1000).toFixed(1)} tCO₂e</span>
                        <span>Scope 2: {((r.emissions_summary as Record<string, number>).scope2 / 1000).toFixed(1)} tCO₂e</span>
                        <span>Scope 3: {((r.emissions_summary as Record<string, number>).scope3 / 1000).toFixed(1)} tCO₂e</span>
                        <span>Total: {((r.emissions_summary as Record<string, number>).total / 1000).toFixed(1)} tCO₂e</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Log Emission Dialog */}
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

      {/* Generate Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Generate ESG Report</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Reporting Framework</Label>
              <Select value={reportFramework} onValueChange={(v) => setReportFramework(v as 'GRI' | 'SASB' | 'TCFD')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GRI">GRI (Global Reporting Initiative)</SelectItem>
                  <SelectItem value="SASB">SASB (Sustainability Accounting Standards Board)</SelectItem>
                  <SelectItem value="TCFD">TCFD (Task Force on Climate-related Disclosures)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reporting Year</Label>
              <Input type="number" value={reportYear} onChange={e => setReportYear(e.target.value)} min={2020} max={2030} />
            </div>

            {generatedReport && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Report generated. {Object.keys((generatedReport.sections as Record<string, unknown>) ?? {}).length} disclosures included.
                  Total emissions: {((generatedReport.emissions_summary as Record<string, number>)?.total / 1000)?.toFixed(1)} tCO₂e.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReportOpen(false); setGeneratedReport(null); }}>Close</Button>
            <Button onClick={() => generateReport.mutate()} disabled={generateReport.isPending}>
              {generateReport.isPending ? 'Generating…' : <><FileText className="h-4 w-4 mr-2" />Generate</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scope 3 Calculator Dialog */}
      <Dialog open={scope3Open} onOpenChange={setScope3Open}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Scope 3 Supply Chain Calculator</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Enter annual spend ($) per category. EPA EEIO emission factors applied.</p>
          <div className="space-y-2 py-2">
            {Object.keys(scope3Spend).map(cat => (
              <div key={cat} className="flex items-center gap-3">
                <Label className="w-44 text-xs capitalize shrink-0">{cat.replace(/_/g, ' ')}</Label>
                <Input
                  type="number" placeholder="0"
                  value={(scope3Spend as Record<string, string>)[cat]}
                  onChange={e => setScope3Spend(s => ({ ...s, [cat]: e.target.value }))}
                  className="h-8"
                />
              </div>
            ))}
          </div>

          {scope3Result && (
            <Alert>
              <ChevronRight className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Estimated Scope 3: <strong>{(scope3Result.total_scope3_tonnes as number)?.toFixed(2)} tCO₂e</strong> ({(scope3Result.total_scope3_kg as number)?.toLocaleString()} kg).
                {scope3Result.persisted as boolean ? ' Saved to emissions log.' : ''}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setScope3Open(false); setScope3Result(null); }}>Close</Button>
            <Button onClick={() => calcScope3.mutate()} disabled={calcScope3.isPending}>
              {calcScope3.isPending ? 'Calculating…' : 'Calculate & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
