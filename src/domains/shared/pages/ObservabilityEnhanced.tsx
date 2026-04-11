import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, GitBranch, CheckCircle2, AlertTriangle } from "lucide-react";

const mockTraces = [
  { id: "tr1", service: "api-gateway", operation: "POST /api/dex/contexts", duration_ms: 142, status: "ok", timestamp: "2024-01-10T10:30:00Z", spans: 8 },
  { id: "tr2", service: "api-gateway", operation: "GET /api/assets/at-risk", duration_ms: 382, status: "ok", timestamp: "2024-01-10T10:29:45Z", spans: 12 },
  { id: "tr3", service: "api-gateway", operation: "POST /api/ml/train", duration_ms: 2840, status: "error", timestamp: "2024-01-10T10:28:10Z", spans: 5 },
];

const mockSLOs = [
  { name: "API P99 Latency < 500ms", target: 99.9, current: 99.7, burn_rate_1h: 0.8, burn_rate_6h: 0.6, status: "ok" },
  { name: "Error Rate < 0.1%", target: 99.9, current: 99.92, burn_rate_1h: 0.3, burn_rate_6h: 0.2, status: "ok" },
  { name: "Availability > 99.5%", target: 99.5, current: 99.1, burn_rate_1h: 2.4, burn_rate_6h: 1.8, status: "warning" },
];

const mockServiceMap = [
  { from: "api-gateway", to: "db-adapter", calls_per_min: 420 },
  { from: "api-gateway", to: "ml-service", calls_per_min: 28 },
  { from: "api-gateway", to: "cache", calls_per_min: 840 },
  { from: "ml-service", to: "db-adapter", calls_per_min: 15 },
];

export default function ObservabilityEnhanced() {
  const [tab, setTab] = useState("traces");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Observability</h1>
        <p className="text-muted-foreground">Distributed traces, service map and SLO burn rates</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="traces">Traces</TabsTrigger>
          <TabsTrigger value="slos">SLO Status</TabsTrigger>
          <TabsTrigger value="map">Service Map</TabsTrigger>
        </TabsList>
        <TabsContent value="traces" className="space-y-2 mt-4">
          {mockTraces.map(t => (
            <Card key={t.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm font-mono">{t.operation}</p>
                    <p className="text-xs text-muted-foreground">{t.service} · {t.spans} spans · {new Date(t.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${t.duration_ms > 500 ? "text-red-600" : t.duration_ms > 200 ? "text-amber-600" : "text-green-600"}`}>{t.duration_ms}ms</span>
                  <Badge variant={t.status === "ok" ? "default" : "destructive"}>{t.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="slos" className="space-y-3 mt-4">
          {mockSLOs.map(s => (
            <Card key={s.name}>
              <CardContent className="py-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      {s.status === "ok" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      {s.name}
                    </p>
                    <p className="text-xs text-muted-foreground ml-6">Target: {s.target}% · Current: {s.current}%</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-muted-foreground">Burn 1h: <span className={s.burn_rate_1h > 1 ? "text-red-600 font-medium" : "text-green-600"}>{s.burn_rate_1h}x</span></p>
                    <p className="text-muted-foreground">Burn 6h: <span className={s.burn_rate_6h > 1 ? "text-red-600 font-medium" : "text-green-600"}>{s.burn_rate_6h}x</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="map" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4" />Service Dependency Map</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">From</th><th className="text-left pb-2">To</th><th className="text-right pb-2">Calls/min</th></tr></thead>
                <tbody>{mockServiceMap.map((m, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{m.from}</td>
                    <td className="font-mono text-xs">→ {m.to}</td>
                    <td className="text-right">{m.calls_per_min}</td>
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
