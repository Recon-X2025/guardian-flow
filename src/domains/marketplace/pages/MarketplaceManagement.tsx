import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Store, Package, DollarSign, TrendingUp, Users, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/domains/shared/hooks/use-toast";

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
}

interface MarketplaceExtension {
  id: string;
  extension_name: string;
  status: string;
  install_count?: number;
  created_at: string;
  developer_name?: string;
  category?: string;
  rating?: number;
  price_type?: string;
  price_monthly?: number;
}

export default function MarketplaceManagement() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: statsData } = useQuery({
    queryKey: ["marketplace-stats"],
    queryFn: async () => {
      const res = await fetch('/api/marketplace/admin/stats', { headers: authHeader() });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: extensionsData } = useQuery({
    queryKey: ["marketplace-all-extensions"],
    queryFn: async () => {
      const res = await fetch('/api/marketplace/extensions?limit=100', { headers: authHeader() });
      if (!res.ok) return { extensions: [] };
      return res.json();
    },
  });

  const { data: queueData } = useQuery({
    queryKey: ["marketplace-queue"],
    queryFn: async () => {
      const res = await fetch('/api/marketplace/admin/queue', { headers: authHeader() });
      if (!res.ok) return { queue: [] };
      return res.json();
    },
  });

  const { data: installationsData } = useQuery({
    queryKey: ["marketplace-installations"],
    queryFn: async () => {
      const res = await fetch('/api/marketplace/installed', { headers: authHeader() });
      if (!res.ok) return { extensions: [] };
      return res.json();
    },
  });

  const approveMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/marketplace/admin/${id}/approve`, { method: 'PUT', headers: authHeader() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-queue'] });
      qc.invalidateQueries({ queryKey: ['marketplace-stats'] });
      toast({ title: 'Extension approved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const rejectMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/marketplace/admin/${id}/reject`, {
        method: 'PUT', headers: authHeader(), body: JSON.stringify({ reason: 'Does not meet quality standards' }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-queue'] });
      toast({ title: 'Extension rejected' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const extensions: MarketplaceExtension[] = extensionsData?.extensions ?? [];
  const queue: MarketplaceExtension[] = queueData?.queue ?? [];
  const installations = installationsData?.extensions ?? [];
  const stats = statsData;

  const totalRevenue = stats?.total_platform_revenue ?? 0;
  const activeExtensions = stats?.total_extensions ?? extensions.length;
  const pendingApprovals = stats?.pending_review ?? queue.length;
  const totalInstallations = stats?.total_installations ?? installations.length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Store className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Marketplace Management</h1>
          <p className="text-muted-foreground">Manage extensions, installations, and revenue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Extensions</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeExtensions}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Installations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalInstallations}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-500">{pendingApprovals}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="extensions">
        <TabsList>
          <TabsTrigger value="extensions">All Extensions</TabsTrigger>
          <TabsTrigger value="queue">Review Queue {queue.length > 0 && <Badge className="ml-1 bg-orange-100 text-orange-800 border-0">{queue.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="installations">Installations</TabsTrigger>
        </TabsList>

        <TabsContent value="extensions" className="mt-4">
          <Card>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Marketplace Extensions</CardTitle>
                  <CardDescription>
                    All extensions available on the marketplace
                  </CardDescription>
                </div>
                <Button disabled title="Extension submission is not yet available">
                  <Store className="h-4 w-4 mr-2" />
                  Submit Extension
                </Button>
              </div>
            </CardHeader>
            <CardContent>
                <TableHeader>
                  <TableRow>
                    <TableHead>Extension</TableHead>
                    <TableHead>Developer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Installs</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extensions.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No extensions</TableCell></TableRow>
                  )}
                  {extensions.map((ext) => (
                    <TableRow key={ext.id}>
                      <TableCell className="font-medium">{ext.extension_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ext.developer_name ?? '—'}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-xs">{ext.category?.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="text-sm">{ext.rating?.toFixed(1) ?? '—'}</TableCell>
                      <TableCell>{ext.install_count ?? 0}</TableCell>
                      <TableCell className="text-sm">
                        {ext.price_type === 'free' ? 'Free' : `$${ext.price_monthly}/mo`}
                      </TableCell>
                      <TableCell>
                        <Badge className={ext.status === 'approved' ? 'bg-green-100 text-green-800 border-0' : 'bg-yellow-100 text-yellow-800 border-0'}>
                          {ext.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {queue.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No extensions pending review.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Extension</TableHead>
                      <TableHead>Developer</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queue.map((ext) => (
                      <TableRow key={ext.id}>
                        <TableCell className="font-medium">{ext.extension_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ext.developer_name ?? '—'}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize text-xs">{ext.category?.replace(/_/g, ' ')}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ext.created_at ? formatDistanceToNow(new Date(ext.created_at), { addSuffix: true }) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-green-700 border-green-300"
                              onClick={() => approveMut.mutate(ext.id)} disabled={approveMut.isPending}>
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-700 border-red-300"
                              onClick={() => rejectMut.mutate(ext.id)} disabled={rejectMut.isPending}>
                              <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="installations" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Extension</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Installed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installations.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No installations yet</TableCell></TableRow>
                  )}
                  {installations.map((inst: { id: string; extension_name: string; version: string; status: string; installed_at: string }) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium">{inst.extension_name}</TableCell>
                      <TableCell className="text-sm">v{inst.version}</TableCell>
                      <TableCell>
                        <Badge className={inst.status === 'active' ? 'bg-green-100 text-green-800 border-0' : 'bg-gray-100 text-gray-800 border-0'}>
                          {inst.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {inst.installed_at ? formatDistanceToNow(new Date(inst.installed_at), { addSuffix: true }) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
