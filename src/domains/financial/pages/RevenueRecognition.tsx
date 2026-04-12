/**
 * @file src/domains/financial/pages/RevenueRecognition.tsx
 * @description ASC 606 / IFRS 15 Revenue Recognition management page.
 *
 * Features:
 * - Dashboard: total contract value, recognised, deferred, current period due
 * - Contract list with status badges and recognition progress bar
 * - Contract detail drawer: POBs, monthly schedule, journal lines
 * - New contract wizard: name, amount, performance obligations (over-time or point-in-time)
 * - One-click period-end recognition button
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Loader2, Plus, TrendingUp, DollarSign, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { toast } from '@/domains/shared/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RevenueDashboard {
  total_contract_value: number;
  total_recognised: number;
  total_deferred: number;
  active_contracts: number;
  recognition_rate: number;
  due_this_period: number;
  current_period: string;
}

interface RevenueContract {
  id: string;
  customer_name: string | null;
  description: string | null;
  contract_date: string;
  currency: string;
  total_amount: number;
  recognised_amount: number;
  deferred_amount: number;
  status: 'active' | 'completed' | 'cancelled';
}

interface POB {
  id: string;
  description: string;
  delivery_type: 'over_time' | 'point';
  standalone_selling_price: number;
  allocated_amount: number;
  recognised_amount: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
}

interface ScheduleRow {
  id: string;
  pob_id: string;
  period: string;
  amount: number;
  status: 'pending' | 'recognised';
  recognised_at: string | null;
}

interface NewPOB {
  description: string;
  delivery_type: 'over_time' | 'point';
  standalone_selling_price: string;
  start_date: string;
  end_date: string;
  delivery_date: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchDashboard(): Promise<RevenueDashboard> {
  const res = await apiClient.request('/api/revenue/dashboard');
  if (res.error) throw new Error(res.error.message ?? 'Failed to load dashboard');
  return res.data as RevenueDashboard;
}

async function fetchContracts(): Promise<RevenueContract[]> {
  const res = await apiClient.request('/api/revenue/contracts');
  if (res.error) throw new Error(res.error.message ?? 'Failed to load contracts');
  return (res.data as { contracts: RevenueContract[] }).contracts ?? [];
}

async function fetchContract(id: string) {
  const res = await apiClient.request(`/api/revenue/contracts/${id}`);
  if (res.error) throw new Error(res.error.message);
  return res.data as { contract: RevenueContract; performance_obligations: POB[]; schedules: ScheduleRow[] };
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  title, value, sub, icon: Icon, accent,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${accent ?? ''}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground opacity-60" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RevenueRecognition() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [recognisePeriod, setRecognisePeriod] = useState(() => new Date().toISOString().slice(0, 7));

  // Form state for new contract
  const [form, setForm] = useState({
    customer_name: '', description: '', contract_date: new Date().toISOString().slice(0, 10),
    currency: 'USD', total_amount: '',
  });
  const [pobs, setPobs] = useState<NewPOB[]>([{
    description: '', delivery_type: 'over_time', standalone_selling_price: '',
    start_date: '', end_date: '', delivery_date: '',
  }]);

  // Queries
  const { data: dash } = useQuery({ queryKey: ['revenue-dashboard'], queryFn: fetchDashboard });
  const { data: contracts = [], isLoading } = useQuery({ queryKey: ['revenue-contracts'], queryFn: fetchContracts });
  const { data: detail } = useQuery({
    queryKey: ['revenue-contract', selectedId],
    queryFn: () => fetchContract(selectedId!),
    enabled: !!selectedId,
  });

  // Mutations
  const createContract = useMutation({
    mutationFn: async () => {
      const payload = {
        customer_name: form.customer_name,
        description: form.description,
        contract_date: form.contract_date,
        currency: form.currency,
        total_amount: parseFloat(form.total_amount),
        performance_obligations: pobs.map(p => ({
          ...p,
          standalone_selling_price: parseFloat(p.standalone_selling_price || '0'),
        })),
      };
      const res = await apiClient.request('/api/revenue/contracts', { method: 'POST', body: JSON.stringify(payload) });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['revenue-contracts'] });
      qc.invalidateQueries({ queryKey: ['revenue-dashboard'] });
      setShowNew(false);
      toast({ title: 'Contract created', description: 'Performance obligations and schedule generated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const runRecognition = useMutation({
    mutationFn: async (contractId: string) => {
      const res = await apiClient.request(`/api/revenue/contracts/${contractId}/recognise`, {
        method: 'POST',
        body: JSON.stringify({ period: recognisePeriod }),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data as { total_recognised: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['revenue-contracts'] });
      qc.invalidateQueries({ queryKey: ['revenue-dashboard'] });
      qc.invalidateQueries({ queryKey: ['revenue-contract', selectedId] });
      toast({ title: 'Recognition complete', description: `${formatCurrency(data.total_recognised)} recognised for ${recognisePeriod}` });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addPob = useCallback(() => setPobs(prev => [...prev, {
    description: '', delivery_type: 'over_time', standalone_selling_price: '',
    start_date: '', end_date: '', delivery_date: '',
  }]), []);

  const updatePob = useCallback((i: number, field: keyof NewPOB, value: string) => {
    setPobs(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenue Recognition</h1>
          <p className="text-muted-foreground text-sm">ASC 606 / IFRS 15 — 5-step model</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Contract
        </Button>
      </div>

      {/* Dashboard KPIs */}
      {dash && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Contract Value" value={formatCurrency(dash.total_contract_value)} icon={DollarSign} />
          <StatCard title="Recognised" value={formatCurrency(dash.total_recognised)} accent="text-green-600" icon={CheckCircle2} />
          <StatCard title="Deferred" value={formatCurrency(dash.total_deferred)} icon={Clock} />
          <StatCard
            title="Recognition Rate"
            value={`${dash.recognition_rate}%`}
            sub={`Due ${dash.current_period}: ${formatCurrency(dash.due_this_period)}`}
            icon={TrendingUp}
            accent={dash.recognition_rate >= 75 ? 'text-green-600' : 'text-amber-500'}
          />
        </div>
      )}

      {/* Contract list */}
      <Card>
        <CardHeader>
          <CardTitle>Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
          ) : contracts.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No contracts yet. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer / Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Recognised</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map(c => {
                  const pct = c.total_amount > 0 ? Math.round((c.recognised_amount / c.total_amount) * 100) : 0;
                  return (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(c.id)}>
                      <TableCell>
                        <p className="font-medium">{c.customer_name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{c.description ?? ''}</p>
                      </TableCell>
                      <TableCell className="text-sm">{c.contract_date}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(c.total_amount, c.currency)}</TableCell>
                      <TableCell className="text-right text-sm text-green-600">{formatCurrency(c.recognised_amount, c.currency)}</TableCell>
                      <TableCell className="min-w-[100px]">
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2" />
                          <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Contract detail drawer */}
      {selectedId && detail && (
        <Dialog open onOpenChange={() => setSelectedId(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{detail.contract.customer_name ?? 'Contract'}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="pobs">
              <TabsList>
                <TabsTrigger value="pobs">Performance Obligations</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>
              <TabsContent value="pobs">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="text-right">Recognised</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.performance_obligations.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{p.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.delivery_type === 'point' ? 'Point-in-Time' : 'Over Time'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(p.allocated_amount, detail.contract.currency)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(p.recognised_amount, detail.contract.currency)}</TableCell>
                        <TableCell>
                          <Badge variant={p.recognised_amount >= p.allocated_amount ? 'default' : 'secondary'}>
                            {p.recognised_amount >= p.allocated_amount ? 'Complete' : 'Pending'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="schedule">
                <div className="flex items-end gap-3 mb-4">
                  <div>
                    <Label className="text-xs">Period (YYYY-MM)</Label>
                    <Input
                      value={recognisePeriod}
                      onChange={e => setRecognisePeriod(e.target.value)}
                      className="w-36 mt-1"
                      placeholder="2026-04"
                    />
                  </div>
                  <Button
                    onClick={() => runRecognition.mutate(selectedId)}
                    disabled={runRecognition.isPending}
                  >
                    {runRecognition.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Recognise Period
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recognised At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.schedules.slice().sort((a, b) => a.period.localeCompare(b.period)).map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.period}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.amount, detail.contract.currency)}</TableCell>
                        <TableCell>
                          {r.status === 'recognised'
                            ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Recognised</Badge>
                            : <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" />Pending</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.recognised_at ? new Date(r.recognised_at).toLocaleDateString() : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* New contract dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Revenue Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer Name</Label>
                <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
              </div>
              <div>
                <Label>Contract Date</Label>
                <Input type="date" value={form.contract_date} onChange={e => setForm(f => ({ ...f, contract_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Contract Amount</Label>
                <Input type="number" min={0} value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Performance Obligations</Label>
                <Button type="button" size="sm" variant="outline" onClick={addPob}>
                  <Plus className="h-3 w-3 mr-1" />Add POB
                </Button>
              </div>
              {pobs.map((pob, i) => (
                <Card key={i} className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Description</Label>
                      <Input value={pob.description} onChange={e => updatePob(i, 'description', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Delivery Type</Label>
                      <Select value={pob.delivery_type} onValueChange={v => updatePob(i, 'delivery_type', v as 'over_time' | 'point')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="over_time">Over Time (straight-line)</SelectItem>
                          <SelectItem value="point">Point-in-Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Standalone Selling Price</Label>
                      <Input type="number" min={0} value={pob.standalone_selling_price} onChange={e => updatePob(i, 'standalone_selling_price', e.target.value)} />
                    </div>
                    {pob.delivery_type === 'over_time' ? (
                      <>
                        <div>
                          <Label className="text-xs">Start Date</Label>
                          <Input type="date" value={pob.start_date} onChange={e => updatePob(i, 'start_date', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">End Date</Label>
                          <Input type="date" value={pob.end_date} onChange={e => updatePob(i, 'end_date', e.target.value)} />
                        </div>
                      </>
                    ) : (
                      <div>
                        <Label className="text-xs">Delivery Date</Label>
                        <Input type="date" value={pob.delivery_date} onChange={e => updatePob(i, 'delivery_date', e.target.value)} />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={() => createContract.mutate()} disabled={createContract.isPending}>
              {createContract.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
