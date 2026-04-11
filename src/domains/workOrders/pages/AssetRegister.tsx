import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronRight, ChevronDown, Package, AlertTriangle, Loader2, GitBranch, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface Asset {
  id: string;
  name: string;
  serial_number: string;
  category?: string;
  install_date?: string;
  warranty_expiry?: string;
  status: string;
  parent_id?: string | null;
  children?: Asset[];
}

async function fetchAssets(): Promise<Asset[]> {
  const res = await fetch('/api/assets', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch assets');
  const data = await res.json();
  return data.assets ?? [];
}

function buildTree(assets: Asset[]): Asset[] {
  const map = new Map<string, Asset>(assets.map(a => [a.id, { ...a, children: [] }]));
  const roots: Asset[] = [];
  for (const asset of map.values()) {
    if (asset.parent_id && map.has(asset.parent_id)) {
      map.get(asset.parent_id)!.children!.push(asset);
    } else {
      roots.push(asset);
    }
  }
  return roots;
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'active')   return 'default';
  if (status === 'inactive') return 'secondary';
  if (status === 'retired')  return 'destructive';
  return 'outline';
}

interface AssetRowProps {
  asset: Asset;
  depth: number;
  onSelect: (asset: Asset) => void;
  selected: string | null;
}

function AssetRow({ asset, depth, onSelect, selected }: AssetRowProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (asset.children?.length ?? 0) > 0;

  return (
    <>
      <TableRow
        className={`cursor-pointer hover:bg-muted/50 ${selected === asset.id ? 'bg-muted' : ''}`}
        onClick={() => onSelect(asset)}
      >
        <TableCell>
          <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <button
                onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                className="p-0.5 rounded hover:bg-accent"
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{asset.name}</span>
          </div>
        </TableCell>
        <TableCell className="font-mono text-sm">{asset.serial_number}</TableCell>
        <TableCell>{asset.category ?? '—'}</TableCell>
        <TableCell>{asset.install_date ? new Date(asset.install_date).toLocaleDateString() : '—'}</TableCell>
        <TableCell>{asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString() : '—'}</TableCell>
        <TableCell>
          <Badge variant={statusVariant(asset.status)}>{asset.status}</Badge>
        </TableCell>
      </TableRow>
      {expanded && hasChildren && asset.children!.map(child => (
        <AssetRow key={child.id} asset={child} depth={depth + 1} onSelect={onSelect} selected={selected} />
      ))}
    </>
  );
}

interface DetailPanelProps {
  asset: Asset | null;
  onClose: () => void;
}

