import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, Settings, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

interface ConnectorConfig {
  id: string;
  connector_type: string;
  status: string;
  updated_at: string;
  credentials?: Record<string, string>;
  field_mappings?: Record<string, string>;
}

interface SyncLogEntry {
  id: string;
  entity: string;
  status: string;
  synced_at: string;
  records_processed?: number;
}

const CONNECTOR_DEFS = [
  { type: 'salesforce', label: 'Salesforce',  description: 'Sync accounts, contacts and opportunities' },
  { type: 'quickbooks', label: 'QuickBooks',  description: 'Sync invoices, payments and chart of accounts' },
  { type: 'sap',        label: 'SAP',         description: 'Sync GL accounts, cost centres and vendor master' },
  { type: 'xero',       label: 'Xero',        description: 'Sync invoices, bills and bank transactions' },
];

async function fetchConnectors(): Promise<ConnectorConfig[]> {
  const res = await fetch('/api/connectors', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch connectors');
  return (await res.json()).connectors ?? [];
}

async function fetchSyncLog(id: string): Promise<SyncLogEntry[]> {
  const res = await fetch(`/api/connectors/${id}/sync-log`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch sync log');
  return (await res.json()).logs ?? [];
}

function statusIcon(status: string) {
  if (status === 'configured') return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === 'error')      return <AlertTriangle className="h-4 w-4 text-destructive" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

export default function ConnectorManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [viewingLog, setViewingLog] = useState<ConnectorConfig | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const { data: connectors = [], isLoading, error } = useQuery({
    queryKey: ['connectors'],
    queryFn: fetchConnectors,
  });

  const { data: syncLog = [] } = useQuery({
    queryKey: ['sync-log', viewingLog?.id],
    queryFn: () => fetchSyncLog(viewingLog!.id),
    enabled: !!viewingLog,
  });

  const configuredMap = new Map(connectors.map(c => [c.connector_type, c]));

  const handleConfigure = async (type: string) => {
    try {
      const res = await fetch('/api/connectors', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connector_type: type, credentials }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to configure');
      }
      toast({ title: 'Connector configured', description: `${type} connector has been saved.` });
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
      setConfiguring(null);
      setCredentials({});
    } catch (err: unknown) {
      toast({
        title: 'Configuration failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleSync = async (connector: ConnectorConfig, entity: string) => {
    setSyncing(connector.id);
    try {
      const res = await fetch(`/api/connectors/${connector.id}/sync`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'inbound', entity }),
      });
      if (!res.ok) throw new Error('Sync failed');
      toast({ title: 'Sync triggered', description: `${connector.connector_type} sync started for ${entity}.` });
      queryClient.invalidateQueries({ queryKey: ['sync-log', connector.id] });
    } catch (err: unknown) {
      toast({
        title: 'Sync failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Connector Management</h1>
        <p className="text-muted-foreground">Configure and sync ERP/CRM integrations</p>
      </div>

      {isLoading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>}
      {error    && <div className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />Failed to load connectors.</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CONNECTOR_DEFS.map(def => {
          const configured = configuredMap.get(def.type);
          return (
            <Card key={def.type} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{def.label}</h3>
                  <p className="text-sm text-muted-foreground">{def.description}</p>
                </div>
                {configured
                  ? <div className="flex items-center gap-1">{statusIcon(configured.status)}<Badge variant="outline">{configured.status}</Badge></div>
                  : <Badge variant="secondary">Not configured</Badge>
                }
              </div>
              {configured && (
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date(configured.updated_at).toLocaleString()}
                </p>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setConfiguring(def.type); setCredentials({}); }}>
                  <Settings className="h-3 w-3 mr-1" />Configure
                </Button>
                {configured && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={syncing === configured.id}
                      onClick={() => handleSync(configured, 'accounts')}
                    >
                      {syncing === configured.id
                        ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        : <RefreshCw className="h-3 w-3 mr-1" />
                      }
                      Sync Now
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setViewingLog(configured)}>
                      Sync Log
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Configuration modal */}
      <Dialog open={!!configuring} onOpenChange={() => setConfiguring(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {configuring}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>API Key / Client ID</Label>
              <Input
                placeholder="Enter credential"
                value={credentials.api_key ?? ''}
                onChange={e => setCredentials(c => ({ ...c, api_key: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Instance URL / Realm ID</Label>
              <Input
                placeholder="e.g. https://na1.salesforce.com"
                value={credentials.instance_url ?? ''}
                onChange={e => setCredentials(c => ({ ...c, instance_url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Field Mappings</Label>
              <p className="text-xs text-muted-foreground">Default field mappings are applied automatically.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfiguring(null)}>Cancel</Button>
              <Button onClick={() => configuring && handleConfigure(configuring)}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync log modal */}
      <Dialog open={!!viewingLog} onOpenChange={() => setViewingLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sync Log — {viewingLog?.connector_type}</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Synced At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncLog.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No sync history.</TableCell></TableRow>
              ) : syncLog.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.entity}</TableCell>
                  <TableCell>
                    <Badge variant={entry.status === 'success' ? 'default' : 'destructive'}>{entry.status}</Badge>
                  </TableCell>
                  <TableCell>{entry.records_processed ?? '—'}</TableCell>
                  <TableCell>{new Date(entry.synced_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
