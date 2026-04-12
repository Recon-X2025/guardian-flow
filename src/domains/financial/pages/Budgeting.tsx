import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PlusCircle } from "lucide-react";

const mockBudgets = [
  { id: "b1", name: "FY2024 Operations", fiscal_year: 2024, total: 500000, spent: 312000, dimensions: ["department", "region"] },
  { id: "b2", name: "FY2024 Capital Expenditure", fiscal_year: 2024, total: 200000, spent: 85000, dimensions: ["project", "category"] },
  { id: "b3", name: "Q1 Marketing", fiscal_year: 2024, total: 80000, spent: 79500, dimensions: ["channel"] },
];

const mockVariance = [
  { account: "Labour", budget: 150000, actual: 162000, variance: -12000 },
  { account: "Materials", budget: 80000, actual: 74500, variance: 5500 },
  { account: "Overheads", budget: 40000, actual: 38200, variance: 1800 },
  { account: "Travel", budget: 15000, actual: 18400, variance: -3400 },
];

export default function Budgeting() {
  const [tab, setTab] = useState("budgets");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Multi-Dimensional Budgeting</h1>
          <p className="text-muted-foreground">Plan, track and analyse budgets across dimensions</p>
        </div>
        <Button size="sm"><PlusCircle className="h-4 w-4 mr-2" />New Budget</Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
        </TabsList>
        <TabsContent value="budgets" className="space-y-3 mt-4">
          {mockBudgets.map(b => {
            const pct = Math.round((b.spent / b.total) * 100);
            const over = pct > 95;
            return (
              <Card key={b.id}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{b.name}</p>
                      <p className="text-xs text-muted-foreground">FY{b.fiscal_year} · ${b.spent.toLocaleString()} / ${b.total.toLocaleString()}</p>
                    </div>
                    <Badge variant={over ? "destructive" : "default"}>{pct}%</Badge>
                  </div>
                  <Progress value={pct} className={over ? "[&>div]:bg-red-500" : ""} />
                  <div className="flex gap-2">{b.dimensions.map(d => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}</div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
        <TabsContent value="variance" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Actual vs Budget Variance</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground border-b"><th className="text-left pb-2">Account</th><th className="text-right pb-2">Budget</th><th className="text-right pb-2">Actual</th><th className="text-right pb-2">Variance</th></tr></thead>
                <tbody>{mockVariance.map(v => (
                  <tr key={v.account} className="border-b last:border-0">
                    <td className="py-2">{v.account}</td>
                    <td className="text-right">${v.budget.toLocaleString()}</td>
                    <td className="text-right">${v.actual.toLocaleString()}</td>
                    <td className={`text-right font-medium ${v.variance < 0 ? "text-red-600" : "text-green-600"}`}>{v.variance < 0 ? "-" : "+"}${Math.abs(v.variance).toLocaleString()}</td>
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