function DetailPanel({ asset, onClose }: DetailPanelProps) {
  if (!asset) return null;
  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-background border-l shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-lg">{asset.name}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        <div>
          <p className="text-xs text-muted-foreground">Serial Number</p>
          <p className="font-mono text-sm">{asset.serial_number}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Category</p>
          <p>{asset.category ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Install Date</p>
          <p>{asset.install_date ? new Date(asset.install_date).toLocaleDateString() : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Warranty Expiry</p>
          <p>{asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString() : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge variant={statusVariant(asset.status)}>{asset.status}</Badge>
        </div>
        {asset.parent_id && (
          <div>
            <p className="text-xs text-muted-foreground">Parent Asset ID</p>
            <p className="font-mono text-xs">{asset.parent_id}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface GraphData {
  asset: Asset;
  ancestors: Asset[];
  descendants: Array<Asset & { _depth: number }>;
  impactScore: number;
}

interface ComplianceCert {
  id: string;
  certType: string;
  issuer: string;
  issuedDate?: string;
  expiryDate: string;
  documentUrl?: string;
  status: 'valid' | 'expiring_soon' | 'expired';
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchGraph(assetId: string): Promise<GraphData> {
  const res = await fetch(`/api/assets/${assetId}/graph`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch asset graph');
  return res.json();
}

async function fetchCerts(assetId: string): Promise<ComplianceCert[]> {
  const res = await fetch(`/api/assets/${assetId}/compliance-certs`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch compliance certs');
  const data = await res.json();
  return data.certs ?? [];
}

// ── Dependencies Tab ──────────────────────────────────────────────────────────

const DEPENDENCY_TYPES = ['hosts', 'powers', 'connects_to', 'contains'] as const;

function DependenciesTab({ assetId }: { assetId: string }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [depType, setDepType] = useState<string>('');
  const [relatedId, setRelatedId] = useState('');

  const { data: graph, isLoading, error } = useQuery({
    queryKey: ['asset-graph', assetId],
    queryFn: () => fetchGraph(assetId),
    enabled: !!assetId,
  });

  const { data: allAssets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });

  const addDep = useMutation({
    mutationFn: async ({ dependencyType, relatedAssetId }: { dependencyType: string; relatedAssetId: string }) => {
      const res = await fetch(`/api/assets/${assetId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dependencyType, relatedAssetId }),
      });
      if (!res.ok) throw new Error('Failed to add dependency');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-graph', assetId] });
      setAddOpen(false);
      setRelatedId('');
      setDepType('');
      setSearchTerm('');
    },
  });

  const removeDep = useMutation({
    mutationFn: async (relId: string) => {
      const res = await fetch(`/api/assets/${assetId}/dependencies/${relId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to remove dependency');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asset-graph', assetId] }),
  });

  const filteredAssets = allAssets.filter(a =>
    a.id !== assetId &&
    a.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (isLoading) return <div className="flex items-center gap-2 p-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading graph…</div>;
  if (error)     return <div className="flex items-center gap-2 p-4 text-destructive"><AlertTriangle className="h-4 w-4" /> Failed to load dependency graph.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          <span className="font-semibold">Dependency Graph</span>
          {graph && (
            <Badge variant="outline">Impact score: {graph.impactScore}</Badge>
          )}
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Dependency</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Dependency</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Search Asset</Label>
                <Input
                  placeholder="Search by asset name…"
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setRelatedId(''); }}
                />
                {searchTerm && filteredAssets.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {filteredAssets.map(a => (
                      <button
                        key={a.id}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${relatedId === a.id ? 'bg-muted font-medium' : ''}`}
                        onClick={() => { setRelatedId(a.id); setSearchTerm(a.name); }}
                      >
                        {a.name} <span className="text-muted-foreground text-xs">({a.serial_number})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Dependency Type</Label>
                <Select value={depType} onValueChange={setDepType}>
                  <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                  <SelectContent>
                    {DEPENDENCY_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                disabled={!relatedId || !depType || addDep.isPending}
                onClick={() => addDep.mutate({ dependencyType: depType, relatedAssetId: relatedId })}
              >
                {addDep.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {graph && (
        <div className="space-y-3">
          {/* Ancestors */}
          {graph.ancestors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Parent Chain</p>
              {graph.ancestors.map((a, idx) => (
                <div key={a.id} className="flex items-center gap-2 py-1" style={{ paddingLeft: `${idx * 16}px` }}>
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{a.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{a.serial_number}</span>
                </div>
              ))}
            </div>
          )}

          {/* Current asset */}
          <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-muted/50">
            <Package className="h-4 w-4" />
            <span className="font-medium text-sm">{graph.asset.name}</span>
            <Badge variant="secondary" className="text-xs">current</Badge>
          </div>

          {/* Descendants */}
          {graph.descendants.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Dependencies ({graph.descendants.length})</p>
              {graph.descendants.map(d => (
                <div
                  key={d.id}
                  className="flex items-center justify-between py-1.5 border-b last:border-0"
                  style={{ paddingLeft: `${(d._depth) * 20}px` }}
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{d.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{d.serial_number}</span>
                    {d.dependency_type && (
                      <Badge variant="outline" className="text-xs">{d.dependency_type.replace('_', ' ')}</Badge>
                    )}
                  </div>
                  {d._depth === 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      disabled={removeDep.isPending}
                      onClick={() => removeDep.mutate(d.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No dependencies defined.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Compliance Certs Tab ──────────────────────────────────────────────────────

const CERT_TYPES = ['calibration', 'safety', 'insurance', 'warranty'] as const;

function certStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'valid')         return 'default';
  if (status === 'expiring_soon') return 'secondary';
  if (status === 'expired')       return 'destructive';
  return 'outline';
}

function certStatusLabel(status: string) {
  if (status === 'valid')         return 'Valid';
  if (status === 'expiring_soon') return 'Expiring Soon';
  if (status === 'expired')       return 'Expired';
  return status;
}

function expiryCountdown(expiryDate: string) {
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days > 0) return `Expires in ${days} day${days === 1 ? '' : 's'}`;
  return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
}

function ComplianceTab({ assetId }: { assetId: string }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ certType: '', issuer: '', issuedDate: '', expiryDate: '', documentUrl: '' });

  const { data: certs = [], isLoading, error } = useQuery({
    queryKey: ['compliance-certs', assetId],
    queryFn: () => fetchCerts(assetId),
    enabled: !!assetId,
  });

  const addCert = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await fetch(`/api/assets/${assetId}/compliance-certs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to add certificate');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-certs', assetId] });
      setAddOpen(false);
      setForm({ certType: '', issuer: '', issuedDate: '', expiryDate: '', documentUrl: '' });
    },
  });

  const deleteCert = useMutation({
    mutationFn: async (certId: string) => {
      const res = await fetch(`/api/assets/compliance-certs/${certId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete certificate');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance-certs', assetId] }),
  });

  if (isLoading) return <div className="flex items-center gap-2 p-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading certificates…</div>;
  if (error)     return <div className="flex items-center gap-2 p-4 text-destructive"><AlertTriangle className="h-4 w-4" /> Failed to load compliance certificates.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          <span className="font-semibold">Compliance Certificates</span>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Certificate</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Compliance Certificate</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label>Certificate Type</Label>
                <Select value={form.certType} onValueChange={v => setForm(f => ({ ...f, certType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                  <SelectContent>
                    {CERT_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Issuer</Label>
                <Input value={form.issuer} onChange={e => setForm(f => ({ ...f, issuer: e.target.value }))} placeholder="e.g. Bureau Veritas" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Issued Date</Label>
                  <Input type="date" value={form.issuedDate} onChange={e => setForm(f => ({ ...f, issuedDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Document URL</Label>
                <Input value={form.documentUrl} onChange={e => setForm(f => ({ ...f, documentUrl: e.target.value }))} placeholder="https://…" />
              </div>
              <Button
                className="w-full"
                disabled={!form.certType || !form.issuer || !form.expiryDate || addCert.isPending}
                onClick={() => addCert.mutate(form)}
              >
                {addCert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Certificate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {certs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No compliance certificates found.</p>
      ) : (
        <div className="space-y-2">
          {certs.map(cert => (
            <div key={cert.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="capitalize">{cert.certType}</Badge>
                  <Badge variant={certStatusVariant(cert.status)}>{certStatusLabel(cert.status)}</Badge>
                </div>
                <p className="text-sm font-medium">{cert.issuer}</p>
                <p className="text-xs text-muted-foreground">
                  Expiry: {new Date(cert.expiryDate).toLocaleDateString()} — {expiryCountdown(cert.expiryDate)}
                </p>
                {cert.documentUrl && (
                  <a href={cert.documentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                    View document
                  </a>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-destructive hover:text-destructive shrink-0"
                disabled={deleteCert.isPending}
                onClick={() => deleteCert.mutate(cert.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AssetRegister() {
  const [selected, setSelected] = useState<Asset | null>(null);
  const [activeTab, setActiveTab] = useState('assets');

  const { data: assets = [], isLoading, error } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });

  const tree = buildTree(assets);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Register</h1>
          <p className="text-muted-foreground">Install base with parent-child hierarchy</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets"><Package className="h-4 w-4 mr-1.5" />Assets</TabsTrigger>
          <TabsTrigger value="dependencies" disabled={!selected}><GitBranch className="h-4 w-4 mr-1.5" />Dependencies</TabsTrigger>
          <TabsTrigger value="compliance" disabled={!selected}><ShieldCheck className="h-4 w-4 mr-1.5" />Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="assets">
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading assets…
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Failed to load assets.
            </div>
          )}

          {!isLoading && !error && (
            <>
              {selected && (
                <p className="text-sm text-muted-foreground mb-2">
                  Selected: <span className="font-medium text-foreground">{selected.name}</span> — switch to the Dependencies or Compliance tab to manage.
                </p>
              )}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Install Date</TableHead>
                      <TableHead>Warranty Expiry</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tree.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No assets found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tree.map(asset => (
                        <AssetRow
                          key={asset.id}
                          asset={asset}
                          depth={0}
                          onSelect={setSelected}
                          selected={selected?.id ?? null}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="dependencies">
          <Card className="p-4">
            {selected ? (
              <DependenciesTab assetId={selected.id} />
            ) : (
              <p className="text-sm text-muted-foreground">Select an asset first.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card className="p-4">
            {selected ? (
              <ComplianceTab assetId={selected.id} />
            ) : (
              <p className="text-sm text-muted-foreground">Select an asset first.</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <DetailPanel asset={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
