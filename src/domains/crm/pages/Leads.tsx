import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Plus, Search, Zap, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  title?: string;
  source?: string;
  interest_level?: string;
  budget_estimate?: number;
  timeline_weeks?: number;
  status: string;
  score: number;
  converted: boolean;
  converted_deal_id?: string;
  notes?: string;
  created_at: string;
}

type LeadForm = {
  first_name: string; last_name: string; email: string; phone: string;
  company_name: string; title: string; source: string; interest_level: string;
  budget_estimate: string; timeline_weeks: string; notes: string;
};

const EMPTY_FORM: LeadForm = {
  first_name: '', last_name: '', email: '', phone: '',
  company_name: '', title: '', source: '', interest_level: '',
  budget_estimate: '', timeline_weeks: '', notes: '',
};

// ── API helpers ───────────────────────────────────────────────────────────────

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchLeads(): Promise<Lead[]> {
  const res = await fetch('/api/crm/leads', { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch leads');
  return (await res.json()).leads ?? [];
}

async function createLead(form: LeadForm): Promise<Lead> {
  const body = {
    ...form,
    budget_estimate: form.budget_estimate ? parseFloat(form.budget_estimate) : undefined,
    timeline_weeks:  form.timeline_weeks  ? parseInt(form.timeline_weeks)    : undefined,
    source:          form.source          || undefined,
    interest_level:  form.interest_level  || undefined,
  };
  const res = await fetch('/api/crm/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to create lead');
  return (await res.json()).lead;
}

async function updateLead(id: string, form: Partial<LeadForm & { status: string }>): Promise<Lead> {
  const body = { ...form };
  if (form.budget_estimate !== undefined) (body as Record<string, unknown>).budget_estimate = form.budget_estimate ? parseFloat(form.budget_estimate as string) : undefined;
  if (form.timeline_weeks  !== undefined) (body as Record<string, unknown>).timeline_weeks  = form.timeline_weeks  ? parseInt(form.timeline_weeks  as string) : undefined;
  const res = await fetch(`/api/crm/leads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to update lead');
  return (await res.json()).lead;
}

async function deleteLead(id: string): Promise<void> {
  const res = await fetch(`/api/crm/leads/${id}`, { method: 'DELETE', headers: authHeader() });
  if (!res.ok) throw new Error('Failed to delete lead');
}

async function convertLead(id: string, dealTitle: string): Promise<void> {
  const res = await fetch(`/api/crm/leads/${id}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ deal_title: dealTitle }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to convert lead');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColour(score: number) {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-500';
}

function scoreBarColour(score: number) {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

const STATUS_COLOURS: Record<string, string> = {
  new:       'bg-blue-100 text-blue-800',
  contacted: 'bg-purple-100 text-purple-800',
  qualified: 'bg-amber-100 text-amber-800',
  converted: 'bg-green-100 text-green-800',
  lost:      'bg-red-100 text-red-800',
};

// ── LeadDialog ────────────────────────────────────────────────────────────────

function LeadDialog({ open, onClose, existing }: { open: boolean; onClose: () => void; existing?: Lead | null }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<LeadForm>(
    existing
      ? {
          first_name:      existing.first_name,
          last_name:       existing.last_name,
          email:           existing.email           ?? '',
          phone:           existing.phone           ?? '',
          company_name:    existing.company_name    ?? '',
          title:           existing.title           ?? '',
          source:          existing.source          ?? '',
          interest_level:  existing.interest_level  ?? '',
          budget_estimate: existing.budget_estimate != null ? String(existing.budget_estimate) : '',
          timeline_weeks:  existing.timeline_weeks  != null ? String(existing.timeline_weeks)  : '',
          notes:           existing.notes           ?? '',
        }
      : EMPTY_FORM,
  );
  const set = (k: keyof LeadForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  const createMut = useMutation({
    mutationFn: createLead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-leads'] }); toast({ title: 'Lead created' }); onClose(); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, form }: { id: string; form: LeadForm }) => updateLead(id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-leads'] }); toast({ title: 'Lead updated' }); onClose(); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  function handleSubmit() {
    if (!form.first_name.trim() || !form.last_name.trim())
      return toast({ title: 'first_name and last_name are required', variant: 'destructive' });
    if (existing) updateMut.mutate({ id: existing.id, form });
    else createMut.mutate(form);
  }
  const busy = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{existing ? 'Edit Lead' : 'New Lead'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div><Label>First Name *</Label><Input value={form.first_name} onChange={e => set('first_name', e.target.value)} /></div>
          <div><Label>Last Name *</Label><Input value={form.last_name} onChange={e => set('last_name', e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          <div><Label>Company</Label><Input value={form.company_name} onChange={e => set('company_name', e.target.value)} /></div>
          <div><Label>Title</Label><Input value={form.title} onChange={e => set('title', e.target.value)} /></div>
          <div>
            <Label>Source</Label>
            <Select value={form.source || '__none__'} onValueChange={v => set('source', v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Interest Level</Label>
            <Select value={form.interest_level || '__none__'} onValueChange={v => set('interest_level', v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Budget Estimate ($)</Label><Input type="number" min="0" value={form.budget_estimate} onChange={e => set('budget_estimate', e.target.value)} /></div>
          <div><Label>Timeline (weeks)</Label><Input type="number" min="0" value={form.timeline_weeks} onChange={e => set('timeline_weeks', e.target.value)} /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy}>{busy ? 'Saving…' : existing ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── ConvertDialog ─────────────────────────────────────────────────────────────

function ConvertDialog({ open, lead, onClose }: { open: boolean; lead: Lead | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dealTitle, setDealTitle] = useState('');

  const mut = useMutation({
    mutationFn: () => convertLead(lead!.id, dealTitle || `${lead!.company_name || lead!.first_name} — Deal`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
      qc.invalidateQueries({ queryKey: ['crm-accounts'] });
      qc.invalidateQueries({ queryKey: ['crm-contacts'] });
      toast({ title: 'Lead converted', description: 'Account, contact, and deal created.' });
      onClose();
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Convert Lead</DialogTitle></DialogHeader>
        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            Converting <strong>{lead?.first_name} {lead?.last_name}</strong> will create an Account, Contact, and a new Deal in the first pipeline stage.
          </p>
          <div>
            <Label>Deal Title</Label>
            <Input
              placeholder={`${lead?.company_name || lead?.first_name} — Deal`}
              value={dealTitle}
              onChange={e => setDealTitle(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? 'Converting…' : 'Convert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Leads page ────────────────────────────────────────────────────────────────

export default function Leads() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch]         = useState('');
  const [dialogOpen, setDialog]     = useState(false);
  const [editing, setEditing]       = useState<Lead | null>(null);
  const [converting, setConverting] = useState<Lead | null>(null);

  const { data: leads = [], isLoading } = useQuery({ queryKey: ['crm-leads'], queryFn: fetchLeads });

  const deleteMut = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-leads'] }); toast({ title: 'Lead deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const filtered = leads.filter(l =>
    !search ||
    `${l.first_name} ${l.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (l.company_name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  // Score stats
  const avgScore = leads.length ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0;
  const hotLeads = leads.filter(l => l.score >= 70 && !l.converted).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="h-6 w-6" /> Leads</h1>
          <p className="text-muted-foreground text-sm">
            {leads.length} lead{leads.length !== 1 ? 's' : ''} · Avg score: <strong>{avgScore}</strong> · Hot: <strong className="text-green-600">{hotLeads}</strong>
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Lead
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <span className="ml-auto text-sm text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No leads found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(l => (
                  <TableRow key={l.id} className={l.converted ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">{l.first_name} {l.last_name}</TableCell>
                    <TableCell className="text-sm">{l.company_name ?? '—'}</TableCell>
                    <TableCell>
                      {l.source ? <Badge variant="secondary" className="text-xs">{l.source}</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOURS[l.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {l.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${scoreBarColour(l.score)}`}
                            style={{ width: `${l.score}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${scoreColour(l.score)}`}>{l.score}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!l.converted && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Convert to Deal"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => setConverting(l)}
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(l); setDialog(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMut.mutate(l.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LeadDialog open={dialogOpen} onClose={() => setDialog(false)} existing={editing} />
      <ConvertDialog open={!!converting} lead={converting} onClose={() => setConverting(null)} />
    </div>
  );
}
