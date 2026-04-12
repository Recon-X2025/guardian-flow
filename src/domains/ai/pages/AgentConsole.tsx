/**
 * @file src/domains/ai/pages/AgentConsole.tsx
 * @description Agentic AI Console — submit goals, view agent runs and execution traces.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, Bot, Send, Zap, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { toast } from '@/domains/shared/hooks/use-toast';

interface TraceEntry {
  turn: number;
  tool: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
  status: 'success' | 'error';
  started_at: string;
  finished_at?: string;
}

interface AgentRun {
  id: string;
  goal: string;
  status: 'completed' | 'max_turns_exceeded' | 'error';
  turns_used: number;
  final_answer: string;
  trace: TraceEntry[];
  started_at: string;
  finished_at: string;
}

interface AgentRunSummary {
  id: string;
  goal: string;
  status: string;
  turns_used: number;
  started_at: string;
  finished_at: string;
}

interface Tool {
  name: string;
  description: string;
}

async function fetchRuns(): Promise<AgentRunSummary[]> {
  const res = await apiClient.request('/api/agent/runs');
  if (res.error) throw new Error(res.error.message);
  return (res.data as { runs: AgentRunSummary[] }).runs;
}

async function fetchTools(): Promise<Tool[]> {
  const res = await apiClient.request('/api/agent/tools');
  if (res.error) throw new Error(res.error.message);
  return (res.data as { tools: Tool[] }).tools;
}

async function fetchRun(id: string): Promise<AgentRun> {
  const res = await apiClient.request(`/api/agent/runs/${id}`);
  if (res.error) throw new Error(res.error.message);
  return res.data as AgentRun;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3 w-3" />Completed</Badge>;
  if (status === 'max_turns_exceeded') return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Max Turns</Badge>;
  return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />{status}</Badge>;
}

function TraceView({ trace }: { trace: TraceEntry[] }) {
  if (!trace.length) return <p className="text-muted-foreground text-sm">No tool calls made.</p>;
  return (
    <Accordion type="multiple" className="space-y-1">
      {trace.map((t, i) => (
        <AccordionItem key={i} value={String(i)} className="border rounded px-3">
          <AccordionTrigger className="text-sm py-2">
            <span className="flex items-center gap-2">
              <Zap className={`h-3 w-3 ${t.status === 'error' ? 'text-destructive' : 'text-primary'}`} />
              Turn {t.turn} — <code className="font-mono">{t.tool}</code>
              {t.status === 'error' && <Badge variant="destructive" className="text-xs ml-2">Error</Badge>}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pb-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Args</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">{JSON.stringify(t.args, null, 2)}</pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Result</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">{JSON.stringify(t.result, null, 2)}</pre>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default function AgentConsole() {
  const qc = useQueryClient();
  const [goal, setGoal] = useState('');
  const [dexContextId, setDexContextId] = useState('');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ['agent-runs'],
    queryFn: fetchRuns,
    refetchInterval: 5000,
  });

  const { data: tools = [] } = useQuery({ queryKey: ['agent-tools'], queryFn: fetchTools });

  const { data: runDetail } = useQuery({
    queryKey: ['agent-run', selectedRunId],
    queryFn: () => fetchRun(selectedRunId!),
    enabled: !!selectedRunId,
  });

  const runAgent = useMutation({
    mutationFn: async () => {
      const res = await apiClient.request('/api/agent/run', {
        method: 'POST',
        body: JSON.stringify({ goal, dex_context_id: dexContextId || undefined }),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data as AgentRun;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['agent-runs'] });
      setGoal('');
      toast({
        title: 'Agent run complete',
        description: `${data.turns_used} turn(s) · ${data.trace.length} tool call(s)`,
      });
    },
    onError: (e: Error) => toast({ title: 'Agent error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">Agentic AI Console</h1>
          <p className="text-muted-foreground text-sm">Autonomous goal-driven agents with tool calling + FlowSpace audit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Submit Goal</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Goal (natural language)</Label>
                <Input
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  placeholder="Schedule all open work orders for today and write a FlowSpace decision record"
                  className="mt-1"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && goal.trim().length >= 5 && !runAgent.isPending) {
                      runAgent.mutate();
                    }
                  }}
                />
              </div>
              <div>
                <Label>DEX Context ID (optional)</Label>
                <Input
                  value={dexContextId}
                  onChange={e => setDexContextId(e.target.value)}
                  placeholder="Attach agent to an existing execution context"
                  className="mt-1"
                />
              </div>
              <Button
                onClick={() => runAgent.mutate()}
                disabled={runAgent.isPending || goal.trim().length < 5}
                className="w-full"
              >
                {runAgent.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Running agent…</>
                  : <><Send className="h-4 w-4 mr-2" />Run Agent</>}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recent Runs</CardTitle></CardHeader>
            <CardContent>
              {runsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>
              ) : runs.length === 0 ? (
                <p className="text-muted-foreground text-sm py-6 text-center">No agent runs yet. Submit a goal above.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Goal</TableHead>
                      <TableHead>Turns</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map(r => (
                      <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRunId(r.id)}>
                        <TableCell className="max-w-[280px] truncate text-sm">{r.goal}</TableCell>
                        <TableCell>{r.turns_used}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(r.started_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle className="text-sm">Available Tools ({tools.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tools.map(t => (
                <div key={t.name} className="p-2 rounded border">
                  <p className="font-mono text-xs font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedRunId && runDetail && (
        <Dialog open onOpenChange={() => setSelectedRunId(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <StatusBadge status={runDetail.status} />
                <span className="truncate text-sm">{runDetail.goal}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {runDetail.final_answer && (
                <div className="p-3 bg-muted rounded text-sm">
                  <p className="font-semibold mb-1 text-xs text-muted-foreground">AGENT RESPONSE</p>
                  <p className="whitespace-pre-wrap">{runDetail.final_answer}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold mb-2">Execution Trace ({runDetail.trace.length} tool calls)</p>
                <TraceView trace={runDetail.trace} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
