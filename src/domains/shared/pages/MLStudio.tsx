import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/domains/shared/hooks/use-toast';

const statusColor: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export default function MLStudio() {
  const [tab, setTab] = useState<'datasets' | 'experiments' | 'models'>('datasets');
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };

  const { data: dsData } = useQuery({ queryKey: ['ml-datasets'], queryFn: () => fetch('/api/ml-studio/datasets', { headers }).then(r => r.json()) });
  const { data: expData } = useQuery({ queryKey: ['ml-experiments'], queryFn: () => fetch('/api/ml-studio/experiments', { headers }).then(r => r.json()) });
  const { data: mdlData } = useQuery({ queryKey: ['ml-models'], queryFn: () => fetch('/api/ml-studio/models', { headers }).then(r => r.json()) });

  const train = useMutation({
    mutationFn: (id: string) => fetch(`/api/ml-studio/experiments/${id}/train`, { method: 'POST', headers }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ml-experiments'] }); toast({ title: 'Training complete' }); },
  });

  const deploy = useMutation({
    mutationFn: (id: string) => fetch(`/api/ml-studio/experiments/${id}/deploy`, { method: 'POST', headers }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ml-models'] }); toast({ title: 'Model deployed' }); },
  });

  const datasets = dsData?.datasets ?? [];
  const experiments = expData?.experiments ?? [];
  const models = mdlData?.models ?? [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">ML Studio</h1>
      <div className="flex gap-2">
        {(['datasets', 'experiments', 'models'] as const).map(t => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)} className="capitalize">{t}</Button>
        ))}
      </div>

      {tab === 'datasets' && (
        <Card>
          <CardHeader><CardTitle>Datasets</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Source</th><th className="py-2 pr-4">Rows</th><th className="py-2">Status</th></tr></thead>
              <tbody>
                {datasets.map((d: any) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{d.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{d.source_collection}</td>
                    <td className="py-2 pr-4">{d.row_count?.toLocaleString()}</td>
                    <td className="py-2"><span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">{d.status}</span></td>
                  </tr>
                ))}
                {datasets.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No datasets.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === 'experiments' && (
        <Card>
          <CardHeader><CardTitle>Experiments</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="py-2 pr-4">Algorithm</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Accuracy</th><th className="py-2">Actions</th></tr></thead>
              <tbody>
                {experiments.map((e: any) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{e.algorithm}</td>
                    <td className="py-2 pr-4"><span className={`px-2 py-0.5 rounded text-xs ${statusColor[e.status] ?? 'bg-gray-100'}`}>{e.status}</span></td>
                    <td className="py-2 pr-4">{e.metrics?.accuracy ?? '—'}</td>
                    <td className="py-2 flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => train.mutate(e.id)}>Train</Button>
                      {e.status === 'completed' && <Button size="sm" variant="outline" onClick={() => deploy.mutate(e.id)}>Deploy</Button>}
                    </td>
                  </tr>
                ))}
                {experiments.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No experiments.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === 'models' && (
        <Card>
          <CardHeader><CardTitle>Deployed Models</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="py-2 pr-4">Version</th><th className="py-2 pr-4">Endpoint</th><th className="py-2 pr-4">Deployed</th><th className="py-2">Status</th></tr></thead>
              <tbody>
                {models.map((m: any) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{m.version}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{m.endpoint_path}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{m.deployed_at ? new Date(m.deployed_at).toLocaleDateString() : '—'}</td>
                    <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs ${m.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>{m.status}</span></td>
                  </tr>
                ))}
                {models.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No deployed models.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
