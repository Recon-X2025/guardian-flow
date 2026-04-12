import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, History, PlayCircle } from "lucide-react";

const mockRules = [
  { id: "r1", asset_id: "ASSET-001", condition: { metric: "temperature", operator: ">", threshold: 85 }, action: { type: "create_work_order", priority: "high", description: "High temperature alert" }, active: true },
  { id: "r2", asset_id: "ASSET-002", condition: { metric: "pressure", operator: "<", threshold: 2.0 }, action: { type: "notify", priority: "medium", description: "Low pressure warning" }, active: true },
  { id: "r3", asset_id: "ASSET-003", condition: { metric: "vibration", operator: ">", threshold: 10 }, action: { type: "create_work_order", priority: "critical", description: "Excessive vibration" }, active: false },
];

const mockHistory = [
  { id: "h1", rule_id: "r1", triggered_at: "2024-01-10T08:15:00Z", asset_id: "ASSET-001", result: "work_order_created", wo_id: "WO-5001" },
  { id: "h2", rule_id: "r2", triggered_at: "2024-01-09T14:22:00Z", asset_id: "ASSET-002", result: "notification_sent", wo_id: null },
];

const priorityColor: Record<string, "destructive" | "default" | "secondary"> = {
  critical: "destructive", high: "destructive", medium: "default", low: "secondary",
};

export default function MaintenanceTriggers() {
  const [tab, setTab] = useState("rules");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance Triggers</h1>
          <p className="text-muted-foreground">Condition-based automatic maintenance rule engine</p>
        </div>
        <Button size="sm"><Zap className="h-4 w-4 mr-2" />New Rule</Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="rules">Trigger Rules</TabsTrigger>
          <TabsTrigger value="evaluate">Evaluate</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="space-y-3 mt-4">
          {mockRules.map(r => (
            <Card key={r.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{r.asset_id} — {r.condition.metric} {r.condition.operator} {r.condition.threshold}</p>
                  <p className="text-xs text-muted-foreground">Action: {r.action.type} · {r.action.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={priorityColor[r.action.priority] ?? "secondary"}>{r.action.priority}</Badge>
                  <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "active" : "inactive"}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="evaluate" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Evaluate Conditions</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Run evaluation against latest IoT telemetry to find triggered rules.</p>
              <Button><PlayCircle className="h-4 w-4 mr-2" />Run Evaluation</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground border-b"><th className="text-left pb-2">Asset</th><th className="text-left pb-2">Triggered</th><th className="text-left pb-2">Result</th><th className="text-left pb-2">WO</th></tr></thead>
                <tbody>{mockHistory.map(h => (<tr key={h.id} className="border-b last:border-0"><td className="py-2">{h.asset_id}</td><td>{new Date(h.triggered_at).toLocaleString()}</td><td>{h.result}</td><td>{h.wo_id ?? "—"}</td></tr>))}</tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
