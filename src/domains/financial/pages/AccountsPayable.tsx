import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2, XCircle, Clock, AlertCircle, Loader2,
  Plus, Play, FileText, TrendingDown,
} from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { toast } from '@/components/ui/sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

type APStatus         = 'received' | 'matched' | 'approved' | 'paid' | 'disputed';
type MatchStatus      = 'pending' | 'matched' | 'exception';

interface APInvoice {
  id: string;
  vendorName: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  currency: string;
  totalAmount: number;
  taxAmount: number;
  status: APStatus;
  threeWayMatchStatus: MatchStatus;
  purchaseOrderRef?: string;
  paymentRef?: string;
}

interface AgingBucket { count: number; amount: number }
interface AgingReport {
  current: AgingBucket;
  days30:  AgingBucket;
  days60:  AgingBucket;
  days90:  AgingBucket;
  over90:  AgingBucket;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<APStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  received: { label: 'Received',  variant: 'secondary'   },
  matched:  { label: 'Matched',   variant: 'outline'     },
  approved: { label: 'Approved',  variant: 'default'     },
  paid:     { label: 'Paid',      variant: 'default'     },
  disputed: { label: 'Disputed',  variant: 'destructive' },
};

const MATCH_CONFIG: Record<MatchStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending:   { label: 'Pending',   variant: 'secondary'   },
  matched:   { label: '✓ Matched', variant: 'default'     },
  exception: { label: 'Exception', variant: 'destructive' },
};

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
}

