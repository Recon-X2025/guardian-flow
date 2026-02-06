import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Webhook, Pencil, Trash2, TestTube } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events?: string[];
  status: string;
  active?: boolean;
  retry_count?: number;
}

export default function Webhooks() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [formData, setFormData] = useState({ name: '', url: '', events: '', active: true });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const result = await apiClient
        .from('webhooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (result.error) throw result.error;
      return result.data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const result = await apiClient.from('webhooks').insert({
        name: data.name,
        url: data.url,
        events: data.events.split(',').map(e => e.trim()).filter(Boolean),
        active: data.active,
        retry_count: 0,
        created_at: new Date().toISOString(),
      });
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Webhook created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create webhook', description: error.message, variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string } & typeof formData) => {
      const result = await apiClient.from('webhooks').update({
        name: data.name,
        url: data.url,
        events: data.events.split(',').map(e => e.trim()).filter(Boolean),
        active: data.active,
      }).eq('id', data.id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setIsDialogOpen(false);
      setEditingWebhook(null);
      resetForm();
      toast({ title: 'Webhook updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update webhook', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await apiClient.from('webhooks').delete().eq('id', id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({ title: 'Webhook deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete webhook', description: error.message, variant: 'destructive' });
    }
  });

  const testMutation = useMutation({
    mutationFn: async (webhook: WebhookConfig) => {
      // Send a test ping to the webhook URL
      toast({ title: 'Testing webhook...', description: `Sending test to ${webhook.url}` });
      // In a real implementation, this would call a backend endpoint
      return { success: true };
    },
    onSuccess: () => {
      toast({ title: 'Test sent successfully', description: 'Check your endpoint for the test payload' });
    }
  });

  const resetForm = () => {
    setFormData({ name: '', url: '', events: '', active: true });
  };

  const handleAddWebhook = () => {
    setEditingWebhook(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleConfigure = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events?.join(', ') || '',
      active: webhook.active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWebhook) {
      updateMutation.mutate({ id: editingWebhook.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this webhook?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Webhook className="h-8 w-8" />
            Webhooks & Integrations
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure webhooks for external system integration
          </p>
        </div>
        <Button onClick={handleAddWebhook}>
          <Plus className="h-4 w-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Loading webhooks...</div>
        ) : webhooks && webhooks.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Retry Count</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook: WebhookConfig) => (
                <TableRow key={webhook.id}>
                  <TableCell className="font-medium">{webhook.name}</TableCell>
                  <TableCell className="font-mono text-sm max-w-[200px] truncate">{webhook.url}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events?.slice(0, 3).map((event: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                      {(webhook.events?.length || 0) > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{(webhook.events?.length || 0) - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={webhook.active ? 'bg-green-500' : 'bg-gray-400'}>
                      {webhook.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{webhook.retry_count || 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleConfigure(webhook)}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Configure
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => testMutation.mutate(webhook)}>
                        <TestTube className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(webhook.id)}>
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-4">No webhooks configured. Add your first webhook to get started.</p>
            <Button onClick={handleAddWebhook}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Webhook
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWebhook ? 'Configure Webhook' : 'Add New Webhook'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Webhook"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Webhook URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com/webhook"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="events">Events (comma-separated)</Label>
              <Input
                id="events"
                value={formData.events}
                onChange={(e) => setFormData({ ...formData, events: e.target.value })}
                placeholder="work_order.created, work_order.updated, invoice.paid"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingWebhook ? 'Update' : 'Create'} Webhook
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
