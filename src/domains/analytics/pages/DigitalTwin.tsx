import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, GitBranch, Clock, Play } from "lucide-react";
import { useToast } from "@/domains/shared/hooks/use-toast";

interface Twin {
  id: string;
  asset_id: string;
  current_state: Record<string, number | string>;
  updated_at?: string;
  last_synced_at?: string;
}

interface SimStep {
  step: number;
  state: Record<string, number | string>;
}

interface AlertProjected {
  step: number;
  metric: string;
  value: number;
  rule: string;
}

interface SimResult {
  trajectory: SimStep[];
  alertsProjected: AlertProjected[];
}

export default function DigitalTwin() {
  const [tab, setTab] = useState("models");
  const [selected, setSelected] = useState<string | null>(null);
  const [simInputs, setSimInputs] = useState<Record<string, string>>({});
  const [simSteps, setSimSteps] = useState("10");
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: twinsData, isLoading } = useQuery({
    queryKey: ["digital-twins"],
    queryFn: async () => {
      const res = await fetch("/api/digital-twin/twins");
      if (!res.ok) throw new Error("Failed to load twins");
      return res.json();
    },
  });

  const simulateMutation = useMutation({
    mutationFn: async ({ id, inputChanges, timesteps }: { id: string; inputChanges: Record<string, number>; timesteps: number }) => {
      const res = await fetch(`/api/digital-twin/twins/${id}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputChanges, timesteps }),
      });
      if (!res.ok) throw new Error("Simulation failed");
      return res.json() as Promise<SimResult>;
    },
    onSuccess: (data) => setSimResult(data),
    onError: (err: Error) => toast({ title: "Simulation error", description: err.message, variant: "destructive" }),
  });

  const twins: Twin[] = twinsData?.twins || [];
  const twin = twins.find(t => t.id === selected);

  function runSimulation() {
    if (!selected) return;
    const inputChanges: Record<string, number> = {};
    for (const [k, v] of Object.entries(simInputs)) {
      const n = parseFloat(v);
      if (!isNaN(n)) inputChanges[k] = n;
    }
    simulateMutation.mutate({ id: selected, inputChanges, timesteps: parseInt(simSteps, 10) || 10 });
  }

  // Build sparkline SVG for trajectory of first numeric metric
  function buildSparkline(trajectory: SimStep[]): string {
    if (trajectory.length === 0) return "";
    const firstKey = Object.keys(trajectory[0].state).find(k => typeof trajectory[0].state[k] === "number");
    if (!firstKey) return "";
    const vals = trajectory.map(s => s.state[firstKey] as number);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const w = 300; const h = 60;
    const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
    return `<polyline points="${pts}" fill="none" stroke="hsl(var(--primary))" stroke-width="2"/>`;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Digital Twin</h1>
          <p className="text-muted-foreground">Live digital representations of physical assets</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="models">Twins</TabsTrigger>
          <TabsTrigger value="state">State Viewer</TabsTrigger>
          <TabsTrigger value="simulate">Simulate</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-3 mt-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading twins…</p>}
          {twins.length === 0 && !isLoading && (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No digital twins found.</CardContent></Card>
          )}
          {twins.map(t => (
            <Card key={t.id} className={`cursor-pointer transition-shadow ${selected === t.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelected(t.id)}>
              <CardContent className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2"><GitBranch className="h-4 w-4" />Asset: {t.asset_id}</p>
                  <p className="text-xs text-muted-foreground">{Object.keys(t.current_state || {}).length} metrics tracked</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {t.updated_at && <><Clock className="h-3 w-3" />{new Date(t.updated_at).toLocaleString()}</>}
                  <Badge variant="default" className="ml-1">active</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="state" className="mt-4">
          {twin ? (
            <Card>
              <CardHeader><CardTitle className="text-sm">Asset {twin.asset_id} — Current State</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">Metric</th><th className="text-right pb-2">Value</th></tr></thead>
                  <tbody>
                    {Object.entries(twin.current_state || {}).map(([k, v]) => (
                      <tr key={k} className="border-b last:border-0">
                        <td className="py-2 capitalize">{k.replace(/_/g, " ")}</td>
                        <td className="text-right font-mono">{String(v)}</td>
                      </tr>
                    ))}
                    {Object.keys(twin.current_state || {}).length === 0 && (
                      <tr><td colSpan={2} className="py-4 text-center text-muted-foreground">No state data yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="pt-4 text-sm text-muted-foreground">Select a twin to view its state.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="simulate" className="mt-4 space-y-4">
          {!selected ? (
            <Card><CardContent className="py-6 text-sm text-muted-foreground text-center">Select a twin from the Twins tab first.</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-sm">Simulation Inputs — {selected}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {Object.keys(twin?.current_state || {}).filter(k => typeof (twin?.current_state || {})[k] === "number").map(k => (
                      <div key={k} className="space-y-1">
                        <Label className="capitalize">{k.replace(/_/g, " ")}</Label>
                        <Input
                          type="number"
                          placeholder={String((twin?.current_state || {})[k])}
                          value={simInputs[k] || ""}
                          onChange={e => setSimInputs(p => ({ ...p, [k]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <Label>Timesteps</Label>
                      <Input type="number" className="w-24" value={simSteps} onChange={e => setSimSteps(e.target.value)} min={1} max={100} />
                    </div>
                    <Button className="mt-5" onClick={runSimulation} disabled={simulateMutation.isPending}>
                      <Play className="h-4 w-4 mr-2" />
                      {simulateMutation.isPending ? "Running…" : "Simulate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {simResult && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Trajectory</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <svg viewBox="0 0 300 60" className="w-full h-16 border rounded bg-muted/20"
                      dangerouslySetInnerHTML={{ __html: buildSparkline(simResult.trajectory) }} />
                    {simResult.alertsProjected.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-destructive">Projected Alerts</p>
                        {simResult.alertsProjected.map((a, i) => (
                          <p key={i} className="text-xs text-muted-foreground">Step {a.step}: {a.metric} = {a.value} ({a.rule})</p>
                        ))}
                      </div>
                    )}
                    {simResult.alertsProjected.length === 0 && (
                      <p className="text-xs text-muted-foreground">No threshold violations projected.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
