import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, DollarSign, GripVertical, Settings } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Link } from 'react-router-dom';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PipelineStage {
  id: string;
  name: string;
  position: number;
  colour: string;
}

interface Account { id: string; company_name: string; }
interface Contact { id: string; first_name: string; last_name: string; }

interface Deal {
  id: string;
  title: string;
  stage_id: string | null;
  stage_name: string;
  value: number;
  currency: string;
  probability: number;
  account_id?: string;
  contact_id?: string;
  close_date?: string;
  notes?: string;
  created_at: string;
}

type DealForm = {
  title: string; account_id: string; contact_id: string; stage_id: string;
  value: string; currency: string; probability: string; close_date: string; notes: string;
};

// ── API helpers ───────────────────────────────────────────────────────────────

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchStages(): Promise<PipelineStage[]> {
  const res = await fetch('/api/crm/pipeline-stages', { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch stages');
  const data = await res.json();
  return (data.stages ?? []).sort((a: PipelineStage, b: PipelineStage) => a.position - b.position);
}

async function fetchDeals(): Promise<Deal[]> {
  const res = await fetch('/api/crm/deals', { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch deals');
  return (await res.json()).deals ?? [];
}

async function fetchAccounts(): Promise<Account[]> {
  const res = await fetch('/api/crm/accounts', { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch accounts');
  return (await res.json()).accounts ?? [];
}

async function fetchContacts(): Promise<Contact[]> {
  const res = await fetch('/api/crm/contacts', { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch contacts');
  return (await res.json()).contacts ?? [];
}

async function createDeal(form: DealForm): Promise<Deal> {
  const body = {
    title:       form.title,
    account_id:  form.account_id  || undefined,
    contact_id:  form.contact_id  || undefined,
    stage_id:    form.stage_id    || undefined,
    value:       parseFloat(form.value)       || 0,
    currency:    form.currency    || 'USD',
    probability: parseInt(form.probability)   || 10,
    close_date:  form.close_date  || undefined,
    notes:       form.notes       || undefined,
  };
  const res = await fetch('/api/crm/deals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to create deal');
  return (await res.json()).deal;
}

async function moveDeal(id: string, stage_id: string): Promise<void> {
  const res = await fetch(`/api/crm/deals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ stage_id }),
  });
  if (!res.ok) throw new Error('Failed to move deal');
}

// ── DealCard ─────────────────────────────────────────────────────────────────

function DealCard({ deal, accounts, isDragging = false }: { deal: Deal; accounts: Account[]; isDragging?: boolean }) {
  const accountName = accounts.find(a => a.id === deal.account_id)?.company_name;

  return (
    <div
      className={`bg-background border rounded-md p-3 shadow-sm space-y-1 cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-60' : 'opacity-100'}`}
    >
      <p className="text-sm font-medium leading-tight">{deal.title}</p>
      {accountName && <p className="text-xs text-muted-foreground">{accountName}</p>}
      <div className="flex items-center justify-between pt-1">
        <span className="flex items-center gap-0.5 text-xs font-semibold text-green-600">
          <DollarSign className="h-3 w-3" />
          {deal.value.toLocaleString()}
        </span>
        <Badge variant="outline" className="text-[10px] px-1.5">{deal.probability}%</Badge>
      </div>
    </div>
  );
}

// ── SortableDealCard ──────────────────────────────────────────────────────────

function SortableDealCard({ deal, accounts }: { deal: Deal; accounts: Account[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });
  const style = { transform: CSS.Translate.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard deal={deal} accounts={accounts} isDragging={isDragging} />
    </div>
  );
}

// ── StageColumn ───────────────────────────────────────────────────────────────

function StageColumn({
  stage, deals, accounts, totalValue,
}: {
  stage: PipelineStage; deals: Deal[]; accounts: Account[]; totalValue: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="flex flex-col min-w-[240px] max-w-[280px]">
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-md text-white text-sm font-semibold"
        style={{ backgroundColor: stage.colour }}
      >
        <span>{stage.name}</span>
        <Badge className="bg-white/20 text-white border-0 text-xs">{deals.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] p-2 rounded-b-md border border-t-0 space-y-2 transition-colors ${isOver ? 'bg-muted/60' : 'bg-muted/20'}`}
      >
        <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map(d => (
            <SortableDealCard key={d.id} deal={d} accounts={accounts} />
          ))}
        </SortableContext>
        {deals.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">Drop deals here</p>
        )}
      </div>
      <div className="px-3 py-1.5 text-xs text-muted-foreground border border-t-0 rounded-b-md bg-muted/10">
        Total: <span className="font-semibold">${totalValue.toLocaleString()}</span>
      </div>
    </div>
  );
}

// ── NewDealDialog ─────────────────────────────────────────────────────────────

function NewDealDialog({
  open, onClose, stages, accounts, contacts,
}: {
  open: boolean; onClose: () => void;
  stages: PipelineStage[]; accounts: Account[]; contacts: Contact[];
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const EMPTY: DealForm = {
    title: '', account_id: '', contact_id: '',
    stage_id: stages[0]?.id ?? '',
    value: '', currency: 'USD', probability: '10', close_date: '', notes: '',
  };
  const [form, setForm] = useState<DealForm>(EMPTY);
  const set = (k: keyof DealForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: createDeal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-deals'] }); toast({ title: 'Deal created' }); setForm(EMPTY); onClose(); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Deal</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label>Deal Title *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <Label>Pipeline Stage</Label>
            <Select value={form.stage_id} onValueChange={v => set('stage_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
              <SelectContent>
                {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Deal Value ($)</Label>
            <Input type="number" min="0" value={form.value} onChange={e => set('value', e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Account</Label>
            <Select value={form.account_id || '__none__'} onValueChange={v => set('account_id', v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Primary Contact</Label>
            <Select value={form.contact_id || '__none__'} onValueChange={v => set('contact_id', v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Probability (%)</Label>
            <Input type="number" min="0" max="100" value={form.probability} onChange={e => set('probability', e.target.value)} />
          </div>
          <div>
            <Label>Close Date</Label>
            <Input type="date" value={form.close_date} onChange={e => set('close_date', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>Cancel</Button>
          <Button onClick={() => { if (!form.title.trim()) return; mut.mutate(form); }} disabled={mut.isPending}>
            {mut.isPending ? 'Creating…' : 'Create Deal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Pipeline page ─────────────────────────────────────────────────────────────

export default function Pipeline() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [newDeal, setNewDeal]       = useState(false);
  const [activeId, setActiveId]     = useState<string | null>(null);

  const { data: stages   = [] } = useQuery({ queryKey: ['crm-stages'],   queryFn: fetchStages });
  const { data: deals    = [] } = useQuery({ queryKey: ['crm-deals'],    queryFn: fetchDeals });
  const { data: accounts = [] } = useQuery({ queryKey: ['crm-accounts'], queryFn: fetchAccounts });
  const { data: contacts = [] } = useQuery({ queryKey: ['crm-contacts'], queryFn: fetchContacts });

  const moveMut = useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) => moveDeal(id, stageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-deals'] }),
    onError: (e: Error) => toast({ title: 'Move failed', description: e.message, variant: 'destructive' }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const dealsByStage = useCallback(
    (stageId: string) => deals.filter(d => d.stage_id === stageId),
    [deals],
  );

  const stageTotal = (stageId: string) =>
    dealsByStage(stageId).reduce((s, d) => s + (d.value ?? 0), 0);

  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const dealId  = active.id as string;
    const deal    = deals.find(d => d.id === dealId);
    if (!deal) return;

    // over could be a stage column (droppable) or another deal (sortable inside same column)
    // Determine target stage: if over.id is a stage id → move there; else find stage of over deal
    const targetStage = stages.find(s => s.id === over.id);
    if (targetStage) {
      if (deal.stage_id !== targetStage.id) {
        // Optimistic update
        qc.setQueryData(['crm-deals'], (old: Deal[] | undefined) =>
          (old ?? []).map(d => d.id === dealId ? { ...d, stage_id: targetStage.id, stage_name: targetStage.name } : d),
        );
        moveMut.mutate({ id: dealId, stageId: targetStage.id });
      }
      return;
    }

    // over is another deal
    const overDeal = deals.find(d => d.id === over.id);
    if (overDeal && overDeal.stage_id && overDeal.stage_id !== deal.stage_id) {
      const newStageName = stages.find(s => s.id === overDeal.stage_id)?.name ?? deal.stage_name;
      qc.setQueryData(['crm-deals'], (old: Deal[] | undefined) =>
        (old ?? []).map(d => d.id === dealId ? { ...d, stage_id: overDeal.stage_id, stage_name: newStageName } : d),
      );
      moveMut.mutate({ id: dealId, stageId: overDeal.stage_id! });
    }
  }

  const totalPipeline = deals.reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM Pipeline</h1>
          <p className="text-muted-foreground text-sm">
            {deals.length} deal{deals.length !== 1 ? 's' : ''} · Total pipeline: <span className="font-semibold">${totalPipeline.toLocaleString()}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/crm/pipeline-settings"><Settings className="h-4 w-4 mr-1" />Stage Settings</Link>
          </Button>
          <Button size="sm" onClick={() => setNewDeal(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Deal
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-w-max">
            {stages.map(stage => (
              <StageColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStage(stage.id)}
                accounts={accounts}
                totalValue={stageTotal(stage.id)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeDeal ? <DealCard deal={activeDeal} accounts={accounts} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <NewDealDialog
        open={newDeal}
        onClose={() => setNewDeal(false)}
        stages={stages}
        accounts={accounts}
        contacts={contacts}
      />
    </div>
  );
}
