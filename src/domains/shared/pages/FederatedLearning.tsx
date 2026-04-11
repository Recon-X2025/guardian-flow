import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Users, PlayCircle, CheckCircle2 } from "lucide-react";

const mockRounds = [
  { id: "r1", model_id: "MODEL-CHURN-V2", participants: ["tenant-001", "tenant-002", "tenant-003"], aggregation_strategy: "fedavg", status: "completed", accuracy: 0.891, round_number: 12 },
  { id: "r2", model_id: "MODEL-ANOMALY-V1", participants: ["tenant-001", "tenant-004"], aggregation_strategy: "fedprox", status: "in_progress", accuracy: null, round_number: 3 },
  { id: "r3", model_id: "MODEL-FORECAST-V3", participants: ["tenant-002", "tenant-003", "tenant-005"], aggregation_strategy: "fedavg", status: "scheduled", accuracy: null, round_number: 1 },
];

const statusColor: Record<string, "default" | "secondary" | "destructive"> = { completed: "default", in_progress: "secondary", scheduled: "secondary" };

export default function FederatedLearning() {
  const [tab, setTab] = useState("rounds");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Federated Learning Coordinator</h1>
          <p className="text-muted-foreground">Privacy-preserving distributed model training across tenants</p>
        </div>
        <Button size="sm"><PlayCircle className="h-4 w-4 mr-2" />New Round</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Rounds</p><p className="text-2xl font-bold">{mockRounds.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-bold text-green-600">{mockRounds.filter(r => r.status === "completed").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">In Progress</p><p className="text-2xl font-bold text-amber-600">{mockRounds.filter(r => r.status === "in_progress").length}</p></CardContent></Card>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="rounds">Training Rounds</TabsTrigger>
          <TabsTrigger value="submit">Submit Gradient</TabsTrigger>
        </TabsList>
        <TabsContent value="rounds" className="space-y-3 mt-4">
          {mockRounds.map(r => (
            <Card key={r.id}>
              <CardContent className="py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{r.model_id} — Round #{r.round_number}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{r.participants.length} participants · {r.aggregation_strategy}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.accuracy && <span className="text-xs font-medium text-green-600">Acc: {(r.accuracy * 100).toFixed(1)}%</span>}
                    <Badge variant={statusColor[r.status]}>{r.status}</Badge>
                  </div>
                </div>
                {r.status === "in_progress" && <Progress value={65} className="h-1" />}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="submit" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Submit Model Gradient</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Participate in a federated round by submitting your local model update.</p>
              <Button><CheckCircle2 className="h-4 w-4 mr-2" />Submit Gradient</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
