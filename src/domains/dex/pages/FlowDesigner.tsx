import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitBranch, PlusCircle, Play, Send } from "lucide-react";

const mockFlows = [
  { id: "f1", name: "Field Service Dispatch", description: "Standard FSM dispatch flow", steps: [{ type: "assign" }, { type: "notify" }, { type: "execute" }, { type: "review" }], status: "published" },
  { id: "f2", name: "Emergency Response", description: "Priority escalation flow", steps: [{ type: "triage" }, { type: "assign" }, { type: "execute" }], status: "draft" },
  { id: "f3", name: "Preventive Maintenance", description: "Scheduled PM workflow", steps: [{ type: "schedule" }, { type: "assign" }, { type: "execute" }, { type: "close" }], status: "published" },
];

const STEP_COLORS: Record<string, string> = { assign: "bg-blue-100 text-blue-700", notify: "bg-purple-100 text-purple-700", execute: "bg-green-100 text-green-700", review: "bg-amber-100 text-amber-700", triage: "bg-red-100 text-red-700", schedule: "bg-slate-100 text-slate-700", close: "bg-gray-100 text-gray-700" };

export default function FlowDesigner() {
  const [tab, setTab] = useState("flows");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DEX Flow Designer</h1>
          <p className="text-muted-foreground">Design and publish execution flow templates</p>
        </div>
        <Button size="sm"><PlusCircle className="h-4 w-4 mr-2" />New Flow</Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="flows">Flow Templates</TabsTrigger>
          <TabsTrigger value="designer">Designer</TabsTrigger>
        </TabsList>
        <TabsContent value="flows" className="space-y-3 mt-4">
          {mockFlows.map(f => (
            <Card key={f.id}>
              <CardContent className="py-3 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2"><GitBranch className="h-4 w-4" />{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={f.status === "published" ? "default" : "secondary"}>{f.status}</Badge>
                    {f.status === "draft" ? <Button size="sm" variant="outline"><Send className="h-3 w-3 mr-1" />Publish</Button> : <Button size="sm" variant="outline"><Play className="h-3 w-3 mr-1" />Instantiate</Button>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {f.steps.map((s, i) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${STEP_COLORS[s.type] ?? "bg-gray-100 text-gray-700"}`}>{s.type}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="designer" className="mt-4">
          <Card><CardHeader><CardTitle className="text-sm">Flow Designer Canvas</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Drag-and-drop flow designer. Select a template to edit or create a new flow.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
