import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Shield, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`/api/ai${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function govFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`/api/ai-governance${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface Policy { id: string; name: string; description: string; enabled: boolean; created_at: string; }
interface ModelReg { id: string; model_name: string; provider: string; feature: string; active: boolean; usage_count: number; }
interface AuditEntry { id: string; model: string; confidence: number; created_at: string; }
interface EUModel { id: string; name: string; risk_tier: string; intended_purpose: string; last_review_date: string; }
interface ChecklistItem { article: string; status: string; }
interface ComplianceReport { totalModels: number; byTier: Record<string, number>; overdueReview: EUModel[]; euAiActChecklist: ChecklistItem[]; }

const tierColor: Record<string, string> = {
  minimal: 'bg-green-100 text-green-800',
  limited: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  prohibited: 'bg-red-100 text-red-800',
};

const checklistIcon = (status: string) => {
  if (status === 'compliant') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
  if (status === 'partial') return <Clock className="w-4 h-4 text-yellow-600" />;
  return <AlertCircle className="w-4 h-4 text-red-600" />;
};

export default function AIGovernance() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [policyForm, setPolicyForm] = useState({ name: '', description: '' });
  const [reviewModel, setReviewModel] = useState<EUModel | null>(null);
  const [reviewForm, setReviewForm] = useState({ riskTier: 'minimal', justification: '' });

  const { data: policiesData } = useQuery({ queryKey: ['ai-policies'], queryFn: () => apiFetch('/governance/policies') });
  const { data: modelsData } = useQuery({ queryKey: ['ai-models'], queryFn: () => apiFetch('/governance/models') });
  const { data: logData } = useQuery({ queryKey: ['ai-audit-log'], queryFn: () => apiFetch('/governance/log') });
  const { data: euModelsData } = useQuery({ queryKey: ['eu-models'], queryFn: () => govFetch('/models') });
  const { data: complianceData } = useQuery<ComplianceReport>({ queryKey: ['compliance-report'], queryFn: () => govFetch('/compliance-report') });
  const { data: llmUsageData } = useQuery({ queryKey: ['llm-usage'], queryFn: () => govFetch('/llm-usage') });

  const createPolicyMut = useMutation({
    mutationFn: () => apiFetch('/governance/policies', { method: 'POST', body: JSON.stringify(policyForm) }),
    onSuccess: () => {
      toast({ title: 'Policy created' });
      qc.invalidateQueries({ queryKey: ['ai-policies'] });
      setPolicyForm({ name: '', description: '' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const setRiskTierMut = useMutation({
    mutationFn: () => govFetch(`/models/${reviewModel?.id}/risk-tier`, { method: 'PUT', body: JSON.stringify({ riskTier: reviewForm.riskTier, justification: reviewForm.justification }) }),
    onSuccess: () => {
      toast({ title: 'Risk tier updated' });
      qc.invalidateQueries({ queryKey: ['eu-models'] });
      qc.invalidateQueries({ queryKey: ['compliance-report'] });
      setReviewModel(null);
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const policies: Policy[] = policiesData?.policies || [];
  const models: ModelReg[] = modelsData?.models || [];
  const log: AuditEntry[] = logData?.log || [];
  const euModels: EUModel[] = euModelsData?.models || [];
  const compliance = complianceData;
  const llmUsage = llmUsageData;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-8 w-8" />
        <h1 className="text-3xl font-bold">AI Governance Console</h1>
      </div>

      <Tabs defaultValue="eu-ai-act">
        <TabsList>
          <TabsTrigger value="eu-ai-act">EU AI Act</TabsTrigger>
          <TabsTrigger value="models">Model Registry</TabsTrigger>
          <TabsTrigger value="llm-usage">LLM Usage</TabsTrigger>
          <TabsTrigger value="policies">Policy Rules</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="eu-ai-act" className="space-y-4">
          {compliance && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(compliance.byTier || {}).map(([tier, count]) => (
                <Card key={tier}><CardHeader className="pb-2"><CardTitle className="text-sm capitalize">{tier}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{String(count)}</p></CardContent></Card>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Model Risk Register</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Model</TableHead><TableHead>Purpose</TableHead><TableHead>Risk Tier</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {euModels.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-sm">{m.intended_purpose}</TableCell>
                        <TableCell><Badge className={tierColor[m.risk_tier] || 'bg-gray-100'}>{m.risk_tier}</Badge></TableCell>
                        <TableCell><Button size="sm" variant="outline" onClick={() => { setReviewModel(m); setReviewForm({ riskTier: m.risk_tier, justification: '' }); }}>Review</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>EU AI Act Checklist</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(compliance?.euAiActChecklist || []).map((item) => (
                  <div key={item.article} className="flex items-center gap-2 text-sm">
                    {checklistIcon(item.status)}
                    <span className="flex-1">{item.article}</span>
                    <Badge variant="outline" className="capitalize">{item.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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
                  {models.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No models registered.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="llm-usage">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Calls Today</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{llmUsage?.callsToday ?? 0}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Tokens Used</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{llmUsage?.tokenUsed?.toLocaleString() ?? 0}</p><p className="text-xs text-muted-foreground">of {llmUsage?.tokenLimit?.toLocaleString() ?? '1,000,000'} limit</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Content Flags</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{llmUsage?.contentFlags?.length ?? 0}</p></CardContent></Card>
          </div>
          {llmUsage?.contentFlags?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Content Safety Flags</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Endpoint</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {llmUsage.contentFlags.map((f: {timestamp: string; endpoint: string; flag_reason: string}, i: number) => (
                      <TableRow key={i}><TableCell>{new Date(f.timestamp).toLocaleString()}</TableCell><TableCell>{f.endpoint}</TableCell><TableCell><Badge variant="destructive">{f.flag_reason}</Badge></TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="policies">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Add Policy Rule</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Name</Label><Input value={policyForm.name} onChange={e => setPolicyForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><Label>Description</Label><Input value={policyForm.description} onChange={e => setPolicyForm(p => ({ ...p, description: e.target.value }))} /></div>
                <Button onClick={() => createPolicyMut.mutate()} disabled={!policyForm.name}>Add Policy</Button>
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

      <Dialog open={!!reviewModel} onOpenChange={() => setReviewModel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Risk Tier — {reviewModel?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Risk Tier</Label>
              <Select value={reviewForm.riskTier} onValueChange={v => setReviewForm(p => ({ ...p, riskTier: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="limited">Limited</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="prohibited">Prohibited</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Justification {(reviewForm.riskTier === 'high' || reviewForm.riskTier === 'prohibited') && <span className="text-red-500">*</span>}</Label>
              <Textarea value={reviewForm.justification} onChange={e => setReviewForm(p => ({ ...p, justification: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewModel(null)}>Cancel</Button>
            <Button onClick={() => setRiskTierMut.mutate()} disabled={(['high','prohibited'].includes(reviewForm.riskTier) && !reviewForm.justification) || setRiskTierMut.isPending}>
              {setRiskTierMut.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
