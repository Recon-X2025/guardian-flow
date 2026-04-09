import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Heart, TrendingDown, Users } from "lucide-react";

const mockScores = [
  { id: "c1", name: "Acme Corp", health_score: 87, churn_risk: "low", nps: 62, usage_score: 91, support_load: 12 },
  { id: "c2", name: "Beta Industries", health_score: 54, churn_risk: "high", nps: 28, usage_score: 43, support_load: 48 },
  { id: "c3", name: "Gamma Holdings", health_score: 72, churn_risk: "medium", nps: 45, usage_score: 68, support_load: 22 },
  { id: "c4", name: "Delta Systems", health_score: 93, churn_risk: "low", nps: 71, usage_score: 95, support_load: 5 },
];

const riskColor: Record<string, "destructive" | "default" | "secondary"> = { high: "destructive", medium: "default", low: "secondary" };

export default function CustomerSuccess() {
  const [tab, setTab] = useState("scores");
  const highRisk = mockScores.filter(s => s.churn_risk === "high").length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customer Success Analytics</h1>
        <p className="text-muted-foreground">Health scores, churn risk, and cohort analysis</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Customers</p><p className="text-2xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" />{mockScores.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">High Churn Risk</p><p className="text-2xl font-bold flex items-center gap-2 text-red-600"><TrendingDown className="h-5 w-5" />{highRisk}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Avg Health Score</p><p className="text-2xl font-bold flex items-center gap-2 text-green-600"><Heart className="h-5 w-5" />{Math.round(mockScores.reduce((s, c) => s + c.health_score, 0) / mockScores.length)}</p></CardContent></Card>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="scores">Health Scores</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
        </TabsList>
        <TabsContent value="scores" className="space-y-3 mt-4">
          {[...mockScores].sort((a, b) => b.health_score - a.health_score).map(s => (
            <Card key={s.id}>
              <CardContent className="py-3 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">NPS: {s.nps} · Support tickets: {s.support_load}/mo</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={riskColor[s.churn_risk]}>Churn: {s.churn_risk}</Badge>
                    <span className="text-sm font-bold">{s.health_score}</span>
                  </div>
                </div>
                <Progress value={s.health_score} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="cohorts" className="mt-4">
          <Card><CardHeader><CardTitle className="text-sm">Cohort Analysis</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Cohort breakdown by segment and tenure coming soon.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
