import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Settings, ToggleLeft, ToggleRight } from "lucide-react";

const mockFlags = [
  { id: "f1", name: "federated_learning", label: "Federated Learning", enabled: true },
  { id: "f2", name: "dex_marketplace", label: "DEX Marketplace", enabled: true },
  { id: "f3", name: "neuro_console", label: "Neuro Console", enabled: false },
  { id: "f4", name: "white_label", label: "White-Label Portal", enabled: true },
  { id: "f5", name: "ai_ethics_auditing", label: "AI Ethics Auditing", enabled: true },
  { id: "f6", name: "data_residency", label: "Data Residency Controls", enabled: false },
];

const mockQuotas = [
  { tenant: "Acme Corp", api_calls: 85000, api_limit: 100000, storage_gb: 42, storage_limit: 100 },
  { tenant: "Beta Industries", api_calls: 12000, api_limit: 50000, storage_gb: 8, storage_limit: 50 },
  { tenant: "Gamma Holdings", api_calls: 98500, api_limit: 100000, storage_gb: 91, storage_limit: 100 },
];

export default function PlatformConfig() {
  const [flags, setFlags] = useState(mockFlags);
  const [tab, setTab] = useState("flags");

  const toggle = (id: string) => setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Configuration</h1>
          <p className="text-muted-foreground">Feature flags, quotas and rate-limit management</p>
        </div>
        <Button size="sm" variant="outline"><Settings className="h-4 w-4 mr-2" />Save Config</Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="quotas">Tenant Quotas</TabsTrigger>
        </TabsList>
        <TabsContent value="flags" className="space-y-2 mt-4">
          {flags.map(f => (
            <Card key={f.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{f.label}</p>
                  <p className="text-xs text-muted-foreground font-mono">{f.name}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggle(f.id)}>
                  {f.enabled
                    ? <ToggleRight className="h-6 w-6 text-green-500" />
                    : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                  <Badge variant={f.enabled ? "default" : "secondary"} className="ml-2">{f.enabled ? "ON" : "OFF"}</Badge>
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="quotas" className="space-y-3 mt-4">
          {mockQuotas.map(q => {
            const apiPct = Math.round((q.api_calls / q.api_limit) * 100);
            const storagePct = Math.round((q.storage_gb / q.storage_limit) * 100);
            return (
              <Card key={q.tenant}>
                <CardHeader className="pb-1"><CardTitle className="text-sm">{q.tenant}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1"><div className="flex justify-between text-xs"><span>API Calls</span><span>{q.api_calls.toLocaleString()} / {q.api_limit.toLocaleString()}</span></div><Progress value={apiPct} className={apiPct > 85 ? "[&>div]:bg-amber-500" : ""} /></div>
                  <div className="space-y-1"><div className="flex justify-between text-xs"><span>Storage</span><span>{q.storage_gb}GB / {q.storage_limit}GB</span></div><Progress value={storagePct} className={storagePct > 85 ? "[&>div]:bg-red-500" : ""} /></div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
