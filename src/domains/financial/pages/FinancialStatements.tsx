import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

function PnLTab() {
  const today = new Date().toISOString().split('T')[0];
  const firstOfYear = today.slice(0, 4) + '-01-01';
  const [from, setFrom] = useState(firstOfYear);
  const [to, setTo] = useState(today);
  const [enabled, setEnabled] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pnl', from, to],
    queryFn: async () => {
      const res = await fetch(`/api/ledger/pnl?from=${from}&to=${to}`, { headers: authHeader() });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        <Button onClick={() => { setEnabled(true); refetch(); }}>Fetch</Button>
      </div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{fmt(data.revenue_total)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Expenses</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{fmt(data.expense_total)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Net Income</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${data.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(data.net_income)}</p></CardContent></Card>
        </div>
      )}
    </div>
  );
}

function BalanceSheetTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['balance-sheet'],
    queryFn: async () => {
      const res = await fetch('/api/ledger/balance-sheet', { headers: authHeader() });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Assets</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{fmt(data.total_assets)}</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Liabilities</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{fmt(data.total_liabilities)}</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Equity</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-blue-600">{fmt(data.equity)}</p></CardContent></Card>
    </div>
  );
}

function CashFlowTab() {
  const today = new Date().toISOString().split('T')[0];
  const firstOfYear = today.slice(0, 4) + '-01-01';
  const [from, setFrom] = useState(firstOfYear);
  const [to, setTo] = useState(today);
  const [enabled, setEnabled] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cash-flow', from, to],
    queryFn: async () => {
      const res = await fetch(`/api/ledger/cash-flow?from=${from}&to=${to}`, { headers: authHeader() });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        <Button onClick={() => { setEnabled(true); refetch(); }}>Fetch</Button>
      </div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Net Income</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{fmt(data.net_income)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Operating Activities</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{fmt(data.operating_activities)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Cash Flow</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${(data.total_cash_flow ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(data.total_cash_flow)}</p></CardContent></Card>
        </div>
      )}
    </div>
  );
}

export default function FinancialStatements() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Financial Statements</h1>
      <Tabs defaultValue="pnl">
        <TabsList>
          <TabsTrigger value="pnl">P&amp;L</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
        </TabsList>
        <TabsContent value="pnl" className="mt-4"><PnLTab /></TabsContent>
        <TabsContent value="balance-sheet" className="mt-4"><BalanceSheetTab /></TabsContent>
        <TabsContent value="cash-flow" className="mt-4"><CashFlowTab /></TabsContent>
      </Tabs>
    </div>
  );
}
