import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Package, Star, Download, Settings, Search } from 'lucide-react';

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
}

interface MarketplaceExtension {
  id: string;
  extension_name: string;
  description?: string;
  category?: string;
  rating?: number;
  icon_url?: string;
  status: string;
  install_count?: number;
  price_type?: string;
  price_monthly?: number;
  developer_name?: string;
  version?: string;
}

interface InstalledExtension {
  extension_id: string;
}

export default function Marketplace() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedExtension, setSelectedExtension] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const { data: extensionsData, isLoading } = useQuery({
    queryKey: ['marketplace-extensions', category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      const res = await fetch(`/api/marketplace/extensions?${params}`, { headers: authHeader() });
      if (!res.ok) throw new Error('Failed to load extensions');
      return res.json();
    },
  });

  const { data: installedData } = useQuery({
    queryKey: ['installed-extensions'],
    queryFn: async () => {
      const res = await fetch('/api/marketplace/installed', { headers: authHeader() });
      if (!res.ok) return { extensions: [] };
      return res.json();
    },
  });

  const installMutation = useMutation({
    mutationFn: async (extensionId: string) => {
      const res = await fetch(`/api/marketplace/extensions/${extensionId}/install`, {
        method: 'POST', headers: authHeader(), body: JSON.stringify({}),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installed-extensions'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-extensions'] });
      toast({ title: 'Extension installed', description: 'The extension has been successfully installed.' });
    },
    onError: (error: Error) => toast({ title: 'Installation failed', description: error.message, variant: 'destructive' }),
  });

  const uninstallMutation = useMutation({
    mutationFn: async (extensionId: string) => {
      const res = await fetch(`/api/marketplace/extensions/${extensionId}/install`, {
        method: 'DELETE', headers: authHeader(),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installed-extensions'] });
      toast({ title: 'Extension uninstalled', description: 'The extension has been removed.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const allExtensions: MarketplaceExtension[] = extensionsData?.extensions ?? [];
  const installed: InstalledExtension[] = installedData?.extensions ?? [];

  const filteredExtensions = allExtensions.filter(e =>
    !search ||
    e.extension_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const isInstalled = (extensionId: string) =>
    installed.some((ext) => ext.extension_id === extensionId);

  const categories = ['all', ...Array.from(new Set(allExtensions.map(e => e.category).filter((c): c is string => Boolean(c))))];

  if (isLoading) return <div className="p-8">Loading marketplace...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Extension Marketplace</h1>
          <p className="text-muted-foreground">Extend Guardian Flow with powerful integrations</p>
        </div>
        <Badge variant="secondary">{installed.length} installed</Badge>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search extensions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c} value={c} className="capitalize">{c === 'all' ? 'All Categories' : c.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExtensions.map((extension) => (
          <Card key={extension.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {extension.icon_url ? (
                    <img src={extension.icon_url} alt="" className="w-10 h-10 rounded" />
                  ) : (
                    <Package className="w-10 h-10 text-primary" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{extension.extension_name}</CardTitle>
                    <div className="flex gap-1 mt-0.5">
                      <Badge variant="outline" className="capitalize text-xs">{extension.category?.replace(/_/g, ' ')}</Badge>
                      {extension.price_type === 'free'
                        ? <Badge className="bg-green-100 text-green-800 border-0 text-xs">Free</Badge>
                        : <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">${extension.price_monthly}/mo</Badge>}
                    </div>
                  </div>
                </div>
              </div>
              <CardDescription>{extension.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span>{extension.rating?.toFixed(1) || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" />
                  <span>{extension.install_count ?? 0}</span>
                </div>
                <span className="text-xs">v{extension.version}</span>
              </div>

              <div className="flex gap-2">
                {isInstalled(extension.id) ? (
                  <>
                    <Button variant="outline" size="sm" className="flex-1"
                      onClick={() => uninstallMutation.mutate(extension.id)}
                      disabled={uninstallMutation.isPending}>
                      Uninstall
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedExtension(extension.id)}>
                      <Settings className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="flex-1"
                    onClick={() => installMutation.mutate(extension.id)}
                    disabled={installMutation.isPending}>
                    {extension.price_type === 'paid' ? `Install — $${extension.price_monthly}/mo` : 'Install Free'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredExtensions.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            No extensions found matching your search.
          </div>
        )}
      </div>

      {selectedExtension && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelectedExtension(null)}>
          <div className="bg-background rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold mb-2">Extension Settings</h2>
            <p className="text-sm text-muted-foreground mb-4">Configuration for this extension is managed by the extension developer.</p>
            <Button onClick={() => setSelectedExtension(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
