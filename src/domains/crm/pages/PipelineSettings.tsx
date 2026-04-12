import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Link } from 'react-router-dom';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PipelineStage {
  id: string;
  name: string;
  position: number;
  colour: string;
  is_default: boolean;
}

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

async function createStage(name: string, colour: string): Promise<PipelineStage> {
  const res = await fetch('/api/crm/pipeline-stages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ name, colour }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to create stage');
  return (await res.json()).stage;
}

async function updateStage(id: string, updates: Partial<PipelineStage>): Promise<PipelineStage> {
  const res = await fetch(`/api/crm/pipeline-stages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to update stage');
  return (await res.json()).stage;
}

async function deleteStage(id: string): Promise<void> {
  const res = await fetch(`/api/crm/pipeline-stages/${id}`, { method: 'DELETE', headers: authHeader() });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to delete stage');
}

async function reorderStages(positions: { id: string; position: number }[]): Promise<void> {
  const res = await fetch('/api/crm/pipeline-stages/reorder', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ positions }),
  });
  if (!res.ok) throw new Error('Failed to reorder stages');
}

// ── SortableStageRow ──────────────────────────────────────────────────────────

function SortableStageRow({
  stage, onEdit, onDelete,
}: {
  stage: PipelineStage; onEdit: (s: PipelineStage) => void; onDelete: (s: PipelineStage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <tr ref={setNodeRef} style={style} className="border-b last:border-0">
      <td className="px-3 py-2 w-8">
        <span {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </span>
      </td>
      <td className="px-3 py-2">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: stage.colour }} />
          {stage.name}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">{stage.position}</td>
      <td className="px-3 py-2">
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => onEdit(stage)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(stage)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── StageDialog ───────────────────────────────────────────────────────────────

function StageDialog({
  open, onClose, existing,
}: {
  open: boolean; onClose: () => void; existing?: PipelineStage | null;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName]     = useState(existing?.name ?? '');
  const [colour, setColour] = useState(existing?.colour ?? '#6366f1');

  const createMut = useMutation({
    mutationFn: () => createStage(name.trim(), colour),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-stages'] }); toast({ title: 'Stage created' }); onClose(); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const updateMut = useMutation({
    mutationFn: () => updateStage(existing!.id, { name: name.trim(), colour }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-stages'] }); toast({ title: 'Stage updated' }); onClose(); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  function handleSubmit() {
    if (!name.trim()) return toast({ title: 'Stage name is required', variant: 'destructive' });
    if (existing) updateMut.mutate();
    else createMut.mutate();
  }
  const busy = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{existing ? 'Edit Stage' : 'New Stage'}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Stage Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>Colour</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={colour}
                onChange={e => setColour(e.target.value)}
                className="h-9 w-16 rounded border cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">{colour}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy}>{busy ? 'Saving…' : existing ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── PipelineSettings page ─────────────────────────────────────────────────────

export default function PipelineSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialog] = useState(false);
  const [editing, setEditing]   = useState<PipelineStage | null>(null);

  const { data: stages = [], isLoading } = useQuery({ queryKey: ['crm-stages'], queryFn: fetchStages });

  const deleteMut = useMutation({
    mutationFn: deleteStage,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-stages'] }); toast({ title: 'Stage deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const reorderMut = useMutation({
    mutationFn: reorderStages,
    onError: (e: Error) => toast({ title: 'Reorder failed', description: e.message, variant: 'destructive' }),
  });

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIdx = stages.findIndex(s => s.id === active.id);
    const newIdx = stages.findIndex(s => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(stages, oldIdx, newIdx);
    const positions = reordered.map((s, i) => ({ id: s.id, position: i + 1 }));

    // Optimistic update
    qc.setQueryData(['crm-stages'], reordered.map((s, i) => ({ ...s, position: i + 1 })));
    reorderMut.mutate(positions);
  }

  function openNew()              { setEditing(null); setDialog(true); }
  function openEdit(s: PipelineStage) { setEditing(s); setDialog(true); }

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/crm/pipeline"><ArrowLeft className="h-4 w-4 mr-1" />Pipeline</Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Pipeline Stage Settings</h1>
          <p className="text-muted-foreground text-sm">Drag to reorder stages. Changes apply to all deals.</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Stage</Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Stages ({stages.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading…</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Position</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map(s => (
                      <SortableStageRow
                        key={s.id}
                        stage={s}
                        onEdit={openEdit}
                        onDelete={() => deleteMut.mutate(s.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <StageDialog open={dialogOpen} onClose={() => setDialog(false)} existing={editing} />
    </div>
  );
}
