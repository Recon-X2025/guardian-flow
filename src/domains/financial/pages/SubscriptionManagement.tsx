/**
 * @file src/domains/financial/pages/SubscriptionManagement.tsx
 * @description Subscription & Recurring Billing management page.
 *
 * Features:
 * - Plan management (create, view, archive)
 * - Subscription list with status badges and billing cycle info
 * - Subscription detail drawer with invoice history
 * - Create subscription wizard (select plan + customer details)
 * - Cancel / pause / resume actions
 * - Manual "Run Billing Cycle" trigger for platform admins
 */

import { useState } from 'react';
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, Plus, RefreshCw, MoreVertical, CreditCard, Package, DollarSign,
} from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { toast } from '@/domains/shared/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_amount: number;
  currency: string;
  billing_interval: string;
  features: string[];
}

interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  price_amount: number;
  currency: string;
  billing_interval: string;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

interface SubscriptionInvoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  period_start: string;
  period_end: string;
  due_date: string;
  paid_at: string | null;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchPlans(): Promise<Plan[]> {
  const res = await apiClient.request('/api/subscriptions/plans');
  if (res.error) throw new Error(res.error.message);
  return (res.data as { plans: Plan[] }).plans;
}

async function fetchSubscriptions(): Promise<Subscription[]> {
  const res = await apiClient.request('/api/subscriptions');
  if (res.error) throw new Error(res.error.message);
  return (res.data as { subscriptions: Subscription[] }).subscriptions;
}

