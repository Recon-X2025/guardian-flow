import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Zap, BarChart3, PlusCircle } from "lucide-react";

const mockModels = [
  { id: "m1", name: "Churn Predictor", type: "classification", architecture: "transformer", version: "2.1.0", accuracy: 0.912, latency_ms: 42, calls_24h: 8420, status: "active" },
  { id: "m2", name: "Anomaly Detector", type: "unsupervised", architecture: "autoencoder", version: "1.4.0", accuracy: 0.887, latency_ms: 18, calls_24h: 24100, status: "active" },
  { id: "m3", name: "Demand Forecaster", type: "regression", architecture: "lstm", version: "3.0.0", accuracy: 0.934, latency_ms: 95, calls_24h: 1820, status: "active" },
  { id: "m4", name: "NLP Classifier", type: "classification", architecture: "bert", version: "1.0.0", accuracy: null, latency_ms: null, calls_24h: 0, status: "staging" },
];

const statusColor: Record<string, "default" | "secondary"> = { active: "default", staging: "secondary", deprecated: "secondary" };

export default function NeuroConsole() {
  const [tab, setTab] = useState("registry");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Brain className="h-6 w-6" />Neuro Console</h1>
          <p className="text-muted-foreground">Neural model registry, inference playground and performance metrics</p>
        </div>
        <Button size="sm"><PlusCircle className="h-4 w-4 mr-2" />Register Model</Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="registry">Model Registry</TabsTrigger>
          <TabsTrigger value="inference">Inference</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>
        <TabsContent value="registry" className="space-y-2 mt-4">
          {mockModels.map(m => (
            <Card key={m.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2"><Brain className="h-4 w-4" />{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.type} · {m.architecture} · v{m.version}</p>
                </div>
                <div className="flex items-center gap-2">
                  {m.accuracy && <span className="text-xs font-medium text-green-600">Acc: {(m.accuracy * 100).toFixed(1)}%</span>}
                  {m.latency_ms && <span className="text-xs text-muted-foreground">{m.latency_ms}ms</span>}
                  <Badge variant={statusColor[m.status]}>{m.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="inference" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" />Inference Playground</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Select a model and provide input to run inference.</p>
              <Button><Zap className="h-4 w-4 mr-2" />Run Inference</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="metrics" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />24h Performance</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">Model</th><th className="text-right pb-2">Calls</th><th className="text-right pb-2">Latency</th><th className="text-right pb-2">Accuracy</th></tr></thead>
                <tbody>{mockModels.filter(m => m.calls_24h > 0).map(m => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2">{m.name}</td>
                    <td className="text-right">{m.calls_24h.toLocaleString()}</td>
                    <td className="text-right">{m.latency_ms}ms</td>
                    <td className="text-right text-green-600">{m.accuracy ? `${(m.accuracy * 100).toFixed(1)}%` : "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
