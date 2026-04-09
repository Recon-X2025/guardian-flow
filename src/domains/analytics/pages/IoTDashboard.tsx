import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Cpu, Wifi, WifiOff } from "lucide-react";

const mockDevices = [
  { id: "dev-001", name: "Pump Station Alpha", metric: "pressure", value: 4.2, unit: "bar", status: "online", last_seen: "2 min ago" },
  { id: "dev-002", name: "Chiller Unit B", metric: "temperature", value: 18.5, unit: "°C", status: "online", last_seen: "1 min ago" },
  { id: "dev-003", name: "Generator C", metric: "voltage", value: 399.1, unit: "V", status: "offline", last_seen: "3 hrs ago" },
  { id: "dev-004", name: "Flow Meter D", metric: "flow_rate", value: 12.7, unit: "L/s", status: "online", last_seen: "30 sec ago" },
];

const mockReadings = [
  { id: "r1", device_id: "dev-001", metric: "pressure", value: 4.2, unit: "bar", timestamp: "2024-01-10T10:30:00Z" },
  { id: "r2", device_id: "dev-002", metric: "temperature", value: 18.5, unit: "°C", timestamp: "2024-01-10T10:29:00Z" },
  { id: "r3", device_id: "dev-004", metric: "flow_rate", value: 12.7, unit: "L/s", timestamp: "2024-01-10T10:28:00Z" },
];

export default function IoTDashboard() {
  const [tab, setTab] = useState("devices");
  const online = mockDevices.filter(d => d.status === "online").length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">IoT Telemetry</h1>
        <p className="text-muted-foreground">Real-time device telemetry ingestion and monitoring</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Devices</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold flex items-center gap-2"><Cpu className="h-5 w-5 text-primary" />{mockDevices.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Online</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold flex items-center gap-2"><Wifi className="h-5 w-5 text-green-500" />{online}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Offline</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold flex items-center gap-2"><WifiOff className="h-5 w-5 text-red-500" />{mockDevices.length - online}</div></CardContent></Card>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="readings">Recent Readings</TabsTrigger>
        </TabsList>
        <TabsContent value="devices" className="space-y-2 mt-4">
          {mockDevices.map(d => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.metric}: <span className="font-semibold">{d.value} {d.unit}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{d.last_seen}</span>
                  <Badge variant={d.status === "online" ? "default" : "destructive"}>{d.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="readings" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground border-b"><th className="text-left pb-2">Device</th><th className="text-left pb-2">Metric</th><th className="text-left pb-2">Value</th><th className="text-left pb-2">Time</th></tr></thead>
                <tbody>{mockReadings.map(r => (<tr key={r.id} className="border-b last:border-0"><td className="py-2">{r.device_id}</td><td>{r.metric}</td><td>{r.value} {r.unit}</td><td className="text-muted-foreground">{new Date(r.timestamp).toLocaleTimeString()}</td></tr>))}</tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
