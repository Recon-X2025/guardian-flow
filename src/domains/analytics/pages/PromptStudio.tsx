import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Wand2, Play, Save, Trash2 } from 'lucide-react';

interface StoredPrompt {
  id: string;
  name: string;
  template: string;
  variables: string[];
  version: number;
  updated_at: string;
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`/api/ai${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function PromptStudio() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<StoredPrompt | null>(null);
  const [form, setForm] = useState({ name: '', template: '', description: '' });
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [testResponse, setTestResponse] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['ai-prompts'],
    queryFn: () => apiFetch('/prompts'),
  });

  const createMut = useMutation({
    mutationFn: () => apiFetch('/prompts', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      toast({ title: 'Prompt created' });
      qc.invalidateQueries({ queryKey: ['ai-prompts'] });
      setForm({ name: '', template: '', description: '' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: () => apiFetch(`/prompts/${selected!.id}`, { method: 'PUT', body: JSON.stringify({ template: selected!.template, name: selected!.name }) }),
    onSuccess: () => {
      toast({ title: 'Prompt updated' });
      qc.invalidateQueries({ queryKey: ['ai-prompts'] });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/prompts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: 'Prompt deleted' });
      qc.invalidateQueries({ queryKey: ['ai-prompts'] });
      setSelected(null);
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const testMut = useMutation({
    mutationFn: () => apiFetch(`/prompts/${selected!.id}/test`, { method: 'POST', body: JSON.stringify({ variables: varValues }) }),
    onSuccess: (data) => setTestResponse(data.response),
    onError: (e: Error) => toast({ title: 'Test failed', description: e.message, variant: 'destructive' }),
  });

  const prompts: StoredPrompt[] = data?.prompts || [];
  const templateVars = selected?.template.match(/\{\{(\w+)\}\}/g)?.map(v => v.replace(/[{}]/g, '')) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Wand2 className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Prompt Studio</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader><CardTitle>Prompts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {prompts.map(p => (
              <div
                key={p.id}
                className={`p-2 rounded border cursor-pointer hover:bg-muted ${selected?.id === p.id ? 'border-primary' : ''}`}
                onClick={() => setSelected(p)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{p.name}</span>
                  <Badge variant="secondary">v{p.version}</Badge>
                </div>
              </div>
            ))}
            {prompts.length === 0 && <p className="text-muted-foreground text-xs">No prompts yet.</p>}
            <div className="border-t pt-3 mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">New Prompt</p>
              <Input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="text-sm" />
              <textarea
                className="w-full border rounded p-2 text-sm font-mono min-h-[60px]"
                placeholder="Template with {{variables}}"
                value={form.template}
                onChange={e => setForm(f => ({ ...f, template: e.target.value }))}
              />
              <Button size="sm" onClick={() => createMut.mutate()} disabled={createMut.isPending || !form.name || !form.template}>
                Create
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{selected ? selected.name : 'Select a prompt'}</span>
              {selected && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateMut.mutate()} disabled={updateMut.isPending}><Save className="h-3 w-3 mr-1" />Save</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteMut.mutate(selected.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected ? (
              <>
                <textarea
                  className="w-full border rounded p-2 text-sm font-mono min-h-[120px]"
                  value={selected.template}
                  onChange={e => setSelected(s => s ? { ...s, template: e.target.value } : s)}
                />
                {templateVars.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Variables</p>
                    {templateVars.map(v => (
                      <div key={v} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground w-24">{'{{'}{v}{'}}'}</span>
                        <Input
                          placeholder={`Value for ${v}`}
                          value={varValues[v] || ''}
                          onChange={e => setVarValues(prev => ({ ...prev, [v]: e.target.value }))}
                          className="flex-1"
                        />
                      </div>
                    ))}
                    <Button size="sm" onClick={() => testMut.mutate()} disabled={testMut.isPending}>
                      <Play className="h-3 w-3 mr-1" />Test
                    </Button>
                  </div>
                )}
                {testResponse && (
                  <div className="p-3 bg-muted rounded text-sm">
                    <p className="font-medium mb-1">Response:</p>
                    <p>{testResponse}</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">Version {selected.version} · Updated {new Date(selected.updated_at).toLocaleDateString()}</div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Select a prompt from the sidebar to edit.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
