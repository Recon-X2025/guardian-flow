import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Rocket, CheckCircle2, Clock, AlertTriangle, BookOpen } from "lucide-react";

const mockItems = [
  { id: "sec-01", category: "Security", title: "Secrets rotated and vault configured", status: "done" },
  { id: "sec-02", category: "Security", title: "Penetration test completed", status: "done" },
  { id: "sec-03", category: "Security", title: "OWASP Top-10 review passed", status: "in_progress" },
  { id: "inf-01", category: "Infrastructure", title: "Auto-scaling policies configured", status: "done" },
  { id: "inf-02", category: "Infrastructure", title: "Disaster recovery runbook tested", status: "pending" },
  { id: "inf-03", category: "Infrastructure", title: "CDN and TLS certificates in place", status: "done" },
  { id: "obs-01", category: "Observability", title: "Alerting rules deployed", status: "done" },
  { id: "obs-02", category: "Observability", title: "Runbooks linked to alerts", status: "in_progress" },
  { id: "db-01",  category: "Database", title: "Backups verified and tested", status: "done" },
  { id: "db-02",  category: "Database", title: "Migration scripts rolled back successfully", status: "done" },
  { id: "qa-01",  category: "QA", title: "E2E test suite green", status: "done" },
  { id: "qa-02",  category: "QA", title: "Load test at 2x expected peak", status: "pending" },
  { id: "doc-01", category: "Documentation", title: "API docs published", status: "done" },
  { id: "doc-02", category: "Documentation", title: "Runbook available to on-call team", status: "done" },
];

const mockRunbook = [
  { order: 1, step: "Notify stakeholders of planned go-live window", owner: "PM", duration_min: 5 },
  { order: 2, step: "Run final E2E test suite", owner: "QA", duration_min: 15 },
  { order: 3, step: "Apply production DB migrations", owner: "DevOps", duration_min: 10 },
  { order: 4, step: "Deploy backend services via blue-green", owner: "DevOps", duration_min: 20 },
  { order: 5, step: "Deploy frontend CDN assets", owner: "DevOps", duration_min: 5 },
  { order: 6, step: "Smoke test all critical paths", owner: "QA", duration_min: 20 },
  { order: 7, step: "Enable feature flags for production", owner: "DevOps", duration_min: 5 },
  { order: 8, step: "Monitor dashboards for 1 hour post-launch", owner: "SRE", duration_min: 60 },
];

const statusIcon: Record<string, React.ReactNode> = {
  done: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  in_progress: <Clock className="h-4 w-4 text-amber-500" />,
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  blocked: <AlertTriangle className="h-4 w-4 text-red-500" />,
};

const categories = [...new Set(mockItems.map(i => i.category))];

export default function LaunchReadiness() {
  const [tab, setTab] = useState("checklist");
  const done = mockItems.filter(i => i.status === "done").length;
  const score = Math.round((done / mockItems.length) * 100);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Rocket className="h-6 w-6" />Launch Readiness</h1>
          <p className="text-muted-foreground">Production readiness checklist and launch runbook</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-green-600">{score}%</p>
          <p className="text-xs text-muted-foreground">Ready</p>
        </div>
      </div>
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="font-medium">Overall Readiness</span><span>{done} / {mockItems.length} complete</span></div>
          <Progress value={score} className={score < 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500"} />
        </CardContent>
      </Card>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="runbook">Runbook</TabsTrigger>
        </TabsList>
        <TabsContent value="checklist" className="space-y-4 mt-4">
          {categories.map(cat => (
            <div key={cat}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">{cat}</h3>
              <div className="space-y-2">
                {mockItems.filter(i => i.category === cat).map(item => (
                  <Card key={item.id}>
                    <CardContent className="py-2 flex items-center gap-3">
                      {statusIcon[item.status]}
                      <span className={`text-sm ${item.status === "done" ? "line-through text-muted-foreground" : ""}`}>{item.title}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="runbook" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" />Launch Runbook</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockRunbook.map(r => (
                  <div key={r.order} className="flex items-start gap-3 py-2 border-b last:border-0">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">{r.order}</span>
                    <div className="flex-1">
                      <p className="text-sm">{r.step}</p>
                      <p className="text-xs text-muted-foreground">Owner: {r.owner} · ~{r.duration_min}min</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
