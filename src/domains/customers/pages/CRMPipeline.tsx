import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, ChevronRight, TrendingUp, DollarSign, Target } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { toast } from '@/components/ui/sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

const STAGES = ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'] as const;
type Stage = typeof STAGES[number];

interface Deal {
  id: string;
  title: string;
  accountId?: string;
  contactId?: string;
  stage: Stage;
  amount: number;
  probability: number;
  expectedCloseDate?: string;
  owner?: string;
  notes?: string;
  status: string;
}

interface Activity {
  id: string;
  type: string;
  summary: string;
  timestamp: string;
}

interface PipelineSummary {
  stages: { stage: string; count: number; totalAmount: number; weightedARR: number }[];
  forecastThisMonth: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

async function crmReq<T>(endpoint: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await apiClient.request<T>(`/api/crm${endpoint}`, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const STAGE_COLORS: Record<Stage, string> = {
  'Prospect':     'bg-slate-100 border-slate-300',
  'Qualified':    'bg-blue-50 border-blue-300',
  'Proposal':     'bg-violet-50 border-violet-300',
  'Negotiation':  'bg-amber-50 border-amber-300',
  'Closed Won':   'bg-green-50 border-green-300',
  'Closed Lost':  'bg-red-50 border-red-300',
};

const STAGE_HEADER_COLORS: Record<Stage, string> = {
  'Prospect':     'bg-slate-200 text-slate-800',
  'Qualified':    'bg-blue-100 text-blue-800',
  'Proposal':     'bg-violet-100 text-violet-800',
  'Negotiation':  'bg-amber-100 text-amber-800',
  'Closed Won':   'bg-green-100 text-green-800',
  'Closed Lost':  'bg-red-100 text-red-800',
};

// ── Deal Card ─────────────────────────────────────────────────────────────────

function DealCard({ deal, onMoveNext, onClick }: {
  deal: Deal;
  onMoveNext: () => void;
  onClick: () => void;
}) {
  const stageIdx  = STAGES.indexOf(deal.stage);
  const hasNext   = stageIdx >= 0 && stageIdx < STAGES.length - 1;
  const weightedARR = (deal.amount * deal.probability) / 100;

  return (
    <div
      className={`rounded-lg border p-3 cursor-pointer space-y-2 hover:shadow-md transition-shadow ${STAGE_COLORS[deal.stage] ?? 'bg-white border-gray-200'}`}
      onClick={onClick}
    >
      <div className="font-medium text-sm leading-tight">{deal.title}</div>
      {deal.accountId && <div className="text-xs text-muted-foreground">{deal.accountId}</div>}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{fmt(deal.amount)}</span>
        <Badge variant="outline" className="text-xs">{deal.probability}%</Badge>
      </div>
      <div className="text-xs text-muted-foreground">Weighted: {fmt(weightedARR)}</div>
      {hasNext && (
        <Button
          size="sm"
          variant="ghost"
          className="w-full text-xs h-7"
          onClick={e => { e.stopPropagation(); onMoveNext(); }}
        >
          <ChevronRight className="h-3 w-3 mr-1" />Move to {STAGES[stageIdx + 1]}
        </Button>
      )}
    </div>
  );
}

// ── New Deal Dialog ───────────────────────────────────────────────────────────

function NewDealDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    title: '', accountId: '', amount: '', probability: '10',
    stage: 'Prospect' as Stage, expectedCloseDate: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    if (!form.title) return toast.error('Title is required');
    setSaving(true);
    try {
      await crmReq('/deals', 'POST', {
        ...form,
        amount:      parseFloat(form.amount) || 0,
        probability: parseInt(form.probability) || 10,
      });
      toast.success('Deal created');
      onOpenChange(false);
      onCreated();
      setForm({ title: '', accountId: '', amount: '', probability: '10', stage: 'Prospect', expectedCloseDate: '', notes: '' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create deal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Deal</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Account / Company</Label>
            <Input value={form.accountId} onChange={e => set('accountId', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Stage</Label>
            <Select value={form.stage} onValueChange={v => set('stage', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Amount (USD)</Label>
            <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Probability (%)</Label>
            <Input type="number" min="0" max="100" value={form.probability} onChange={e => set('probability', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Expected Close Date</Label>
            <Input type="date" value={form.expectedCloseDate} onChange={e => set('expectedCloseDate', e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !form.title}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create Deal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Deal Drawer ───────────────────────────────────────────────────────────────

function DealDrawer({ dealId, open, onOpenChange }: {
  dealId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [deal, setDeal]           = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!dealId || !open) return;
    setLoading(true);
    crmReq<{ deal: Deal; activities: Activity[] }>(`/deals/${dealId}`)
      .then(d => { setDeal(d.deal); setActivities(d.activities ?? []); })
      .catch(() => toast.error('Failed to load deal'))
      .finally(() => setLoading(false));
  }, [dealId, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{deal?.title ?? 'Deal Details'}</SheetTitle>
        </SheetHeader>

        {loading && <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>}

        {deal && !loading && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Stage:</span><br /><Badge variant="outline">{deal.stage}</Badge></div>
              <div><span className="text-muted-foreground">Amount:</span><br /><span className="font-semibold">{fmt(deal.amount)}</span></div>
              <div><span className="text-muted-foreground">Probability:</span><br /><span className="font-semibold">{deal.probability}%</span></div>
              <div><span className="text-muted-foreground">Weighted:</span><br /><span className="font-semibold">{fmt((deal.amount * deal.probability) / 100)}</span></div>
              {deal.expectedCloseDate && (
                <div><span className="text-muted-foreground">Close Date:</span><br />{deal.expectedCloseDate}</div>
              )}
              {deal.accountId && (
                <div><span className="text-muted-foreground">Account:</span><br />{deal.accountId}</div>
              )}
            </div>

            {deal.notes && (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Notes</p>
                <p className="bg-muted rounded p-2">{deal.notes}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold mb-2">Activity Timeline</p>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activities yet</p>
              ) : (
                <div className="space-y-2">
                  {[...activities].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(act => (
                    <div key={act.id} className="text-xs border-l-2 border-muted pl-3">
                      <div className="flex gap-2 text-muted-foreground">
                        <Badge variant="secondary" className="text-xs capitalize">{act.type}</Badge>
                        <span>{new Date(act.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="mt-0.5">{act.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CRMPipeline() {
  const [deals, setDeals]         = useState<Deal[]>([]);
  const [summary, setSummary]     = useState<PipelineSummary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsData, summaryData] = await Promise.all([
        crmReq<{ deals: Deal[] }>('/deals'),
        crmReq<PipelineSummary>('/pipeline/summary'),
      ]);
      setDeals(dealsData.deals ?? []);
      setSummary(summaryData);
    } catch {
      toast.error('Failed to load CRM pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMoveNext = async (deal: Deal) => {
    const idx = STAGES.indexOf(deal.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const nextStage = STAGES[idx + 1];
    try {
      await crmReq(`/deals/${deal.id}/stage`, 'PUT', { stage: nextStage });
      setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, stage: nextStage } : d));
      toast.success(`Moved to ${nextStage}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update stage');
    }
  };

  const openDeal = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
  };

  const totalPipeline  = deals.filter(d => d.status === 'open').reduce((s, d) => s + d.amount, 0);
  const weightedTotal  = deals.filter(d => d.status === 'open').reduce((s, d) => s + (d.amount * d.probability) / 100, 0);

  const dealsByStage = (stage: Stage) => deals.filter(d => d.stage === stage && d.status !== 'deleted');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">CRM Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1">Track deals from prospect to close.</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" />New Deal
        </Button>
      </div>

      {/* Summary widget */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(totalPipeline)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Weighted ARR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(weightedTotal)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Forecast This Month</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(summary?.forecastThisMonth ?? 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Open Deals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{deals.filter(d => d.status === 'open').length}</div></CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading pipeline…
        </div>
      ) : (
        /* Kanban board */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageDeals = dealsByStage(stage);
            const stageTotal = stageDeals.reduce((s, d) => s + d.amount, 0);
            return (
              <div key={stage} className="flex-none w-60">
                <div className={`rounded-t-lg px-3 py-2 flex items-center justify-between ${STAGE_HEADER_COLORS[stage]}`}>
                  <span className="text-xs font-semibold">{stage}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">{stageDeals.length}</Badge>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-b-lg p-2 space-y-2 min-h-[200px]">
                  {stageDeals.length > 0 && (
                    <div className="text-xs text-muted-foreground text-right pr-1">{fmt(stageTotal)}</div>
                  )}
                  {stageDeals.map(deal => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onMoveNext={() => handleMoveNext(deal)}
                      onClick={() => openDeal(deal.id)}
                    />
                  ))}
                  {stageDeals.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No deals</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewDealDialog open={showNew} onOpenChange={setShowNew} onCreated={load} />
      <DealDrawer dealId={selectedId} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
