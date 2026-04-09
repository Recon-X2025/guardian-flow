import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, CheckCircle2, XCircle, PlusCircle } from "lucide-react";

const mockPolicies = [
  { id: "p1", name: "Enterprise SLA", service_type: "field_service", tiers: [{ name: "P1", response_time_hrs: 2, resolution_time_hrs: 8, penalty_pct: 10 }, { name: "P2", response_time_hrs: 4, resolution_time_hrs: 24, penalty_pct: 5 }] },
  { id: "p2", name: "Standard SLA", service_type: "maintenance", tiers: [{ name: "Standard", response_time_hrs: 8, resolution_time_hrs: 48, penalty_pct: 2 }] },
];

const mockBreaches = [
  { id: "b1", wo_id: "WO-3001", policy: "Enterprise SLA", tier: "P1", breach_type: "resolution", excess_hrs: 3.5, penalty_applied: 500 },
  { id: "b2", wo_id: "WO-2998", policy: "Standard SLA", tier: "Standard", breach_type: "response", excess_hrs: 1.2, penalty_applied: 120 },
];

const mockMetrics = { compliance_rate: 94.7, avg_resolution_hrs: 6.2, total_breaches_30d: 14, penalties_30d: 4200 };

export default function SLAEngine() {
  const [tab, setTab] = useState("policies");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Advanced SLA Engine</h1>
          <p className="text-muted-foreground">Policy-based SLA evaluation and breach management</p>
        </div>
        <Button size="sm"><PlusCircle className="h-4 w-4 mr-2" />New Policy</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Compliance Rate</p><p className="text-xl font-bold text-green-600">{mockMetrics.compliance_rate}%</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Avg Resolution</p><p className="text-xl font-bold">{mockMetrics.avg_resolution_hrs}h</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Breaches (30d)</p><p className="text-xl font-bold text-red-600">{mockMetrics.total_breaches_30d}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Penalties (30d)</p><p className="text-xl font-bold">${mockMetrics.penalties_30d.toLocaleString()}</p></CardContent></Card>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="breaches">Breaches</TabsTrigger>
        </TabsList>
        <TabsContent value="policies" className="space-y-3 mt-4">
          {mockPolicies.map(p => (
            <Card key={p.id}>
              <CardHeader className="pb-1"><CardTitle className="text-sm">{p.name} <Badge variant="secondary" className="ml-2">{p.service_type}</Badge></CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-3 flex-wrap">
                  {p.tiers.map(t => (
                    <div key={t.name} className="text-xs border rounded p-2">
                      <p className="font-semibold">{t.name}</p>
                      <p>Response: {t.response_time_hrs}h · Resolution: {t.resolution_time_hrs}h</p>
                      <p className="text-red-600">Penalty: {t.penalty_pct}%</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="breaches" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground border-b"><th className="text-left pb-2">Work Order</th><th className="text-left pb-2">Policy</th><th className="text-left pb-2">Type</th><th className="text-right pb-2">Excess</th><th className="text-right pb-2">Penalty</th></tr></thead>
                <tbody>{mockBreaches.map(b => (<tr key={b.id} className="border-b last:border-0"><td className="py-2 flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" />{b.wo_id}</td><td>{b.policy} · {b.tier}</td><td>{b.breach_type}</td><td className="text-right">{b.excess_hrs}h</td><td className="text-right text-red-600">${b.penalty_applied}</td></tr>))}</tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