async function apRequest<T>(endpoint: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await apiClient.request<T>(`/api/ap${endpoint}`, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ invoices }: { invoices: APInvoice[] }) {
  const now      = Date.now();
  const week     = 7 * 86400000;
  const unpaid   = invoices.filter(i => i.status !== 'paid');
  const total    = unpaid.reduce((s, i) => s + i.totalAmount, 0);
  const dueWeek  = unpaid.filter(i => i.dueDate && new Date(i.dueDate).getTime() <= now + week && new Date(i.dueDate).getTime() > now);
  const overdue  = unpaid.filter(i => i.dueDate && new Date(i.dueDate).getTime() < now);
  const pending  = invoices.filter(i => i.status === 'received' || i.status === 'matched');

  const cards = [
    { title: 'Total Payable',     value: fmt(total),             icon: <TrendingDown className="h-4 w-4 text-muted-foreground" /> },
    { title: 'Due This Week',     value: fmt(dueWeek.reduce((s, i) => s + i.totalAmount, 0)), icon: <Clock className="h-4 w-4 text-amber-500" /> },
    { title: 'Overdue',           value: fmt(overdue.reduce((s, i) => s + i.totalAmount, 0)), icon: <AlertCircle className="h-4 w-4 text-destructive" /> },
    { title: 'Pending Approval',  value: String(pending.length), icon: <FileText className="h-4 w-4 text-muted-foreground" /> },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(c => (
        <Card key={c.title}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
            {c.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Invoice Table ─────────────────────────────────────────────────────────────

function InvoiceTable({
  invoices, onApprove, onDispute, onMatch, filter,
}: {
  invoices: APInvoice[];
  onApprove: (id: string) => void;
  onDispute: (id: string) => void;
  onMatch:   (id: string) => void;
  filter?: (inv: APInvoice) => boolean;
}) {
  const rows = filter ? invoices.filter(filter) : invoices;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vendor</TableHead>
          <TableHead>Invoice #</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>3-Way Match</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No invoices found</TableCell>
          </TableRow>
        )}
        {rows.map(inv => {
          const sc = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.received;
          const mc = MATCH_CONFIG[inv.threeWayMatchStatus] ?? MATCH_CONFIG.pending;
          return (
            <TableRow key={inv.id}>
              <TableCell className="font-medium">{inv.vendorName}</TableCell>
              <TableCell className="font-mono text-sm">{inv.invoiceNo}</TableCell>
              <TableCell className="text-sm">{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '—'}</TableCell>
              <TableCell className="text-sm">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(inv.totalAmount, inv.currency)}</TableCell>
              <TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell>
              <TableCell><Badge variant={mc.variant} className="text-xs">{mc.label}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {(inv.status === 'received' || inv.status === 'matched') && (
                    <Button size="sm" variant="outline" onClick={() => onApprove(inv.id)}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                    </Button>
                  )}
                  {inv.status !== 'paid' && inv.status !== 'disputed' && (
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => onDispute(inv.id)}>
                      <XCircle className="h-3 w-3 mr-1" />Dispute
                    </Button>
                  )}
                  {inv.threeWayMatchStatus === 'pending' && (
                    <Button size="sm" variant="secondary" onClick={() => onMatch(inv.id)}>
                      Match
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ── Aging Report Tab ──────────────────────────────────────────────────────────

function AgingReportTab() {
  const [aging, setAging]     = useState<AgingReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apRequest<{ agingReport: AgingReport }>('/aging-report')
      .then(d => setAging(d.agingReport))
      .catch(() => toast.error('Failed to load aging report'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!aging)  return <p className="text-muted-foreground py-8 text-center">No aging data available</p>;

  const buckets: { label: string; key: keyof AgingReport; color: string }[] = [
    { label: 'Current',      key: 'current', color: 'text-green-600' },
    { label: '1–30 days',    key: 'days30',  color: 'text-amber-500' },
    { label: '31–60 days',   key: 'days60',  color: 'text-orange-500' },
    { label: '61–90 days',   key: 'days90',  color: 'text-red-500' },
    { label: 'Over 90 days', key: 'over90',  color: 'text-destructive font-bold' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {buckets.map(b => (
        <Card key={b.key}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">{b.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${b.color}`}>{fmt(aging[b.key].amount)}</div>
            <div className="text-xs text-muted-foreground mt-1">{aging[b.key].count} invoice{aging[b.key].count !== 1 ? 's' : ''}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Payment Runs Tab ──────────────────────────────────────────────────────────

function PaymentRunsTab({ onRunComplete }: { onRunComplete: () => void }) {
  const [dueBy, setDueBy]     = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult]   = useState<{ processedCount: number; totalAmount: number; paymentRunRef: string } | null>(null);

  const handleRun = async () => {
    if (!dueBy) return toast.error('Please select a due-by date');
    setRunning(true);
    try {
      const data = await apRequest<{ processedCount: number; totalAmount: number; paymentRunRef: string }>(
        '/payment-runs', 'POST', { dueBy }
      );
      setResult(data);
      toast.success(`Payment run complete: ${data.processedCount} invoices processed`);
      onRunComplete();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Payment run failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="dueBy">Pay all approved invoices due by</Label>
            <Input id="dueBy" type="date" value={dueBy} onChange={e => setDueBy(e.target.value)} />
          </div>
          <Button onClick={handleRun} disabled={running || !dueBy}>
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Run Payment Batch
          </Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Last Run Result</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>Reference: <span className="font-mono font-medium">{result.paymentRunRef}</span></div>
            <div>Processed: <span className="font-medium">{result.processedCount} invoices</span></div>
            <div>Total Paid: <span className="font-medium">{fmt(result.totalAmount)}</span></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Dispute Dialog ────────────────────────────────────────────────────────────

function DisputeDialog({
  open, onOpenChange, onConfirm,
}: { open: boolean; onOpenChange: (v: boolean) => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Dispute Invoice</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Reason for dispute</Label>
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe the issue…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onConfirm(reason); setReason(''); }}>Confirm Dispute</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountsPayable() {
  const [invoices, setInvoices]       = useState<APInvoice[]>([]);
  const [loading, setLoading]         = useState(true);
  const [disputeId, setDisputeId]     = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      const data = await apRequest<{ invoices: APInvoice[] }>('/invoices');
      setInvoices(data.invoices ?? []);
    } catch {
      toast.error('Could not load AP invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const handleApprove = async (id: string) => {
    try {
      await apRequest(`/invoices/${id}/approve`, 'PUT');
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'approved' } : inv));
      toast.success('Invoice approved');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve invoice');
    }
  };

  const handleDispute = async (reason: string) => {
    if (!disputeId) return;
    try {
      await apRequest(`/invoices/${disputeId}/dispute`, 'PUT', { reason });
      setInvoices(prev => prev.map(inv => inv.id === disputeId ? { ...inv, status: 'disputed' } : inv));
      toast.success('Invoice disputed');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to dispute invoice');
    } finally {
      setDisputeId(null);
    }
  };

  const handleMatch = async (id: string) => {
    try {
      const data = await apRequest<{ matchStatus: string; variance?: number; variancePct?: number; reason?: string }>(
        `/invoices/${id}/match`, 'POST'
      );
      if (data.matchStatus === 'matched') {
        setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, threeWayMatchStatus: 'matched', status: 'matched' } : inv));
        toast.success('3-way match successful');
      } else {
        setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, threeWayMatchStatus: 'exception' } : inv));
        toast.error(`Match exception: ${data.reason ?? `Variance ${data.variancePct?.toFixed(1)}%`}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Match failed');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Accounts Payable</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage supplier invoices, 3-way matching, and payment runs.</p>
        </div>
        <Button size="sm" onClick={() => toast.info('Invoice creation via supplier portal')}>
          <Plus className="h-4 w-4 mr-2" />New Invoice
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading invoices…
        </div>
      ) : (
        <>
          <SummaryCards invoices={invoices} />

          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Invoices</TabsTrigger>
              <TabsTrigger value="pending">Pending Approval</TabsTrigger>
              <TabsTrigger value="payment-runs">Payment Runs</TabsTrigger>
              <TabsTrigger value="aging">Aging Report</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <InvoiceTable
                invoices={invoices}
                onApprove={handleApprove}
                onDispute={id => setDisputeId(id)}
                onMatch={handleMatch}
              />
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              <InvoiceTable
                invoices={invoices}
                filter={inv => inv.status === 'received' || inv.status === 'matched'}
                onApprove={handleApprove}
                onDispute={id => setDisputeId(id)}
                onMatch={handleMatch}
              />
            </TabsContent>

            <TabsContent value="payment-runs" className="mt-4">
              <PaymentRunsTab onRunComplete={fetchInvoices} />
            </TabsContent>

            <TabsContent value="aging" className="mt-4">
              <AgingReportTab />
            </TabsContent>
          </Tabs>
        </>
      )}

      <DisputeDialog
        open={!!disputeId}
        onOpenChange={open => { if (!open) setDisputeId(null); }}
        onConfirm={handleDispute}
      />
    </div>
  );
}
