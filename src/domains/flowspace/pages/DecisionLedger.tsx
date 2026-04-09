import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Brain,
  User,
  Cpu,
  Filter,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Clock,
  Link2,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { flowspaceApi } from '../lib/flowspaceApi';
import type { DecisionRecord, DecisionRecordFilters, ActorType, DecisionDomain } from '../types';
import {
  DOMAIN_LABELS,
  ACTOR_TYPE_LABELS,
  ACTOR_TYPE_COLOURS,
} from '../types';

// ── Actor icon helper ─────────────────────────────────────────────────────────

function ActorIcon({ type }: { type: ActorType }) {
  if (type === 'ai')     return <Brain className="h-3.5 w-3.5" />;
  if (type === 'human')  return <User  className="h-3.5 w-3.5" />;
  return <Cpu className="h-3.5 w-3.5" />;
}

// ── Confidence bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground text-xs">—</span>;
  const pct = Math.round(score * 100);
  const colour = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums">{pct}%</span>
    </div>
  );
}

// ── Record detail drawer ──────────────────────────────────────────────────────

function RecordDetail({
  record,
  onClose,
  onViewLineage,
}: {
  record: DecisionRecord;
  onClose: () => void;
  onViewLineage: (id: string) => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${ACTOR_TYPE_COLOURS[record.actor_type]}`}>
              <ActorIcon type={record.actor_type} />
              {ACTOR_TYPE_LABELS[record.actor_type]}
            </span>
            <span className="font-mono text-sm">{record.action}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4 py-2">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Domain</p>
                <p>{DOMAIN_LABELS[record.domain] ?? record.domain}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Timestamp</p>
                <p className="font-mono text-xs">{format(new Date(record.created_at), 'PPpp')}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Actor</p>
                <p className="font-mono text-xs break-all">{record.actor_id}</p>
              </div>
              {record.model_version && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Model Version</p>
                  <p className="font-mono text-xs">{record.model_version}</p>
                </div>
              )}
              {record.confidence_score !== null && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Confidence</p>
                  <ConfidenceBar score={record.confidence_score} />
                </div>
              )}
              {record.entity_type && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Entity</p>
                  <p className="font-mono text-xs">{record.entity_type} / {record.entity_id}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Rationale */}
            {record.rationale && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Rationale</p>
                <p className="text-sm whitespace-pre-wrap">{record.rationale}</p>
              </div>
            )}

            {/* Context */}
            {record.context && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Context Snapshot</p>
                <pre className="rounded bg-muted p-3 text-xs overflow-auto max-h-40">
                  {JSON.stringify(record.context, null, 2)}
                </pre>
              </div>
            )}

            {/* Constraints */}
            {record.constraints && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Constraints Active</p>
                <pre className="rounded bg-muted p-3 text-xs overflow-auto max-h-32">
                  {JSON.stringify(record.constraints, null, 2)}
                </pre>
              </div>
            )}

            {/* Alternatives */}
            {record.alternatives && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Alternatives Considered</p>
                <pre className="rounded bg-muted p-3 text-xs overflow-auto max-h-32">
                  {JSON.stringify(record.alternatives, null, 2)}
                </pre>
              </div>
            )}

            {/* Lineage link */}
            {record.lineage_parent_id && (
              <div className="flex items-center gap-2 pt-1">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Caused by decision</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 font-mono text-xs"
                  onClick={() => onViewLineage(record.id)}
                >
                  {record.lineage_parent_id.slice(0, 8)}…
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-between pt-2 border-t mt-2">
          <Button variant="outline" size="sm" onClick={() => onViewLineage(record.id)}>
            <Link2 className="h-4 w-4 mr-1.5" />
            View Lineage
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Lineage viewer ────────────────────────────────────────────────────────────

function LineageViewer({ recordId, onClose }: { recordId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['flowspace-lineage', recordId],
    queryFn: () => flowspaceApi.getLineage(recordId),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Decision Lineage Chain</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="relative pl-4">
              {(data?.lineage ?? []).map((rec, idx) => (
                <div key={rec.id} className="flex items-start gap-3 pb-4 relative">
                  {idx < (data?.lineage.length ?? 0) - 1 && (
                    <div className="absolute left-[0.45rem] top-5 bottom-0 w-px bg-border" />
                  )}
                  <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{rec.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOMAIN_LABELS[rec.domain] ?? rec.domain} ·{' '}
                      {format(new Date(rec.created_at), 'PP HH:mm')}
                    </p>
                    {rec.rationale && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.rationale}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <div className="flex justify-end pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Decision Ledger page ─────────────────────────────────────────────────

export default function DecisionLedger() {
  const [filters, setFilters] = useState<DecisionRecordFilters>({ limit: 50 });
  const [searchAction, setSearchAction] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<DecisionRecord | null>(null);
  const [lineageRecordId, setLineageRecordId] = useState<string | null>(null);

  const activeFilters: DecisionRecordFilters = {
    ...filters,
    action: searchAction || undefined,
  };

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['flowspace-records', activeFilters],
    queryFn: () => flowspaceApi.listRecords(activeFilters),
    staleTime: 30_000,
  });

  const records = data?.records ?? [];
  const total   = data?.total ?? 0;

  const handleDomainChange = useCallback((val: string) => {
    setFilters(f => ({ ...f, domain: val === 'all' ? undefined : (val as DecisionDomain), skip: 0 }));
  }, []);

  const handleActorTypeChange = useCallback((val: string) => {
    setFilters(f => ({ ...f, actor_type: val === 'all' ? undefined : (val as ActorType), skip: 0 }));
  }, []);

  return (
    <div className="flex flex-col h-full gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">FlowSpace — Decision Ledger</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Persistent, immutable record of every significant decision made by humans, AI, and automated systems.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 w-52 text-sm"
            placeholder="Filter by action…"
            value={searchAction}
            onChange={e => setSearchAction(e.target.value)}
          />
        </div>

        <Select onValueChange={handleDomainChange}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Domain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All domains</SelectItem>
            {Object.entries(DOMAIN_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={handleActorTypeChange}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Actor type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actors</SelectItem>
            <SelectItem value="human">Human</SelectItem>
            <SelectItem value="ai">AI Model</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>

        <span className="ml-auto text-xs text-muted-foreground">
          {total.toLocaleString()} record{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load decision records</span>
        </div>
      ) : records.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Brain className="h-10 w-10 opacity-20" />
          <p className="text-sm">No decision records yet.</p>
          <p className="text-xs">Records appear automatically as decisions are made across the platform.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-48">Time</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Action</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-32">Domain</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-28">Actor</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-32">Confidence</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map(rec => (
                <tr
                  key={rec.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedRecord(rec)}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      <Clock className="h-3 w-3 shrink-0" />
                      {format(new Date(rec.created_at), 'PP HH:mm:ss')}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{rec.action}</span>
                      {rec.lineage_parent_id && (
                        <Link2 className="h-3 w-3 text-muted-foreground shrink-0" title="Has lineage parent" />
                      )}
                    </div>
                    {rec.rationale && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{rec.rationale}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary" className="text-xs font-normal">
                      {DOMAIN_LABELS[rec.domain] ?? rec.domain}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${ACTOR_TYPE_COLOURS[rec.actor_type]}`}>
                      <ActorIcon type={rec.actor_type} />
                      {ACTOR_TYPE_LABELS[rec.actor_type]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <ConfidenceBar score={rec.confidence_score} />
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

      {/* Pagination */}
      {total > (filters.limit ?? 50) && (
        <div className="flex items-center justify-between text-sm">
          <Button
            variant="outline" size="sm"
            disabled={!filters.skip || filters.skip <= 0}
            onClick={() => setFilters(f => ({ ...f, skip: Math.max(0, (f.skip ?? 0) - (f.limit ?? 50)) }))}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-xs">
            {(filters.skip ?? 0) + 1}–{Math.min((filters.skip ?? 0) + (filters.limit ?? 50), total)} of {total}
          </span>
          <Button
            variant="outline" size="sm"
            disabled={(filters.skip ?? 0) + (filters.limit ?? 50) >= total}
            onClick={() => setFilters(f => ({ ...f, skip: (f.skip ?? 0) + (f.limit ?? 50) }))}
          >
            Next
          </Button>
        </div>
      )}

      {/* Record detail dialog */}
      {selectedRecord && (
        <RecordDetail
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onViewLineage={(id) => { setSelectedRecord(null); setLineageRecordId(id); }}
        />
      )}

      {/* Lineage viewer */}
      {lineageRecordId && (
        <LineageViewer
          recordId={lineageRecordId}
          onClose={() => setLineageRecordId(null)}
        />
      )}
    </div>
  );
}
