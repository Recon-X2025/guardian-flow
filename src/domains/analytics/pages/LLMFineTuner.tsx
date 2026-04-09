import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Cpu } from 'lucide-react';

const BASE_MODELS = ['gpt-3.5-turbo', 'gpt-4', 'llama-2', 'mistral'];

interface FineTuneJob {
  id: string;
  base_model: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  epochs: number;
  created_at: string;
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`/api/ai${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  queued: 'secondary',
  running: 'default',
  completed: 'default',
  failed: 'destructive',
  cancelled: 'secondary',
};

export default function LLMFineTuner() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ baseModel: '', epochs: '3', learningRate: '0.0001', batchSize: '8' });

  const { data } = useQuery({
    queryKey: ['finetune-jobs'],
    queryFn: () => apiFetch('/finetune'),
    refetchInterval: 5000,
  });

  const createMut = useMutation({
    mutationFn: () => apiFetch('/finetune', {
      method: 'POST',
      body: JSON.stringify({
        baseModel: form.baseModel,
        epochs: parseInt(form.epochs),
        learningRate: parseFloat(form.learningRate),
        batchSize: parseInt(form.batchSize),
      }),
    }),
    onSuccess: () => {
      toast({ title: 'Fine-tune job created' });
      qc.invalidateQueries({ queryKey: ['finetune-jobs'] });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const cancelMut = useMutation({
    mutationFn: (jobId: string) => apiFetch(`/finetune/${jobId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finetune-jobs'] }),
    onError: (e: Error) => toast({ title: 'Cancel failed', description: e.message, variant: 'destructive' }),
  });

  const jobs: FineTuneJob[] = data?.jobs || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Cpu className="h-8 w-8" />
        <h1 className="text-3xl font-bold">LLM Fine-Tuner</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>New Fine-Tune Job</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Select value={form.baseModel} onValueChange={v => setForm(f => ({ ...f, baseModel: v }))}>
              <SelectTrigger><SelectValue placeholder="Base model" /></SelectTrigger>
              <SelectContent>
                {BASE_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Epochs" value={form.epochs} onChange={e => setForm(f => ({ ...f, epochs: e.target.value }))} />
            <Input type="number" placeholder="Learning rate" value={form.learningRate} onChange={e => setForm(f => ({ ...f, learningRate: e.target.value }))} step="0.0001" />
            <Input type="number" placeholder="Batch size" value={form.batchSize} onChange={e => setForm(f => ({ ...f, batchSize: e.target.value }))} />
          </div>
          <Button className="mt-4" onClick={() => createMut.mutate()} disabled={createMut.isPending || !form.baseModel}>
            Start Fine-Tuning
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Jobs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="p-3 border rounded space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{job.base_model}</span>
                  <span className="text-xs text-muted-foreground ml-2">{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_COLORS[job.status] || 'secondary'}>{job.status}</Badge>
                  {['queued', 'running'].includes(job.status) && (
                    <Button size="sm" variant="outline" onClick={() => cancelMut.mutate(job.id)}>Cancel</Button>
                  )}
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${job.progress || 0}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{job.progress || 0}% complete · {job.epochs} epochs</p>
            </div>
          ))}
          {jobs.length === 0 && <p className="text-muted-foreground text-sm">No fine-tune jobs yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
