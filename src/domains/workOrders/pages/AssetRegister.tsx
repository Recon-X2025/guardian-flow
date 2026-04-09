import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronRight, ChevronDown, Package, AlertTriangle, Loader2 } from 'lucide-react';

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

export default function AssetRegister() {
  const [selected, setSelected] = useState<Asset | null>(null);

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
      )}

      <DetailPanel asset={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
