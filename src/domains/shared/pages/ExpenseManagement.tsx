import { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2, XCircle, Plus, Loader2, AlertCircle, DollarSign, Clock, Banknote,
} from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { toast } from '@/components/ui/sonner';
import { useRBAC } from '@/domains/auth/contexts/RBACContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
type ExpenseCategory = 'mileage' | 'meals' | 'accommodation' | 'tools' | 'other';

interface LineItem {
  date: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  policyStatus?: 'within_policy' | 'flagged';
}

interface ExpenseClaim {
  id: string;
  claimRef: string;
  period: string;
  status: ExpenseStatus;
  totalAmount: number;
  currency: string;
  lineItems: LineItem[];
  employeeId: string;
  createdAt: string;
}

interface Policy {
  category: string;
  dailyLimit: number;
  currency: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ExpenseStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft:     { label: 'Draft',     variant: 'secondary'   },
  submitted: { label: 'Submitted', variant: 'outline'     },
  approved:  { label: 'Approved',  variant: 'default'     },
  rejected:  { label: 'Rejected',  variant: 'destructive' },
  paid:      { label: 'Paid',      variant: 'default'     },
};

const CATEGORIES: ExpenseCategory[] = ['mileage', 'meals', 'accommodation', 'tools', 'other'];

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
}

