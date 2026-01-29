import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Webhook } from 'lucide-react';

export default function Webhooks() {
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
        <Button>
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
              {webhooks.map((webhook: any) => (
                <TableRow key={webhook.id}>
                  <TableCell className="font-medium">{webhook.name}</TableCell>
                  <TableCell className="font-mono text-sm">{webhook.url}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events?.slice(0, 3).map((event: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                      {webhook.events?.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{webhook.events.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={webhook.active ? 'bg-success' : 'bg-muted'}>
                      {webhook.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{webhook.retry_count}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No webhooks configured. Add your first webhook to get started.</p>
          </div>
        )}
      </Card>
    </div>
  );
}