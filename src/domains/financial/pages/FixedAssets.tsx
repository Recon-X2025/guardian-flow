import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Play, TrendingDown, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { toast } from '@/components/ui/sonner';

type DepMethod = 'straight_line' | 'declining_balance' | 'units_of_production';
type AssetStatus = 'active' | 'disposed' | 'fully_depreciated';
type AssetClass = 'land' | 'building' | 'machinery' | 'vehicles' | 'furniture' | 'intangible';

interface FixedAsset {
  id: string;
  assetName: string;
  assetClass: AssetClass;
  acquisitionDate: string;
  acquisitionCost: number;
  depreciationMethod: DepMethod;
  usefulLifeMonths: number;
  residualValue: number;
  bookValue: number;
  accumulatedDepreciation: number;
  assetStatus: AssetStatus;
  disposalDate?: string;
  disposalProceeds?: number;
}

interface DepEntry { period: string; amount: number; bookValueAfter: number; }

const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusColor: Record<AssetStatus, string> = {
  active: 'bg-green-100 text-green-800',
  disposed: 'bg-gray-100 text-gray-600',
  fully_depreciated: 'bg-yellow-100 text-yellow-800',
};

export default function FixedAssets() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [depPeriod, setDepPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [depRunning, setDepRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<Record<string, DepEntry[]>>({});
  const [form, setForm] = useState({
    assetName: '', assetClass: 'machinery' as AssetClass,
    acquisitionDate: '', acquisitionCost: '', depreciationMethod: 'straight_line' as DepMethod,
    usefulLifeMonths: '60', residualValue: '0',
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/finance/fixed-assets');
      setAssets(data.assets ?? data ?? []);
    } catch {
      toast.error('Failed to load fixed assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalBookValue = assets.filter(a => a.assetStatus === 'active').reduce((s, a) => s + a.bookValue, 0);
  const fullyDepreciated = assets.filter(a => a.assetStatus === 'fully_depreciated').length;

  const runDepreciation = async () => {
    setDepRunning(true);
    try {
      const res = await apiClient.post('/finance/fixed-assets/depreciation-run', { period: depPeriod });
      toast.success(`Depreciation run complete — ${res.assetsProcessed} assets, ${fmt(res.totalDepreciation)} total`);
      load();
    } catch {
      toast.error('Depreciation run failed');
    } finally {
      setDepRunning(false);
    }
  };

  const addAsset = async () => {
    try {
      await apiClient.post('/finance/fixed-assets', {
        ...form,
        acquisitionCost: parseFloat(form.acquisitionCost),
        usefulLifeMonths: parseInt(form.usefulLifeMonths),
        residualValue: parseFloat(form.residualValue),
      });
      toast.success('Asset added');
      setShowAdd(false);
      setForm({ assetName: '', assetClass: 'machinery', acquisitionDate: '', acquisitionCost: '', depreciationMethod: 'straight_line', usefulLifeMonths: '60', residualValue: '0' });
      load();
    } catch {
      toast.error('Failed to add asset');
    }
  };

  const toggleSchedule = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!scheduleData[id]) {
      try {
        const res = await apiClient.get(`/finance/fixed-assets/${id}/depreciation-schedule`);
        setScheduleData(p => ({ ...p, [id]: res.schedule ?? [] }));
      } catch { /* ignore */ }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fixed Assets</h1>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-2" />Add Asset</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Book Value</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{fmt(totalBookValue)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Assets</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{assets.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Fully Depreciated</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{fullyDepreciated}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="assets">
        <TabsList>
          <TabsTrigger value="assets">Asset Register</TabsTrigger>
          <TabsTrigger value="depreciation">Run Depreciation</TabsTrigger>
        </TabsList>

        <TabsContent value="assets">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead><TableHead>Class</TableHead><TableHead>Acquisition Cost</TableHead>
                  <TableHead>Book Value</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map(a => (
                  <>
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.assetName}</TableCell>
                      <TableCell className="capitalize">{a.assetClass}</TableCell>
                      <TableCell>{fmt(a.acquisitionCost)}</TableCell>
                      <TableCell>{fmt(a.bookValue)}</TableCell>
                      <TableCell className="capitalize">{a.depreciationMethod.replace('_', ' ')}</TableCell>
                      <TableCell><Badge className={statusColor[a.assetStatus]}>{a.assetStatus.replace('_', ' ')}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => toggleSchedule(a.id)}>
                          {expandedId === a.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedId === a.id && (
                      <TableRow key={`${a.id}-sched`}>
                        <TableCell colSpan={7} className="bg-muted/30 p-4">
                          <p className="text-sm font-semibold mb-2 flex items-center gap-1"><TrendingDown className="w-4 h-4" /> Depreciation Schedule (next 12 periods)</p>
                          <Table>
                            <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Charge</TableHead><TableHead>Book Value After</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {(scheduleData[a.id] ?? []).slice(0, 12).map((e, i) => (
                                <TableRow key={i}><TableCell>{e.period}</TableCell><TableCell>{fmt(e.amount)}</TableCell><TableCell>{fmt(e.bookValueAfter)}</TableCell></TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="depreciation">
          <Card className="max-w-md">
            <CardHeader><CardTitle>Run Monthly Depreciation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Period (YYYY-MM)</Label>
                <Input type="month" value={depPeriod} onChange={e => setDepPeriod(e.target.value)} />
              </div>
              <Button onClick={runDepreciation} disabled={depRunning}>
                {depRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</> : <><Play className="w-4 h-4 mr-2" />Run Depreciation</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Fixed Asset</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1"><Label>Asset Name</Label><Input value={form.assetName} onChange={e => setForm(p => ({ ...p, assetName: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Class</Label>
              <Select value={form.assetClass} onValueChange={v => setForm(p => ({ ...p, assetClass: v as AssetClass }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['land','building','machinery','vehicles','furniture','intangible'].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Depreciation Method</Label>
              <Select value={form.depreciationMethod} onValueChange={v => setForm(p => ({ ...p, depreciationMethod: v as DepMethod }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight_line">Straight Line</SelectItem>
                  <SelectItem value="declining_balance">Declining Balance</SelectItem>
                  <SelectItem value="units_of_production">Units of Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Acquisition Date</Label><Input type="date" value={form.acquisitionDate} onChange={e => setForm(p => ({ ...p, acquisitionDate: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Acquisition Cost ($)</Label><Input type="number" value={form.acquisitionCost} onChange={e => setForm(p => ({ ...p, acquisitionCost: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Useful Life (months)</Label><Input type="number" value={form.usefulLifeMonths} onChange={e => setForm(p => ({ ...p, usefulLifeMonths: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Residual Value ($)</Label><Input type="number" value={form.residualValue} onChange={e => setForm(p => ({ ...p, residualValue: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addAsset} disabled={!form.assetName || !form.acquisitionCost}>Add Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