async function expReq<T>(endpoint: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await apiClient.request<T>(`/api/expenses${endpoint}`, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ claims }: { claims: ExpenseClaim[] }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthClaims  = claims.filter(c => c.period === thisMonth);
  const totalClaimed = monthClaims.reduce((s, c) => s + c.totalAmount, 0);
  const pending      = claims.filter(c => c.status === 'submitted');
  const approved     = claims.filter(c => c.status === 'approved');
  const paid         = claims.filter(c => c.status === 'paid');

  const cards = [
    { title: 'Total Claimed This Month', value: fmt(totalClaimed), icon: <DollarSign className="h-4 w-4 text-muted-foreground" /> },
    { title: 'Pending Approval',         value: String(pending.length), icon: <Clock className="h-4 w-4 text-amber-500" /> },
    { title: 'Approved',                  value: fmt(approved.reduce((s, c) => s + c.totalAmount, 0)), icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
    { title: 'Paid',                      value: fmt(paid.reduce((s, c) => s + c.totalAmount, 0)), icon: <Banknote className="h-4 w-4 text-primary" /> },
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

// ── Claims Table ──────────────────────────────────────────────────────────────

function ClaimsTable({
  claims, onApprove, onReject,
  showActions = false,
}: {
  claims: ExpenseClaim[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  showActions?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ref</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Items</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {claims.length === 0 && (
          <TableRow>
            <TableCell colSpan={showActions ? 6 : 5} className="text-center text-muted-foreground py-8">
              No claims found
            </TableCell>
          </TableRow>
        )}
        {claims.map(c => {
          const sc = STATUS_CFG[c.status] ?? STATUS_CFG.draft;
          return (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-sm">{c.claimRef}</TableCell>
              <TableCell>{c.period}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{c.lineItems?.length ?? 0} item(s)</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(c.totalAmount, c.currency)}</TableCell>
              <TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell>
              {showActions && (
                <TableCell>
                  {c.status === 'submitted' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => onApprove?.(c.id)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => onReject?.(c.id)}>
                        <XCircle className="h-3 w-3 mr-1" />Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ── New Claim Modal ───────────────────────────────────────────────────────────

interface NewClaimDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  policies: Policy[];
  onCreated: () => void;
}

function NewClaimDialog({ open, onOpenChange, policies, onCreated }: NewClaimDialogProps) {
  const [period, setPeriod]       = useState(new Date().toISOString().slice(0, 7));
  const [items, setItems]         = useState<LineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [newItem, setNewItem]     = useState<Partial<LineItem>>({ category: 'meals', date: new Date().toISOString().slice(0, 10) });

  const policyLimit = (cat: string) => policies.find(p => p.category === cat)?.dailyLimit ?? null;

  const policyIndicator = (item: Partial<LineItem>) => {
    if (!item.amount || !item.category) return null;
    const limit = policyLimit(item.category);
    if (limit === null) return null;
    return Number(item.amount) <= limit
      ? <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Within policy (limit: {fmt(limit)})</span>
      : <span className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Exceeds policy limit of {fmt(limit)}</span>;
  };

  const addItem = () => {
    if (!newItem.category || !newItem.amount || !newItem.date) return;
    const limit = policyLimit(newItem.category);
    const policyStatus: LineItem['policyStatus'] = (limit !== null && Number(newItem.amount) > limit)
      ? 'flagged'
      : 'within_policy';
    setItems(prev => [...prev, { ...(newItem as LineItem), policyStatus }]);
    setNewItem({ category: 'meals', date: new Date().toISOString().slice(0, 10) });
  };

  const handleSubmit = async () => {
    if (items.length === 0) return toast.error('Add at least one line item');
    setSubmitting(true);
    try {
      const created = await expReq<{ claim: { id: string } }>('', 'POST', { period, lineItems: items });
      await expReq(`/${created.claim.id}/submit`, 'PUT');
      toast.success('Claim submitted successfully');
      setItems([]);
      onOpenChange(false);
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  const total = items.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New Expense Claim</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1 max-w-xs">
            <Label>Period (YYYY-MM)</Label>
            <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} />
          </div>

          {/* Add line item */}
          <div className="border rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">Add Line Item</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={newItem.category} onValueChange={v => setNewItem(p => ({ ...p, category: v as ExpenseCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={newItem.date ?? ''} onChange={e => setNewItem(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Amount (USD)</Label>
                <Input type="number" step="0.01" value={newItem.amount ?? ''} onChange={e => setNewItem(p => ({ ...p, amount: parseFloat(e.target.value) }))} />
                {policyIndicator(newItem)}
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input value={newItem.description ?? ''} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={addItem} disabled={!newItem.amount || !newItem.date}>
              <Plus className="h-3 w-3 mr-1" />Add Item
            </Button>
          </div>

          {/* Line items list */}
          {items.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Items ({items.length})</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Policy</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{it.date}</TableCell>
                      <TableCell className="capitalize text-sm">{it.category}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{fmt(Number(it.amount))}</TableCell>
                      <TableCell>
                        {it.policyStatus === 'flagged'
                          ? <span className="text-xs text-amber-600">⚠ Exceeds policy</span>
                          : <span className="text-xs text-green-600">✓ OK</span>}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setItems(p => p.filter((_, j) => j !== i))}>
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-sm font-semibold text-right">Total: {fmt(total)}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || items.length === 0}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit Claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExpenseManagement() {
  const [claims, setClaims]         = useState<ExpenseClaim[]>([]);
  const [policies, setPolicies]     = useState<Policy[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showNew, setShowNew]       = useState(false);
  const { user }                    = useRBAC();

  const isManager = (() => {
    const roles = (user as { roles?: string[]; role?: string } | null);
    const roleArr = Array.isArray(roles?.roles) ? roles!.roles : (roles?.role ? [roles!.role] : []);
    return roleArr.some(r => ['sys_admin','tenant_admin','finance_manager','manager'].includes(r));
  })();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [claimsData, policiesData] = await Promise.all([
        expReq<{ claims: ExpenseClaim[] }>(''),
        expReq<{ policies: Policy[] }>('/policies'),
      ]);
      setClaims(claimsData.claims ?? []);
      setPolicies(policiesData.policies ?? []);
    } catch {
      toast.error('Failed to load expense data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    try {
      await expReq(`/${id}/approve`, 'PUT');
      setClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' as ExpenseStatus } : c));
      toast.success('Claim approved');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve claim');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await expReq(`/${id}/reject`, 'PUT', { reason: 'Rejected by manager' });
      setClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' as ExpenseStatus } : c));
      toast.success('Claim rejected');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject claim');
    }
  };

  const pendingClaims = claims.filter(c => c.status === 'submitted');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expense Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Submit and manage expense claims.</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" />New Claim
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <>
          <SummaryCards claims={claims} />

          <Tabs defaultValue="my-claims">
            <TabsList>
              <TabsTrigger value="my-claims">My Claims</TabsTrigger>
              {isManager && (
                <TabsTrigger value="pending">
                  Pending Approval
                  {pendingClaims.length > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs px-1 py-0 leading-tight">
                      {pendingClaims.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="my-claims" className="mt-4">
              <ClaimsTable claims={claims} />
            </TabsContent>

            {isManager && (
              <TabsContent value="pending" className="mt-4">
                <ClaimsTable
                  claims={pendingClaims}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  showActions
                />
              </TabsContent>
            )}
          </Tabs>
        </>
      )}

      <NewClaimDialog
        open={showNew}
        onOpenChange={setShowNew}
        policies={policies}
        onCreated={load}
      />
    </div>
  );
}
