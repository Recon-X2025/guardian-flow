import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { FlaskConical, Play, Rocket } from 'lucide-react';

const API = '/api/ml';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface Experiment {
  id: string;
  name: string;
  algorithm: string;
  status: string;
  created_at: string;
}

interface Run {
  id: string;
  experiment_id: string;
  status: string;
  metrics: { accuracy: number; loss: number; duration: number };
  deployed?: boolean;
  created_at: string;
}

const ALGORITHMS = ['linear_regression', 'random_forest', 'gradient_boosting', 'neural_network'];

export default function AutoMLStudio() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', dataSource: '', targetMetric: '', algorithm: '' });
  const [selectedExp, setSelectedExp] = useState<string | null>(null);

  const { data: expData } = useQuery({
    queryKey: ['automl-experiments'],
    queryFn: () => apiFetch('/experiments'),
  });

  const { data: runsData } = useQuery({
    queryKey: ['automl-runs', selectedExp],
    queryFn: () => apiFetch(`/experiments/${selectedExp}/results`),
    enabled: !!selectedExp,
  });

  const createMut = useMutation({
    mutationFn: () => apiFetch('/experiments', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      toast({ title: 'Experiment created' });
      qc.invalidateQueries({ queryKey: ['automl-experiments'] });
      setForm({ name: '', dataSource: '', targetMetric: '', algorithm: '' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deployMut = useMutation({
    mutationFn: (expId: string) => apiFetch(`/experiments/${expId}/deploy`, { method: 'POST' }),
    onSuccess: () => {
      toast({ title: 'Model deployed' });
      qc.invalidateQueries({ queryKey: ['automl-runs', selectedExp] });
    },
    onError: (e: Error) => toast({ title: 'Deploy failed', description: e.message, variant: 'destructive' }),
  });

  const experiments: Experiment[] = expData?.experiments || [];
  const runs: Run[] = runsData?.runs || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-8 w-8" />
        <h1 className="text-3xl font-bold">AutoML Studio</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>New Experiment</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Experiment name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Data source" value={form.dataSource} onChange={e => setForm(f => ({ ...f, dataSource: e.target.value }))} />
            <Input placeholder="Target metric" value={form.targetMetric} onChange={e => setForm(f => ({ ...f, targetMetric: e.target.value }))} />
            <Select value={form.algorithm} onValueChange={v => setForm(f => ({ ...f, algorithm: v }))}>
              <SelectTrigger><SelectValue placeholder="Algorithm" /></SelectTrigger>
              <SelectContent>
                {ALGORITHMS.map(a => <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="mt-4" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            <Play className="h-4 w-4 mr-2" />Run Experiment
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Experiments</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {experiments.map(exp => (
              <div
                key={exp.id}
                className={`p-3 rounded border cursor-pointer hover:bg-muted ${selectedExp === exp.id ? 'border-primary' : ''}`}
                onClick={() => setSelectedExp(exp.id)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{exp.name}</span>
                  <Badge>{exp.algorithm}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(exp.created_at).toLocaleDateString()}</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={e => { e.stopPropagation(); deployMut.mutate(exp.id); }}>
                  <Rocket className="h-3 w-3 mr-1" />Deploy Best
                </Button>
              </div>
            ))}
            {experiments.length === 0 && <p className="text-muted-foreground text-sm">No experiments yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Run History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Loss</TableHead>
                  <TableHead>Duration (s)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map(run => (
                  <TableRow key={run.id}>
                    <TableCell>{(run.metrics?.accuracy * 100).toFixed(2)}%</TableCell>
                    <TableCell>{run.metrics?.loss?.toFixed(4)}</TableCell>
                    <TableCell>{run.metrics?.duration}s</TableCell>
                    <TableCell><Badge variant={run.deployed ? 'default' : 'secondary'}>{run.deployed ? 'deployed' : run.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {runs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Select an experiment</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
