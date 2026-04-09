import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Activity, Webhook, PlusCircle, Trash2 } from "lucide-react";

const mockKeys = [
  { id: "k1", partner: "IntegrationCo", scopes: ["read:workorders", "write:assets"], rate_limit: 500, calls_24h: 12400, errors_24h: 23, expires_at: "2025-01-01", status: "active" },
  { id: "k2", partner: "AnalyticsPro", scopes: ["read:analytics", "read:customers"], rate_limit: 200, calls_24h: 4800, errors_24h: 5, expires_at: "2024-12-31", status: "active" },
  { id: "k3", partner: "OldSystem", scopes: ["read:workorders"], rate_limit: 100, calls_24h: 0, errors_24h: 0, expires_at: "2023-06-01", status: "revoked" },
];

const mockWebhooks = [
  { id: "w1", partner: "IntegrationCo", endpoint: "https://integrationco.example.com/hooks/gf", events: ["wo.created", "wo.completed"], status: "active" },
];

export default function PartnerGateway() {
  const [tab, setTab] = useState("keys");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partner API Gateway</h1>
          <p className="text-muted-foreground">API key management, usage analytics and webhook registration</p>
        </div>
        <Button size="sm"><PlusCircle className="h-4 w-4 mr-2" />Issue Key</Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>
        <TabsContent value="keys" className="space-y-3 mt-4">
          {mockKeys.map(k => (
            <Card key={k.id}>
              <CardContent className="py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2"><Key className="h-4 w-4" />{k.partner}</p>
                    <p className="text-xs text-muted-foreground">Limit: {k.rate_limit}/min · Expires: {k.expires_at}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={k.status === "active" ? "default" : "destructive"}>{k.status}</Badge>
                    {k.status === "active" && <Button size="sm" variant="ghost"><Trash2 className="h-3 w-3 text-red-500" /></Button>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">{k.scopes.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="usage" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" />24h Usage Analytics</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">Partner</th><th className="text-right pb-2">Calls</th><th className="text-right pb-2">Errors</th><th className="text-right pb-2">Error %</th></tr></thead>
                <tbody>{mockKeys.filter(k => k.status === "active").map(k => (
                  <tr key={k.id} className="border-b last:border-0">
                    <td className="py-2">{k.partner}</td>
                    <td className="text-right">{k.calls_24h.toLocaleString()}</td>
                    <td className="text-right text-red-600">{k.errors_24h}</td>
                    <td className="text-right">{k.calls_24h > 0 ? ((k.errors_24h / k.calls_24h) * 100).toFixed(2) : 0}%</td>
                  </tr>
                ))}</tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="webhooks" className="space-y-3 mt-4">
          {mockWebhooks.map(w => (
            <Card key={w.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2"><Webhook className="h-4 w-4" />{w.partner}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-xs">{w.endpoint}</p>
                  <div className="flex gap-1 mt-1">{w.events.map(e => <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>)}</div>
                </div>
                <Badge>{w.status}</Badge>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" size="sm"><PlusCircle className="h-3 w-3 mr-2" />Register Webhook</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
