import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, ShieldCheck, AlertTriangle, PlusCircle } from "lucide-react";

const mockAudits = [
  { id: "a1", model_id: "MODEL-CHURN-V2", dataset_description: "Customer churn dataset Q4 2023 — 50k records", metrics: { demographic_parity: 0.94, equalised_odds: 0.91 }, result: "pass", created_at: "2024-01-08" },
  { id: "a2", model_id: "MODEL-CREDIT-V1", dataset_description: "Credit scoring dataset — 20k records", metrics: { demographic_parity: 0.71, equalised_odds: 0.68 }, result: "fail", created_at: "2024-01-05" },
  { id: "a3", model_id: "MODEL-ANOMALY-V1", dataset_description: "Operational anomaly dataset — unsupervised", metrics: { demographic_parity: null, equalised_odds: null }, result: "pending", created_at: "2024-01-10" },
];

const mockPolicies = [
  { id: "p1", name: "Fairness Threshold Policy", description: "All supervised models must achieve demographic parity ≥ 0.85", scope: "all_models" },
  { id: "p2", name: "High-Stakes Decision Review", description: "Models used for credit, hiring or legal decisions require human review", scope: "restricted" },
  { id: "p3", name: "Prohibited Use Cases", description: "Facial recognition for surveillance is prohibited", scope: "platform" },
];

const resultColor: Record<string, "default" | "destructive" | "secondary"> = { pass: "default", fail: "destructive", pending: "secondary" };

export default function AIEthics() {
  const [tab, setTab] = useState("audits");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Scale className="h-6 w-6" />AI Ethics & Bias Auditing</h1>
          <p className="text-muted-foreground">Fairness audits, bias metrics and ethics policies</p>
        </div>
        <Button size="sm"><PlusCircle className="h-4 w-4 mr-2" />New Audit</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-green-500" /><div><p className="text-xs text-muted-foreground">Passed</p><p className="text-2xl font-bold text-green-600">{mockAudits.filter(a => a.result === "pass").length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-red-500" /><div><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-bold text-red-600">{mockAudits.filter(a => a.result === "fail").length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Policies</p><p className="text-2xl font-bold">{mockPolicies.length}</p></CardContent></Card>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="audits">Bias Audits</TabsTrigger>
          <TabsTrigger value="policies">Ethics Policies</TabsTrigger>
        </TabsList>
        <TabsContent value="audits" className="space-y-3 mt-4">
          {mockAudits.map(a => (
            <Card key={a.id}>
              <CardContent className="py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{a.model_id}</p>
                  <Badge variant={resultColor[a.result]}>{a.result}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{a.dataset_description}</p>
                {a.metrics.demographic_parity !== null && (
                  <div className="flex gap-4 text-xs mt-1">
                    <span>Demographic Parity: <strong className={a.metrics.demographic_parity >= 0.85 ? "text-green-600" : "text-red-600"}>{a.metrics.demographic_parity}</strong></span>
                    <span>Equalised Odds: <strong className={(a.metrics.equalised_odds ?? 0) >= 0.85 ? "text-green-600" : "text-red-600"}>{a.metrics.equalised_odds}</strong></span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="policies" className="space-y-2 mt-4">
          {mockPolicies.map(p => (
            <Card key={p.id}>
              <CardContent className="py-3 flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
                <Badge variant="secondary" className="ml-4 shrink-0">{p.scope}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
