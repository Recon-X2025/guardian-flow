import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, GitBranch, Clock } from "lucide-react";

const mockTwins = [
  { id: "t1", asset_id: "ASSET-001", name: "Pump Station Alpha Twin", schema_version: "2.1", last_synced_at: "2024-01-10T10:30:00Z", state: { temperature: 72.4, pressure: 4.1, rpm: 1450, status: "running" } },
  { id: "t2", asset_id: "ASSET-002", name: "Chiller Unit B Twin", schema_version: "1.8", last_synced_at: "2024-01-10T10:28:00Z", state: { temperature: 18.2, flow_rate: 12.3, compressor_load: 68, status: "running" } },
  { id: "t3", asset_id: "ASSET-003", name: "Generator C Twin", schema_version: "1.0", last_synced_at: "2024-01-09T14:00:00Z", state: { voltage: 398, current: 45.2, frequency: 49.9, status: "standby" } },
];

const mockHistory = [
  { id: "h1", twin_id: "t1", changed_at: "2024-01-10T10:30:00Z", property: "temperature", from: 71.8, to: 72.4 },
  { id: "h2", twin_id: "t1", changed_at: "2024-01-10T10:15:00Z", property: "pressure", from: 4.0, to: 4.1 },
  { id: "h3", twin_id: "t2", changed_at: "2024-01-10T10:28:00Z", property: "flow_rate", from: 11.9, to: 12.3 },
];

export default function DigitalTwin() {
  const [tab, setTab] = useState("models");
  const [selected, setSelected] = useState<string | null>(null);
  const twin = mockTwins.find(t => t.id === selected);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Digital Twin Synchronisation</h1>
          <p className="text-muted-foreground">Live digital representations of physical assets</p>
        </div>
        <Button size="sm"><RefreshCw className="h-4 w-4 mr-2" />Sync All</Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="models">Twin Models</TabsTrigger>
          <TabsTrigger value="state">State Viewer</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="models" className="space-y-3 mt-4">
          {mockTwins.map(t => (
            <Card key={t.id} className={`cursor-pointer ${selected === t.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelected(t.id)}>
              <CardContent className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2"><GitBranch className="h-4 w-4" />{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.asset_id} · v{t.schema_version}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />{new Date(t.last_synced_at).toLocaleString()}
                  <Badge variant="default" className="ml-1">synced</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="state" className="mt-4">
          {twin ? (
            <Card>
              <CardHeader><CardTitle className="text-sm">{twin.name} — Live State</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">Property</th><th className="text-right pb-2">Value</th></tr></thead>
                  <tbody>{Object.entries(twin.state).map(([k, v]) => (
                    <tr key={k} className="border-b last:border-0"><td className="py-2 capitalize">{k.replace(/_/g, ' ')}</td><td className="text-right font-mono">{String(v)}</td></tr>
                  ))}</tbody>
                </table>
              </CardContent>
            </Card>
          ) : <Card><CardContent className="pt-4 text-sm text-muted-foreground">Select a twin model to view its state.</CardContent></Card>}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">Twin</th><th className="text-left pb-2">Property</th><th className="text-right pb-2">From</th><th className="text-right pb-2">To</th><th className="text-left pb-2 pl-4">Time</th></tr></thead>
                <tbody>{mockHistory.map(h => (
                  <tr key={h.id} className="border-b last:border-0">
                    <td className="py-2">{h.twin_id}</td><td>{h.property}</td>
                    <td className="text-right text-muted-foreground">{h.from}</td>
                    <td className="text-right font-medium">{h.to}</td>
                    <td className="pl-4 text-muted-foreground text-xs">{new Date(h.changed_at).toLocaleTimeString()}</td>
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
