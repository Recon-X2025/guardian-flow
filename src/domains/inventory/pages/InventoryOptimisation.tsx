import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, BarChart3, TrendingDown } from "lucide-react";

const mockSuggestions = [
  { id: "s1", item_id: "PART-001", name: "Hydraulic Filter", current_stock: 3, reorder_point: 10, suggested_qty: 25, supplier: "FilterCo", est_cost: 875 },
  { id: "s2", item_id: "PART-002", name: "Pump Seal Kit", current_stock: 1, reorder_point: 5, suggested_qty: 15, supplier: "SealTech", est_cost: 1200 },
  { id: "s3", item_id: "PART-003", name: "Bearing Assembly", current_stock: 0, reorder_point: 3, suggested_qty: 8, supplier: "BearingPlus", est_cost: 2400 },
];

const mockABC = [
  { item: "Hydraulic Cylinder", category: "A", annual_usage: 145000, pct: 42 },
  { item: "Motor Starter", category: "A", annual_usage: 98000, pct: 28 },
  { item: "Filter Elements", category: "B", annual_usage: 42000, pct: 12 },
  { item: "Gasket Set", category: "C", annual_usage: 8200, pct: 2.4 },
];

const catColor: Record<string, "default" | "secondary" | "destructive"> = { A: "destructive", B: "default", C: "secondary" };

export default function InventoryOptimisation() {
  const [tab, setTab] = useState("reorder");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Advanced Inventory Optimisation</h1>
        <p className="text-muted-foreground">AI-driven reorder suggestions, ABC analysis and demand forecasting</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Items Below Reorder Point</p><p className="text-2xl font-bold text-red-600">{mockSuggestions.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Stockouts</p><p className="text-2xl font-bold text-red-600">{mockSuggestions.filter(s => s.current_stock === 0).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Est. Reorder Value</p><p className="text-2xl font-bold">${mockSuggestions.reduce((s, r) => s + r.est_cost, 0).toLocaleString()}</p></CardContent></Card>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="reorder">Reorder Suggestions</TabsTrigger>
          <TabsTrigger value="abc">ABC Analysis</TabsTrigger>
          <TabsTrigger value="forecast">Demand Forecast</TabsTrigger>
        </TabsList>
        <TabsContent value="reorder" className="space-y-3 mt-4">
          {mockSuggestions.map(s => (
            <Card key={s.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{s.name} <span className="text-xs text-muted-foreground">({s.item_id})</span></p>
                  <p className="text-xs text-muted-foreground">Stock: {s.current_stock} · Reorder at: {s.reorder_point} · Suggest: {s.suggested_qty} units · ${s.est_cost.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.current_stock === 0 && <Badge variant="destructive">Stockout</Badge>}
                  <Button size="sm" variant="outline"><CheckCircle2 className="h-3 w-3 mr-1" />Approve PO</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="abc" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />ABC Classification</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">Item</th><th className="text-left pb-2">Class</th><th className="text-right pb-2">Annual Usage</th><th className="text-right pb-2">% of Value</th></tr></thead>
                <tbody>{mockABC.map(r => (
                  <tr key={r.item} className="border-b last:border-0">
                    <td className="py-2">{r.item}</td>
                    <td><Badge variant={catColor[r.category]}>{r.category}</Badge></td>
                    <td className="text-right">${r.annual_usage.toLocaleString()}</td>
                    <td className="text-right">{r.pct}%</td>
                  </tr>
                ))}</tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="forecast" className="mt-4">
          <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4" />Demand Forecast</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">ML-driven demand forecast charts will appear here once IoT telemetry data is collected.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
