import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, Play } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChartAccount {
  id: string;
  account_code: string;
  name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
}

interface JournalEntryLine {
  id: string;
  account_id: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  description: string;
  reference?: string;
  total_amount: number;
  status: string;
  created_at: string;
  lines: JournalEntryLine[];
}

interface TrialBalanceRow {
  account_id: string;
  account_code: string;
  name: string;
  account_type: string;
  total_debits: number;
  total_credits: number;
}

interface TrialBalance {
  rows: TrialBalanceRow[];
  grand_total_debits: number;
  grand_total_credits: number;
  is_balanced: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_COLOURS: Record<string, string> = {
  asset:     'bg-blue-100 text-blue-800',
  liability: 'bg-red-100 text-red-800',
  equity:    'bg-purple-100 text-purple-800',
  revenue:   'bg-green-100 text-green-800',
  expense:   'bg-orange-100 text-orange-800',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

// ── Chart of Accounts tab ─────────────────────────────────────────────────────

function ChartOfAccountsTab() {
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ledger/accounts')
      .then(r => r.json())
      .then(d => { setAccounts(d.accounts ?? []); setLoading(false); })
      .catch(() => { setError('Failed to load accounts'); setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (error)   return <p className="text-destructive p-4">{error}</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.length === 0 && (
          <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No accounts found</TableCell></TableRow>
        )}
        {accounts.map(acc => (
          <TableRow key={acc.id}>
            <TableCell className="font-mono text-sm">{acc.account_code}</TableCell>
            <TableCell>{acc.name}</TableCell>
            <TableCell>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ACCOUNT_TYPE_COLOURS[acc.account_type] ?? ''}`}>
                {acc.account_type}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">{fmt(acc.balance ?? 0)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── Journal Entries tab ───────────────────────────────────────────────────────

function JournalEntriesTab() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ledger/entries')
      .then(r => r.json())
      .then(d => { setEntries(d.entries ?? []); setLoading(false); })
      .catch(() => { setError('Failed to load journal entries'); setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (error)   return <p className="text-destructive p-4">{error}</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.length === 0 && (
          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No journal entries found</TableCell></TableRow>
        )}
        {entries.map(entry => (
          <TableRow key={entry.id}>
            <TableCell className="text-sm">{new Date(entry.created_at).toLocaleDateString()}</TableCell>
            <TableCell>{entry.description}</TableCell>
            <TableCell className="text-muted-foreground text-sm">{entry.reference ?? '—'}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(entry.total_amount)}</TableCell>
            <TableCell>
              <Badge variant={entry.status === 'posted' ? 'default' : 'secondary'}>
                {entry.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── Trial Balance tab ─────────────────────────────────────────────────────────

function TrialBalanceTab() {
  const [data, setData]     = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ledger/trial-balance')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load trial balance'); setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (error)   return <p className="text-destructive p-4">{error}</p>;
  if (!data)   return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {data.is_balanced
              ? <><CheckCircle2 className="h-4 w-4 text-green-500" /> Ledger is balanced</>
              : <><XCircle className="h-4 w-4 text-destructive" /> Ledger is out of balance</>
            }
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-8 text-sm">
          <div><span className="text-muted-foreground">Total Debits: </span><span className="font-semibold tabular-nums">{fmt(data.grand_total_debits)}</span></div>
          <div><span className="text-muted-foreground">Total Credits: </span><span className="font-semibold tabular-nums">{fmt(data.grand_total_credits)}</span></div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Account Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Debits</TableHead>
            <TableHead className="text-right">Credits</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
          )}
          {data.rows.map(row => (
            <TableRow key={row.account_id}>
              <TableCell className="font-mono text-sm">{row.account_code}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell className="capitalize text-muted-foreground text-sm">{row.account_type}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(row.total_debits)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(row.total_credits)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-semibold border-t-2">
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(data.grand_total_debits)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(data.grand_total_credits)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

// ── Consolidation Tab ─────────────────────────────────────────────────────────

interface ConsolidationResult {
  period: string;
  entityIds: string[];
  revenue: number;
  costs: number;
  pnl: number;
  icEliminations: { from: string; to: string; amount: number; description: string }[];
}

function ConsolidationTab() {
  const [entityInput, setEntityInput] = useState('');
  const [period, setPeriod]           = useState(new Date().toISOString().slice(0, 7));
  const [running, setRunning]         = useState(false);
  const [result, setResult]           = useState<ConsolidationResult | null>(null);

  const handleRun = async () => {
    const entityIds = entityInput.split(',').map(s => s.trim()).filter(Boolean);
    if (entityIds.length === 0) {
      toast.error('Enter at least one entity ID');
      return;
    }
    setRunning(true);
    try {
      const res = await fetch('/api/finance/consolidation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token') ?? ''}` },
        body: JSON.stringify({ period, entityIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Consolidation failed');
      setResult(data);
      toast.success('Consolidation run complete');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Consolidation failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Run Consolidation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="entities">Entity IDs (comma-separated)</Label>
            <Input
              id="entities"
              value={entityInput}
              onChange={e => setEntityInput(e.target.value)}
              placeholder="e.g. ENT-001, ENT-002, ENT-003"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cons-period">Period (YYYY-MM)</Label>
            <Input id="cons-period" type="month" value={period} onChange={e => setPeriod(e.target.value)} />
          </div>
          <Button onClick={handleRun} disabled={running || !entityInput.trim()}>
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Run Consolidation
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Revenue', value: fmt(result.revenue), color: 'text-green-600' },
              { label: 'Costs',   value: fmt(result.costs),   color: 'text-red-600'   },
              { label: 'P&L',     value: fmt(result.pnl),     color: result.pnl >= 0 ? 'text-green-700 font-bold' : 'text-destructive font-bold' },
            ].map(c => (
              <Card key={c.label}>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{c.label}</CardTitle></CardHeader>
                <CardContent><div className={`text-xl font-bold ${c.color}`}>{c.value}</div></CardContent>
              </Card>
            ))}
          </div>

          {result.icEliminations?.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">Intercompany Eliminations</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.icEliminations.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">{e.from}</TableCell>
                      <TableCell className="font-mono text-sm">{e.to}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(e.amount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GeneralLedger() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">General Ledger</h1>
        <p className="text-muted-foreground text-sm mt-1">Chart of accounts, journal entries, and trial balance.</p>
      </div>

      <Tabs defaultValue="chart-of-accounts">
        <TabsList>
          <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="journal-entries">Journal Entries</TabsTrigger>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="consolidation">Consolidation</TabsTrigger>
        </TabsList>

        <TabsContent value="chart-of-accounts" className="mt-4">
          <ChartOfAccountsTab />
        </TabsContent>

        <TabsContent value="journal-entries" className="mt-4">
          <JournalEntriesTab />
        </TabsContent>

        <TabsContent value="trial-balance" className="mt-4">
          <TrialBalanceTab />
        </TabsContent>

        <TabsContent value="consolidation" className="mt-4">
          <ConsolidationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
