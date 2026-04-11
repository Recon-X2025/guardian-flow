import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, RefreshCw, AlertCircle, WifiOff } from "lucide-react";

const mockConfig = {
  offline_mode: true,
  sync_interval_s: 300,
  enabled_modules: ["work_orders", "asset_register", "iot_readings", "photos"],
  max_offline_hours: 24,
};

const mockSyncLog = [
  { id: "s1", device_id: "DEVICE-MOB-001", user: "tech.smith@acme.com", last_sync: "2024-01-10T09:45:00Z", mutations_pushed: 12, mutations_pulled: 8, status: "success" },
  { id: "s2", device_id: "DEVICE-MOB-002", user: "tech.jones@acme.com", last_sync: "2024-01-10T08:12:00Z", mutations_pushed: 5, mutations_pulled: 14, status: "success" },
  { id: "s3", device_id: "DEVICE-MOB-003", user: "tech.garcia@acme.com", last_sync: "2024-01-09T16:30:00Z", mutations_pushed: 0, mutations_pulled: 0, status: "offline" },
];

const mockCrashes = [
  { id: "c1", device_id: "DEVICE-MOB-002", version: "4.2.1", error: "NullPointerException in WorkOrderDetail", occurred_at: "2024-01-09T14:22:00Z" },
];

export default function FieldAppConfig() {
  const [config] = useState(mockConfig);
  const [tab, setTab] = useState("config");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Smartphone className="h-6 w-6" />Field App Configuration</h1>
          <p className="text-muted-foreground">Mobile-first field app settings, sync status and crash reports</p>
        </div>
        <Button size="sm" variant="outline"><RefreshCw className="h-4 w-4 mr-2" />Force Sync All</Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="sync">Sync Status</TabsTrigger>
          <TabsTrigger value="crashes">Crash Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="config" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">App Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">Offline Mode</span>
                <Badge variant={config.offline_mode ? "default" : "secondary"}>{config.offline_mode ? "Enabled" : "Disabled"}</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">Sync Interval</span>
                <span className="text-sm">{config.sync_interval_s}s</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">Max Offline Hours</span>
                <span className="text-sm">{config.max_offline_hours}h</span>
              </div>
              <div>
                <span className="text-sm font-medium block mb-2">Enabled Modules</span>
                <div className="flex flex-wrap gap-1">{config.enabled_modules.map(m => <Badge key={m} variant="secondary" className="text-xs">{m.replace(/_/g, " ")}</Badge>)}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sync" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">Device</th><th className="text-left pb-2">User</th><th className="text-right pb-2">↑Push</th><th className="text-right pb-2">↓Pull</th><th className="text-left pb-2 pl-4">Last Sync</th></tr></thead>
                <tbody>{mockSyncLog.map(s => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 flex items-center gap-1">{s.status === "offline" ? <WifiOff className="h-3 w-3 text-red-500" /> : <Smartphone className="h-3 w-3 text-green-500" />}{s.device_id}</td>
                    <td className="text-xs text-muted-foreground">{s.user}</td>
                    <td className="text-right">{s.mutations_pushed}</td>
                    <td className="text-right">{s.mutations_pulled}</td>
                    <td className="pl-4 text-xs text-muted-foreground">{new Date(s.last_sync).toLocaleString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="crashes" className="mt-4">
          {mockCrashes.length > 0 ? mockCrashes.map(c => (
            <Card key={c.id}>
              <CardContent className="py-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{c.error}</p>
                    <p className="text-xs text-muted-foreground">{c.device_id} · v{c.version} · {new Date(c.occurred_at).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )) : <Card><CardContent className="pt-4 text-sm text-muted-foreground">No crash reports.</CardContent></Card>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
