import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const mockContracts = [
  { id: "c1", customer_id: "CUST-001", name: "Enterprise SaaS License", total_value: 120000, recognized: 45000, deferred: 75000, obligations: [{ name: "Software License", ssa_pct: 70 }, { name: "Implementation", ssa_pct: 30 }], start_date: "2024-01-01", end_date: "2024-12-31" },
  { id: "c2", customer_id: "CUST-002", name: "Managed Services Q1", total_value: 48000, recognized: 12000, deferred: 36000, obligations: [{ name: "Support", ssa_pct: 60 }, { name: "Consulting", ssa_pct: 40 }], start_date: "2024-01-01", end_date: "2024-03-31" },
];

export default function RevenueRecognition() {
  const [tab, setTab] = useState("contracts");
  const totalRecognized = mockContracts.reduce((s, c) => s + c.recognized, 0);
  const totalDeferred = mockContracts.reduce((s, c) => s + c.deferred, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Recognition</h1>
          <p className="text-muted-foreground">ASC 606 / IFRS 15 compliant revenue recognition</p>
        </div>
        <Button size="sm"><FileText className="h-4 w-4 mr-2" />New Contract</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Recognized Revenue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">${totalRecognized.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Deferred Revenue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">${totalDeferred.toLocaleString()}</div></CardContent></Card>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>
        <TabsContent value="contracts" className="space-y-3 mt-4">
          {mockContracts.map(c => {
            const pct = Math.round((c.recognized / c.total_value) * 100);
            return (
              <Card key={c.id}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.customer_id} · ${c.total_value.toLocaleString()} total</p>
                    </div>
                    <Button variant="outline" size="sm"><TrendingUp className="h-3 w-3 mr-1" />Recognize</Button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs"><span>Recognized</span><span>{pct}%</span></div>
                    <Progress value={pct} />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {c.obligations.map((o, i) => <Badge key={i} variant="secondary" className="text-xs">{o.name} {o.ssa_pct}%</Badge>)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
        <TabsContent value="schedule" className="mt-4">
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Select a contract to view its recognition schedule.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
