import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Shield } from 'lucide-react';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`/api/ai${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface Policy { id: string; name: string; description: string; enabled: boolean; created_at: string; }
interface ModelReg { id: string; model_name: string; provider: string; feature: string; active: boolean; usage_count: number; }
interface AuditEntry { id: string; model: string; confidence: number; created_at: string; }

export default function AIGovernance() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [policyForm, setPolicyForm] = useState({ name: '', description: '' });

  const { data: policiesData } = useQuery({ queryKey: ['ai-policies'], queryFn: () => apiFetch('/governance/policies') });
  const { data: modelsData } = useQuery({ queryKey: ['ai-models'], queryFn: () => apiFetch('/governance/models') });
  const { data: logData } = useQuery({ queryKey: ['ai-audit-log'], queryFn: () => apiFetch('/governance/log') });

  const createPolicyMut = useMutation({
    mutationFn: () => apiFetch('/governance/policies', { method: 'POST', body: JSON.stringify(policyForm) }),
    onSuccess: () => {
      toast({ title: 'Policy created' });
      qc.invalidateQueries({ queryKey: ['ai-policies'] });
      setPolicyForm({ name: '', description: '' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const policies: Policy[] = policiesData?.policies || [];
  const models: ModelReg[] = modelsData?.models || [];
  const log: AuditEntry[] = logData?.log || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-8 w-8" />
        <h1 className="text-3xl font-bold">AI Governance Console</h1>
      </div>

      <Tabs defaultValue="models">
        <TabsList>
          <TabsTrigger value="models">Model Registry</TabsTrigger>
          <TabsTrigger value="policies">Policy Rules</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="models">
          <Card>
            <CardHeader><CardTitle>Registered Models</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{m.model_name}</TableCell>
                      <TableCell>{m.provider}</TableCell>
                      <TableCell>{m.feature}</TableCell>
                      <TableCell><Badge variant={m.active ? 'default' : 'secondary'}>{m.active ? 'active' : 'inactive'}</Badge></TableCell>
                      <TableCell>{m.usage_count || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Add Policy</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Policy name" value={policyForm.name} onChange={e => setPolicyForm(f => ({ ...f, name: e.target.value }))} />
                <Input placeholder="Description" value={policyForm.description} onChange={e => setPolicyForm(f => ({ ...f, description: e.target.value }))} />
                <Button onClick={() => createPolicyMut.mutate()} disabled={createPolicyMut.isPending || !policyForm.name}>
                  Create Policy
                </Button>
              </CardContent>
            </Card>
            <div className="space-y-2">
              {policies.map(p => (
                <Card key={p.id}>
                  <CardContent className="pt-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                    </div>
                    <Badge variant={p.enabled ? 'default' : 'secondary'}>{p.enabled ? 'enabled' : 'disabled'}</Badge>
                  </CardContent>
                </Card>
              ))}
              {policies.length === 0 && <p className="text-muted-foreground text-sm">No policies yet.</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle>Audit Log</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.model}</TableCell>
                      <TableCell>{entry.confidence != null ? `${(entry.confidence * 100).toFixed(0)}%` : 'N/A'}</TableCell>
                      <TableCell>{new Date(entry.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {log.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No audit entries.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
