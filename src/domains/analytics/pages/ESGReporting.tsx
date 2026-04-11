import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Leaf, PlusCircle, Download } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

const CURRENT_YEAR = new Date().getFullYear().toString();

interface ScopeData {
  total_co2e: number;
  activities: Activity[];
}

interface ScopeReport {
  year: string;
  scope1: ScopeData;
  scope2: ScopeData;
  scope3: ScopeData;
  total: number;
  vsLastYear: string | null;
}

interface Activity {
  id: string;
  period: string;
  scope: number;
  activityType: string;
  quantity: number;
  unit: string;
  emissionFactor: number;
  co2eKg: number;
  createdAt: string;
}

function DonutChart({ scope1, scope2, scope3 }: { scope1: number; scope2: number; scope3: number }) {
  const total = scope1 + scope2 + scope3 || 1;
  const pct1 = (scope1 / total) * 100;
  const pct2 = (scope2 / total) * 100;
  const pct3 = (scope3 / total) * 100;
  const c = 2 * Math.PI * 40;
  let offset = 0;
  const segments = [
    { pct: pct1, color: '#22c55e', label: 'Scope 1' },
    { pct: pct2, color: '#3b82f6', label: 'Scope 2' },
    { pct: pct3, color: '#a855f7', label: 'Scope 3' },
  ];
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-32 h-32">
        <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="20" />
        {segments.map((seg, i) => {
          const dash = (seg.pct / 100) * c;
          const el = (
            <circle
              key={i}
              cx="50" cy="50" r="40"
              fill="none"
              stroke={seg.color}
              strokeWidth="20"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset / 100 * c + c / 4}
              transform="rotate(-90 50 50)"
            />
          );
          offset += seg.pct;
          return el;
        })}
        <text x="50" y="54" textAnchor="middle" fontSize="10" fill="currentColor">{total.toFixed(0)}</text>
        <text x="50" y="63" textAnchor="middle" fontSize="6" fill="currentColor">kg CO₂e</text>
      </svg>
      <div className="space-y-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ background: seg.color }} />
            <span>{seg.label}</span>
            <span className="text-muted-foreground text-xs">{[scope1, scope2, scope3][i].toFixed(1)} kg</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ACTIVITY_TYPES = ['natural_gas', 'electricity', 'diesel', 'petrol', 'air_travel', 'supply_chain'];

export default function ESGReporting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [tab, setTab] = useState('overview');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ period: CURRENT_YEAR, scope: '1', activityType: 'electricity', quantity: '', unit: 'kwh' });

  const { data: scopeReport } = useQuery<ScopeReport>({
    queryKey: ['esg-scope', year],
    queryFn: async () => {
      const res = await fetch(`/api/esg/reports/scope?year=${year}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const { data: activitiesData } = useQuery<{ activities: Activity[]; total: number }>({
    queryKey: ['esg-activities'],
    queryFn: async () => {
      const res = await fetch('/api/esg/activities');
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch('/api/esg/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, quantity: parseFloat(data.quantity), scope: parseInt(data.scope) }),
      });
      if (!res.ok) throw new Error(await res.json().then((d: { error?: string }) => d.error) || 'Failed');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Activity recorded' });
      queryClient.invalidateQueries({ queryKey: ['esg-activities'] });
      queryClient.invalidateQueries({ queryKey: ['esg-scope', year] });
      setIsAddOpen(false);
      setForm({ period: CURRENT_YEAR, scope: '1', activityType: 'electricity', quantity: '', unit: 'kwh' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleExportCDP = async () => {
    try {
      const res = await fetch('/api/esg/reports/cdp-template');
      if (!res.ok) throw new Error('Failed to fetch CDP template');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cdp-template.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast({ title: 'Export failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    }
  };

  const scope1 = scopeReport?.scope1?.total_co2e ?? 0;
  const scope2 = scopeReport?.scope2?.total_co2e ?? 0;
  const scope3 = scopeReport?.scope3?.total_co2e ?? 0;
  const total = scopeReport?.total ?? 0;
  const activities: Activity[] = activitiesData?.activities ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ESG Reporting</h1>
          <p className="text-muted-foreground">Environmental, Social and Governance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Input value={year} onChange={e => setYear(e.target.value)} className="w-24" placeholder="Year" />
          <Button size="sm" variant="outline" onClick={handleExportCDP}><Download className="h-4 w-4 mr-2" />Export CDP</Button>
          <Button size="sm" onClick={() => setIsAddOpen(true)}><PlusCircle className="h-4 w-4 mr-2" />Add Activity</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Leaf className="h-8 w-8 text-green-500" /><div><p className="text-xs text-muted-foreground">Total CO₂e ({year})</p><p className="text-xl font-bold">{(total / 1000).toFixed(2)}t</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Scope 1</p><p className="text-lg font-bold text-green-600">{scope1.toFixed(1)} kg</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Scope 2</p><p className="text-lg font-bold text-blue-600">{scope2.toFixed(1)} kg</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Scope 3</p><p className="text-lg font-bold text-purple-600">{scope3.toFixed(1)} kg</p></CardContent></Card>
      </div>

      {scopeReport?.vsLastYear !== undefined && scopeReport?.vsLastYear !== null && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm">vs Last Year: <Badge variant={parseFloat(scopeReport.vsLastYear) <= 0 ? 'default' : 'destructive'}>{parseFloat(scopeReport.vsLastYear) > 0 ? '+' : ''}{scopeReport.vsLastYear}%</Badge></p>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Scope Breakdown</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Emissions by Scope ({year})</CardTitle></CardHeader>
            <CardContent>
              <DonutChart scope1={scope1} scope2={scope2} scope3={scope3} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Activity Log</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>CO₂e (kg)</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>{a.period}</TableCell>
                      <TableCell><Badge variant="outline">Scope {a.scope}</Badge></TableCell>
                      <TableCell>{a.activityType}</TableCell>
                      <TableCell>{a.quantity} {a.unit}</TableCell>
                      <TableCell className="font-medium">{a.co2eKg?.toFixed(2)}</TableCell>
                      <TableCell>{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {activities.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No activities recorded.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add ESG Activity</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Period (e.g. 2024)</Label><Input value={form.period} onChange={e => setForm({...form, period: e.target.value})} /></div>
            <div><Label>Scope</Label>
              <Select value={form.scope} onValueChange={v => setForm({...form, scope: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Scope 1 — Direct emissions</SelectItem>
                  <SelectItem value="2">Scope 2 — Purchased energy</SelectItem>
                  <SelectItem value="3">Scope 3 — Value chain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Activity Type</Label>
              <Select value={form.activityType} onValueChange={v => setForm({...form, activityType: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} /></div>
            <div><Label>Unit</Label><Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate(form)} disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Saving...' : 'Save Activity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