async function fetchSubscriptionDetail(id: string) {
  const res = await apiClient.request(`/api/subscriptions/${id}`);
  if (res.error) throw new Error(res.error.message);
  return res.data as { subscription: Subscription; invoices: SubscriptionInvoice[] };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

const INTERVAL_LABELS: Record<string, string> = {
  monthly: '/ month', quarterly: '/ quarter', annual: '/ year', weekly: '/ week',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default', trialing: 'secondary', paused: 'secondary',
  past_due: 'destructive', cancelled: 'secondary', incomplete: 'destructive',
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SubscriptionManagement() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [showNewSub, setShowNewSub] = useState(false);

  const [planForm, setPlanForm] = useState({
    name: '', description: '', price_amount: '', currency: 'USD',
    billing_interval: 'monthly', features: '',
  });
  const [subForm, setSubForm] = useState({
    plan_id: '', customer_name: '', customer_email: '',
  });

  const { data: plans = [] } = useQuery({ queryKey: ['sub-plans'], queryFn: fetchPlans });
  const { data: subs = [], isLoading } = useQuery({ queryKey: ['subscriptions'], queryFn: fetchSubscriptions });
  const { data: detail } = useQuery({
    queryKey: ['subscription-detail', selectedId],
    queryFn: () => fetchSubscriptionDetail(selectedId!),
    enabled: !!selectedId,
  });

  const createPlan = useMutation({
    mutationFn: async () => {
      const res = await apiClient.request('/api/subscriptions/plans', {
        method: 'POST',
        body: JSON.stringify({
          ...planForm,
          price_amount: parseFloat(planForm.price_amount),
          features: planForm.features ? planForm.features.split(',').map(f => f.trim()) : [],
        }),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-plans'] });
      setShowNewPlan(false);
      toast({ title: 'Plan created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const createSub = useMutation({
    mutationFn: async () => {
      const res = await apiClient.request('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify(subForm),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      setShowNewSub(false);
      toast({ title: 'Subscription created', description: 'First invoice generated automatically' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const cancelSub = useMutation({
    mutationFn: async ({ id, atPeriodEnd }: { id: string; atPeriodEnd: boolean }) => {
      const res = await apiClient.request(`/api/subscriptions/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ at_period_end: atPeriodEnd }),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      qc.invalidateQueries({ queryKey: ['subscription-detail', selectedId] });
      toast({ title: 'Subscription cancelled' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const pauseSub = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.request(`/api/subscriptions/${id}/pause`, { method: 'POST' });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); toast({ title: 'Subscription paused' }); },
  });

  const resumeSub = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.request(`/api/subscriptions/${id}/resume`, { method: 'POST' });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); toast({ title: 'Subscription resumed' }); },
  });

  const runBilling = useMutation({
    mutationFn: async () => {
      const res = await apiClient.request('/api/subscriptions/run-billing-cycle', { method: 'POST' });
      if (res.error) throw new Error(res.error.message);
      return res.data as { count: number };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ title: 'Billing cycle complete', description: `${d.count} subscription(s) billed` });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscription Billing</h1>
          <p className="text-muted-foreground text-sm">Recurring billing plans and subscription management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => runBilling.mutate()} disabled={runBilling.isPending}>
            {runBilling.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Run Billing Cycle
          </Button>
          <Button variant="outline" onClick={() => setShowNewPlan(true)}>
            <Package className="h-4 w-4 mr-2" />New Plan
          </Button>
          <Button onClick={() => setShowNewSub(true)}>
            <Plus className="h-4 w-4 mr-2" />New Subscription
          </Button>
        </div>
      </div>

      {/* Plans overview */}
      {plans.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {plans.slice(0, 4).map(p => (
            <Card key={p.id}>
              <CardContent className="pt-4">
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(p.price_amount, p.currency)}</p>
                <p className="text-xs text-muted-foreground">{INTERVAL_LABELS[p.billing_interval] ?? p.billing_interval}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Subscriptions table */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Subscriptions</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
          ) : subs.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No subscriptions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs.map(s => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(s.id)}>
                    <TableCell>
                      <p className="font-medium">{s.customer_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{s.customer_email ?? ''}</p>
                    </TableCell>
                    <TableCell>{s.plan_name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(s.price_amount, s.currency)}</TableCell>
                    <TableCell className="capitalize">{s.billing_interval}</TableCell>
                    <TableCell className="text-sm">{s.current_period_end?.slice(0, 10)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[s.status] ?? 'secondary'} className="capitalize">
                        {s.cancel_at_period_end ? 'cancels at period end' : s.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {s.status === 'active' && <DropdownMenuItem onClick={() => pauseSub.mutate(s.id)}>Pause</DropdownMenuItem>}
                          {s.status === 'paused' && <DropdownMenuItem onClick={() => resumeSub.mutate(s.id)}>Resume</DropdownMenuItem>}
                          {s.status !== 'cancelled' && (
                            <>
                              <DropdownMenuItem onClick={() => cancelSub.mutate({ id: s.id, atPeriodEnd: true })}>Cancel at Period End</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => cancelSub.mutate({ id: s.id, atPeriodEnd: false })}>Cancel Immediately</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Subscription detail */}
      {selectedId && detail && (
        <Dialog open onOpenChange={() => setSelectedId(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{detail.subscription.customer_name ?? 'Subscription'} — {detail.subscription.plan_name}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="invoices">
              <TabsList><TabsTrigger value="invoices">Invoice History</TabsTrigger></TabsList>
              <TabsContent value="invoices">
                {detail.invoices.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4">No invoices yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due / Paid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.invoices.map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell className="text-sm">{inv.period_start?.slice(0, 10)} → {inv.period_end?.slice(0, 10)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv.amount, inv.currency)}</TableCell>
                          <TableCell>
                            <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'open' ? 'secondary' : 'destructive'}>
                              {inv.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {inv.paid_at ? `Paid ${inv.paid_at.slice(0, 10)}` : `Due ${inv.due_date?.slice(0, 10)}`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* New Plan dialog */}
      <Dialog open={showNewPlan} onOpenChange={setShowNewPlan}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Subscription Plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Price</Label><Input type="number" min={0} value={planForm.price_amount} onChange={e => setPlanForm(f => ({ ...f, price_amount: e.target.value }))} /></div>
              <div>
                <Label>Currency</Label>
                <Select value={planForm.currency} onValueChange={v => setPlanForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['USD', 'EUR', 'GBP', 'AUD', 'CAD'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Billing Interval</Label>
              <Select value={planForm.billing_interval} onValueChange={v => setPlanForm(f => ({ ...f, billing_interval: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Features (comma-separated)</Label><Input value={planForm.features} onChange={e => setPlanForm(f => ({ ...f, features: e.target.value }))} placeholder="Unlimited work orders, AI Copilot, Priority support" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPlan(false)}>Cancel</Button>
            <Button onClick={() => createPlan.mutate()} disabled={createPlan.isPending}>
              {createPlan.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Subscription dialog */}
      <Dialog open={showNewSub} onOpenChange={setShowNewSub}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Subscription</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Plan</Label>
              <Select value={subForm.plan_id} onValueChange={v => setSubForm(f => ({ ...f, plan_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price_amount, p.currency)} {INTERVAL_LABELS[p.billing_interval]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Customer Name</Label><Input value={subForm.customer_name} onChange={e => setSubForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
            <div><Label>Customer Email</Label><Input type="email" value={subForm.customer_email} onChange={e => setSubForm(f => ({ ...f, customer_email: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSub(false)}>Cancel</Button>
            <Button onClick={() => createSub.mutate()} disabled={createSub.isPending || !subForm.plan_id}>
              {createSub.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
