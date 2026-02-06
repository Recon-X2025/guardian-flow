import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Code, Package, Key, BookOpen, Webhook,
  Download, Star, ExternalLink, Copy, Check,
  Search, Filter, Plus
} from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

interface WebhookData {
  id: string;
  url: string;
  events?: string[];
  active: boolean;
  last_triggered_at?: string;
}

const sampleExtensions = [
  { id: '1', name: 'Slack Integration', description: 'Send notifications to Slack channels', category: 'Communication', downloads: 1250, rating: 4.8, status: 'published' },
  { id: '2', name: 'QuickBooks Sync', description: 'Sync invoices with QuickBooks', category: 'Finance', downloads: 890, rating: 4.5, status: 'published' },
  { id: '3', name: 'Google Calendar', description: 'Sync schedules with Google Calendar', category: 'Productivity', downloads: 2100, rating: 4.9, status: 'published' },
  { id: '4', name: 'Twilio SMS', description: 'Send SMS notifications via Twilio', category: 'Communication', downloads: 650, rating: 4.3, status: 'published' },
  { id: '5', name: 'Stripe Payments', description: 'Process payments via Stripe', category: 'Finance', downloads: 1800, rating: 4.7, status: 'published' },
];

const apiEndpoints = [
  { method: 'GET', path: '/api/work-orders', description: 'List all work orders' },
  { method: 'POST', path: '/api/work-orders', description: 'Create a new work order' },
  { method: 'GET', path: '/api/technicians', description: 'List all technicians' },
  { method: 'GET', path: '/api/customers', description: 'List all customers' },
  { method: 'POST', path: '/api/webhooks', description: 'Register a webhook' },
  { method: 'GET', path: '/api/invoices', description: 'List all invoices' },
];

