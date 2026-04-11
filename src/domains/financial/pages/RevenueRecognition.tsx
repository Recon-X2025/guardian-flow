import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, FileText, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "@/integrations/api/client";
import { toast } from "@/components/ui/sonner";

interface PerformanceObligation {
  id: string;
  description: string;
  ssp: number;
  allocatedAmount: number;
  status: 'open' | 'satisfied';
}

interface RevenueContract {
  id: string;
  customerId: string;
  contractNo: string;
  transactionPrice: number;
  currency: string;
  performanceObligations: PerformanceObligation[];
  status: string;
}

interface WaterfallPeriod {
  period: string;
  amount: number;
  cumulativeAmount: number;
  recognized: boolean;
}

async function revRequest<T>(endpoint: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await apiClient.request<T>(`/api/rev-rec${endpoint}`, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

function fmt(n: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n); }

function WaterfallDialog({ contractId, open, onOpenChange }: { contractId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [periods, setPeriods] = useState<WaterfallPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    revRequest<{ periods: WaterfallPeriod[] }>(`/asc606/contracts/${contractId}/waterfall`)
      .then(d => setPeriods(d.periods))
      .catch(() => toast.error('Failed to load waterfall'))
      .finally(() => setLoading(false));
  }, [open, contractId]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Revenue Waterfall</DialogTitle></DialogHeader>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Cumulative</TableHead><TableHead>Recognized</TableHead></TableRow></TableHeader>
            <TableBody>
              {periods.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No schedule entries yet</TableCell></TableRow>}
              {periods.map(p => (
                <TableRow key={p.period}>
                  <TableCell className="font-mono">{p.period}</TableCell>
                  <TableCell className="text-right">{fmt(p.amount)}</TableCell>
                  <TableCell className="text-right">{fmt(p.cumulativeAmount)}</TableCell>
                  <TableCell><Badge variant={p.recognized ? 'default' : 'secondary'}>{p.recognized ? 'Yes' : 'No'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecognizeDialog({ contract, open, onOpenChange, onDone }: { contract: RevenueContract; open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const openObs = contract.performanceObligations.filter(o => o.status === 'open');

  const handleRecognize = async () => {
    if (!period) return toast.error('Enter a period (YYYY-MM)');
    setLoading(true);
    try {
      await revRequest(`/asc606/contracts/${contract.id}/recognize`, 'POST', { period, obligationIds: openObs.map(o => o.id) });
      toast.success('Revenue recognized');
      onDone();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to recognize');
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Recognize Revenue — {contract.contractNo}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Period (YYYY-MM)</Label><Input value={period} onChange={e => setPeriod(e.target.value)} placeholder="2025-01" /></div>
          <p className="text-sm text-muted-foreground">{openObs.length} open obligation(s) will be satisfied.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleRecognize} disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Recognize</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RevenueRecognition() {
  const [contracts, setContracts] = useState<RevenueContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("contracts");
  const [recognizeContract, setRecognizeContract] = useState<RevenueContract | null>(null);
  const [waterfallContract, setWaterfallContract] = useState<RevenueContract | null>(null);

  const fetchContracts = async () => {
    try {
      const data = await revRequest<{ contracts: RevenueContract[] }>('/asc606/contracts');
      setContracts(data.contracts ?? []);
    } catch { toast.error('Failed to load contracts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchContracts(); }, []);

  const totalRecognized = contracts.reduce((s, c) =>
    s + c.performanceObligations.filter(o => o.status === 'satisfied').reduce((ps, o) => ps + o.allocatedAmount, 0), 0);
  const totalDeferred = contracts.reduce((s, c) =>
    s + c.performanceObligations.filter(o => o.status === 'open').reduce((ps, o) => ps + o.allocatedAmount, 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Recognition</h1>
          <p className="text-muted-foreground">ASC 606 / IFRS 15 compliant revenue recognition</p>
        </div>
        <Button size="sm"><FileText className="h-4 w-4 mr-2" />New Contract</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" />Recognized Revenue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{fmt(totalRecognized)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" />Deferred Revenue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{fmt(totalDeferred)}</div></CardContent></Card>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>
        <TabsContent value="contracts" className="space-y-3 mt-4">
          {loading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>}
          {!loading && contracts.length === 0 && <p className="text-center text-muted-foreground py-12">No revenue contracts found.</p>}
          {contracts.map(c => {
            const recognized = c.performanceObligations.filter(o => o.status === 'satisfied').reduce((s, o) => s + o.allocatedAmount, 0);
            const pct = c.transactionPrice > 0 ? Math.round((recognized / c.transactionPrice) * 100) : 0;
            return (
              <Card key={c.id}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{c.contractNo}</p>
                      <p className="text-xs text-muted-foreground">{c.customerId} · {fmt(c.transactionPrice)} total · <Badge variant={c.status === 'completed' ? 'default' : 'secondary'} className="text-xs">{c.status}</Badge></p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setWaterfallContract(c)}>Waterfall</Button>
                      <Button variant="outline" size="sm" onClick={() => setRecognizeContract(c)}><TrendingUp className="h-3 w-3 mr-1" />Recognize</Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs"><span>Recognized</span><span>{pct}%</span></div>
                    <Progress value={pct} />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {c.performanceObligations.map(o => (
                      <Badge key={o.id} variant={o.status === 'satisfied' ? 'default' : 'secondary'} className="text-xs">
                        {o.description} {fmt(o.allocatedAmount)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
        <TabsContent value="schedule" className="mt-4">
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Select a contract and click Waterfall to view its period-by-period schedule.</p></CardContent></Card>
        </TabsContent>
      </Tabs>

      {recognizeContract && (
        <RecognizeDialog
          contract={recognizeContract}
          open={!!recognizeContract}
          onOpenChange={open => { if (!open) setRecognizeContract(null); }}
          onDone={fetchContracts}
        />
      )}
      {waterfallContract && (
        <WaterfallDialog
          contractId={waterfallContract.id}
          open={!!waterfallContract}
          onOpenChange={open => { if (!open) setWaterfallContract(null); }}
        />
      )}
    </div>
  );
}
