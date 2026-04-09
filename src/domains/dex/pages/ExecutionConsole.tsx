import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Circle,
  XCircle,
  Clock,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { dexApi } from '../lib/dexApi';
import type { ExecutionContext, ExecutionStage, Checkpoint } from '../types';
import {
  STAGE_LABELS,
  STAGE_COLOURS,
  TERMINAL_STAGES,
  STAGE_ORDER,
} from '../types';

// ── Stage icon ─────────────────────────────────────────────────────────────────

function StageIcon({ stage }: { stage: ExecutionStage }) {
  if (stage === 'completed' || stage === 'closed') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (stage === 'failed')    return <XCircle       className="h-4 w-4 text-red-500" />;
  if (stage === 'cancelled') return <XCircle       className="h-4 w-4 text-gray-400" />;
  if (stage === 'pending_review') return <AlertTriangle className="h-4 w-4 text-orange-500" />;
  if (stage === 'in_progress')    return <Activity  className="h-4 w-4 text-amber-500" />;
  return <Circle className="h-4 w-4 text-slate-400" />;
}

// ── Stage progress bar ─────────────────────────────────────────────────────────

function StageProgress({ stage }: { stage: ExecutionStage }) {
  const idx = STAGE_ORDER.indexOf(stage);
  const pct = idx === -1 ? 0 : Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
  const isTerminalBad = stage === 'failed' || stage === 'cancelled';

  return (
    <div className="h-1 w-24 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${isTerminalBad ? 'bg-red-400' : 'bg-primary'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Checkpoint badge ───────────────────────────────────────────────────────────

function CheckpointBadge({ checkpoints }: { checkpoints: Checkpoint[] }) {
  const pending = checkpoints.filter(c => c.status === 'pending').length;
  if (pending === 0) return null;
  return (
    <Badge variant="destructive" className="text-xs">
      {pending} checkpoint{pending !== 1 ? 's' : ''} pending
    </Badge>
  );
}

// ── Context detail ─────────────────────────────────────────────────────────────

function ContextDetail({
  context,
  onClose,
}: {
  context: ExecutionContext;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <StageIcon stage={context.current_stage} />
            <span className="font-mono text-sm truncate">{context.entity_type}/{context.entity_id}</span>
            <span className={`ml-auto inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STAGE_COLOURS[context.current_stage]}`}>
              {STAGE_LABELS[context.current_stage]}
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4 py-2 text-sm">
            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Flow ID</p>
                <p className="font-mono text-xs">{context.flow_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Context ID</p>
                <p className="font-mono text-xs">{context.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Created</p>
                <p className="font-mono text-xs">{format(new Date(context.created_at), 'PP HH:mm')}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Last Updated</p>
                <p className="font-mono text-xs">{format(new Date(context.updated_at), 'PP HH:mm')}</p>
              </div>
            </div>

            {/* Checkpoints */}
            {context.checkpoints.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-2">
                    Human Checkpoints ({context.checkpoints.length})
                  </p>
                  <div className="space-y-2">
                    {context.checkpoints.map(cp => (
                      <div key={cp.id} className="flex items-start gap-2 rounded border p-2">
                        {cp.status === 'pending'
                          ? <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                          : <CheckCircle2  className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{cp.description}</p>
                          {cp.resolution && (
                            <p className="text-xs text-muted-foreground">
                              Resolved: <span className="font-medium capitalize">{cp.resolution}</span>
                              {cp.notes && ` — ${cp.notes}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Execution trace */}
            <Separator />
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-2">
                Execution Trace ({context.execution_trace.length} events)
              </p>
              <div className="relative pl-4 space-y-3">
                {context.execution_trace.map((evt, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative">
                    {idx < context.execution_trace.length - 1 && (
                      <div className="absolute left-[0.4rem] top-5 bottom-0 w-px bg-border" />
                    )}
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background shrink-0" />
                    <div className="min-w-0">
                      {evt.from_stage && evt.to_stage ? (
                        <p className="text-xs font-medium">
                          {STAGE_LABELS[evt.from_stage]} → {STAGE_LABELS[evt.to_stage]}
                        </p>
                      ) : evt.signal ? (
                        <p className="text-xs font-medium">Signal: {evt.signal.signal_type}</p>
                      ) : (
                        <p className="text-xs font-medium">{evt.note ?? 'Event'}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(evt.timestamp), 'PP HH:mm:ss')}
                        {evt.actor_id && ` · ${evt.actor_id}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Accumulated context */}
            {Object.keys(context.accumulated_context).length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Accumulated Context</p>
                  <pre className="rounded bg-muted p-3 text-xs overflow-auto max-h-32">
                    {JSON.stringify(context.accumulated_context, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Execution Console ─────────────────────────────────────────────────────

export default function ExecutionConsole() {
  const [stageFilter, setStageFilter] = useState<string>('active');
  const [selectedContext, setSelectedContext] = useState<ExecutionContext | null>(null);

  const stageParam = stageFilter === 'active'
    ? undefined // fetch all non-terminal for 'active' — handled client-side
    : stageFilter === 'all'
    ? undefined
    : stageFilter;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dex-contexts', stageFilter],
    queryFn: () => dexApi.listContexts({ current_stage: stageParam, limit: 100 }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const contexts = (data?.contexts ?? []).filter(ctx => {
    if (stageFilter === 'active') return !TERMINAL_STAGES.includes(ctx.current_stage);
    return true;
  });

  const total = data?.total ?? 0;

  // Stats
  const stageStats = (data?.contexts ?? []).reduce<Partial<Record<ExecutionStage, number>>>((acc, ctx) => {
    acc[ctx.current_stage] = (acc[ctx.current_stage] ?? 0) + 1;
    return acc;
  }, {});

  const pendingCheckpoints = (data?.contexts ?? []).reduce(
    (sum, ctx) => sum + ctx.checkpoints.filter(c => c.status === 'pending').length,
    0,
  );

  return (
    <div className="flex flex-col h-full gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">DEX — Execution Console</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live view of all active execution contexts across the platform lifecycle.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Contexts</p>
          <p className="text-2xl font-bold mt-1">
            {(data?.contexts ?? []).filter(c => !TERMINAL_STAGES.includes(c.current_stage)).length}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Review</p>
          <p className="text-2xl font-bold mt-1 text-orange-500">{stageStats.pending_review ?? 0}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Human Checkpoints</p>
          <p className="text-2xl font-bold mt-1 text-red-500">{pendingCheckpoints}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Completed Today</p>
          <p className="text-2xl font-bold mt-1 text-green-500">
            {(data?.contexts ?? []).filter(c =>
              c.current_stage === 'completed' &&
              new Date(c.updated_at).toDateString() === new Date().toDateString(),
            ).length}
          </p>
        </div>
      </div>

      {/* Stage filter */}
      <div className="flex items-center gap-3">
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="all">All stages</SelectItem>
            {Object.entries(STAGE_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {contexts.length} of {total} contexts
        </span>
      </div>

      {/* Context list */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load execution contexts</span>
        </div>
      ) : contexts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Activity className="h-10 w-10 opacity-20" />
          <p className="text-sm">No execution contexts found.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Entity</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-40">Flow</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-40">Stage</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-36">Progress</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-48">Last Updated</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contexts.map(ctx => (
                <tr
                  key={ctx.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedContext(ctx)}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <StageIcon stage={ctx.current_stage} />
                      <div className="min-w-0">
                        <p className="font-medium capitalize">{ctx.entity_type}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{ctx.entity_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-muted-foreground truncate block max-w-[9rem]">
                      {ctx.flow_id}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium w-fit ${STAGE_COLOURS[ctx.current_stage]}`}>
                        {STAGE_LABELS[ctx.current_stage]}
                      </span>
                      <CheckpointBadge checkpoints={ctx.checkpoints} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <StageProgress stage={ctx.current_stage} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      <Clock className="h-3 w-3 shrink-0" />
                      {format(new Date(ctx.updated_at), 'PP HH:mm')}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Context detail dialog */}
      {selectedContext && (
        <ContextDetail
          context={selectedContext}
          onClose={() => setSelectedContext(null)}
        />
      )}
    </div>
  );
}