export default function DeveloperPortal() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState(false);
  const [showApiDocs, setShowApiDocs] = useState(false);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ url: '', events: '' });
  const [installingExt, setInstallingExt] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: apiKeys } = useQuery({
    queryKey: ['developer-api-keys'],
    queryFn: async () => {
      const { data } = await apiClient.from('partner_api_keys').select('*').limit(5);
      return data || [];
    }
  });

  const { data: webhooks } = useQuery({
    queryKey: ['developer-webhooks'],
    queryFn: async () => {
      const { data } = await apiClient.from('webhooks').select('*').limit(10);
      return data || [];
    }
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (data: typeof webhookForm) => {
      const result = await apiClient.from('webhooks').insert({
        url: data.url,
        events: data.events.split(',').map(e => e.trim()).filter(Boolean),
        active: true,
        created_at: new Date().toISOString(),
      });
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer-webhooks'] });
      setShowWebhookDialog(false);
      setWebhookForm({ url: '', events: '' });
      toast({ title: 'Webhook created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create webhook', description: error.message, variant: 'destructive' });
    }
  });

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    toast({ title: 'API key copied to clipboard' });
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleInstallExtension = (ext: typeof sampleExtensions[0]) => {
    setInstallingExt(ext.id);
    setTimeout(() => {
      setInstallingExt(null);
      toast({ title: `${ext.name} installed successfully`, description: 'The extension is now available in your integrations.' });
    }, 1500);
  };

  const handleGenerateKey = () => {
    setShowNewKeyDialog(false);
    toast({ title: 'New API key generated', description: 'Your new API key has been created. Make sure to copy it now.' });
  };

  const handleViewDocs = (endpoint: typeof apiEndpoints[0]) => {
    toast({ title: `Viewing ${endpoint.path}`, description: endpoint.description });
    setShowApiDocs(true);
  };

  const filteredExtensions = sampleExtensions.filter(ext => {
    const matchesSearch = ext.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ext.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || ext.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(sampleExtensions.map(e => e.category))];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Developer Portal</h1>
          <p className="text-muted-foreground mt-1">Build integrations and extend the platform</p>
        </div>
        <Button onClick={() => setShowApiDocs(true)}>
          <BookOpen className="h-4 w-4 mr-2" />
          API Documentation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">API Calls Today</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,453</div>
            <p className="text-xs text-muted-foreground">+8% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Webhooks</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{webhooks?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Registered endpoints</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Extensions Installed</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Active integrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys?.length || 1}</div>
            <p className="text-xs text-muted-foreground">Active keys</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="marketplace" className="space-y-4">
        <TabsList>
          <TabsTrigger value="marketplace">
            <Package className="h-4 w-4 mr-2" />
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="api">
            <Code className="h-4 w-4 mr-2" />
            API Reference
          </TabsTrigger>
          <TabsTrigger value="keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="h-4 w-4 mr-2" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search extensions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredExtensions.map((ext) => (
              <Card key={ext.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="secondary">{ext.category}</Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{ext.name}</CardTitle>
                  <CardDescription>{ext.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      {ext.downloads.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {ext.rating}
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={installingExt === ext.id}
                    onClick={() => handleInstallExtension(ext)}
                  >
                    {installingExt === ext.id ? 'Installing...' : 'Install Extension'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>Available REST API endpoints for integration</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Method</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiEndpoints.map((endpoint, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Badge variant={endpoint.method === 'GET' ? 'secondary' : 'default'}>
                          {endpoint.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{endpoint.path}</TableCell>
                      <TableCell className="text-muted-foreground">{endpoint.description}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewDocs(endpoint)} title="View Documentation">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>Manage your API keys for authentication</CardDescription>
                </div>
                <Button onClick={() => setShowNewKeyDialog(true)}>
                  <Key className="h-4 w-4 mr-2" />
                  Generate New Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Production Key</p>
                    <p className="text-sm text-muted-foreground font-mono">gf_prod_****************************a1b2</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-600">Active</Badge>
                    <Button variant="outline" size="sm" onClick={() => handleCopyKey('gf_prod_xxxx')}>
                      {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Development Key</p>
                    <p className="text-sm text-muted-foreground font-mono">gf_dev_*****************************c3d4</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-600">Active</Badge>
                    <Button variant="outline" size="sm" onClick={() => handleCopyKey('gf_dev_xxxx')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Webhooks</CardTitle>
                  <CardDescription>Configure webhook endpoints for real-time events</CardDescription>
                </div>
                <Button onClick={() => setShowWebhookDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Webhook
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {webhooks && webhooks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Triggered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook: WebhookData) => (
                      <TableRow key={webhook.id}>
                        <TableCell className="font-mono text-sm">{webhook.url}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{webhook.events?.join(', ') || 'All'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={webhook.active ? 'default' : 'secondary'}>
                            {webhook.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {webhook.last_triggered_at ? new Date(webhook.last_triggered_at).toLocaleString() : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No webhooks configured yet.</p>
                  <p className="text-sm mb-4">Add a webhook to receive real-time event notifications.</p>
                  <Button onClick={() => setShowWebhookDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Webhook
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* API Documentation Dialog */}
      <Dialog open={showApiDocs} onOpenChange={setShowApiDocs}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>API Documentation</DialogTitle>
            <DialogDescription>Complete reference for the GuardianFlow API</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Authentication</h3>
              <p className="text-sm text-muted-foreground mb-2">
                All API requests require authentication using an API key in the header:
              </p>
              <pre className="bg-muted p-3 rounded text-sm font-mono">
                Authorization: Bearer YOUR_API_KEY
              </pre>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Base URL</h3>
              <pre className="bg-muted p-3 rounded text-sm font-mono">
                https://api.guardianflow.com/v1
              </pre>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Available Endpoints</h3>
              <div className="space-y-2">
                {apiEndpoints.map((ep, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 border rounded">
                    <Badge variant={ep.method === 'GET' ? 'secondary' : 'default'}>{ep.method}</Badge>
                    <code className="text-sm">{ep.path}</code>
                    <span className="text-sm text-muted-foreground">- {ep.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiDocs(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate New Key Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogDescription>Create a new API key for your application</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Key Name</Label>
              <Input placeholder="e.g., Production API Key" />
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select defaultValue="development">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewKeyDialog(false)}>Cancel</Button>
            <Button onClick={handleGenerateKey}>Generate Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Webhook Dialog */}
      <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>Configure a new webhook endpoint</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createWebhookMutation.mutate(webhookForm); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-server.com/webhook"
                value={webhookForm.url}
                onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-events">Events (comma-separated)</Label>
              <Input
                id="webhook-events"
                placeholder="work_order.created, invoice.paid"
                value={webhookForm.events}
                onChange={(e) => setWebhookForm({ ...webhookForm, events: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Leave empty to receive all events</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowWebhookDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createWebhookMutation.isPending}>
                {createWebhookMutation.isPending ? 'Creating...' : 'Add Webhook'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
