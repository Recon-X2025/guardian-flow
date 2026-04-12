import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, AlertTriangle, ClipboardList, PlusCircle } from "lucide-react";

const mockControls = [
  { id: "c1", name: "Access Control Review", framework: "SOC2", category: "Security", description: "Quarterly review of user access rights", test_frequency: "quarterly", last_result: "pass" },
  { id: "c2", name: "Encryption at Rest", framework: "ISO27001", category: "Cryptography", description: "All PII data encrypted at rest with AES-256", test_frequency: "annual", last_result: "pass" },
  { id: "c3", name: "Backup Restoration Test", framework: "SOC2", category: "Availability", description: "Test backup restoration procedure", test_frequency: "quarterly", last_result: "fail" },
  { id: "c4", name: "Vendor Risk Assessment", framework: "GDPR", category: "Third Party", description: "Annual vendor security questionnaire", test_frequency: "annual", last_result: "partial" },
];

const mockAssessments = [
  { id: "a1", control_id: "c1", assessor: "Alice Chen", result: "pass", evidence: "Access log export attached", assessed_at: "2024-01-08" },
  { id: "a2", control_id: "c3", assessor: "Bob Patel", result: "fail", evidence: "Restoration took 6h, SLA is 4h", assessed_at: "2024-01-05" },
];

const resultColor: Record<string, "default" | "destructive" | "secondary"> = { pass: "default", fail: "destructive", partial: "secondary" };

export default function AuditFramework() {
  const [tab, setTab] = useState("controls");
  const failed = mockControls.filter(c => c.last_result === "fail").length;
  const passed = mockControls.filter(c => c.last_result === "pass").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance & Audit Framework</h1>
          <p className="text-muted-foreground">Control library, assessments and risk register</p>
        </div>
        <Button size="sm"><PlusCircle className="h-4 w-4 mr-2" />Add Control</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-green-500" /><div><p className="text-xs text-muted-foreground">Controls Passing</p><p className="text-2xl font-bold text-green-600">{passed}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-red-500" /><div><p className="text-xs text-muted-foreground">Controls Failing</p><p className="text-2xl font-bold text-red-600">{failed}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><ClipboardList className="h-8 w-8 text-primary" /><div><p className="text-xs text-muted-foreground">Compliance Score</p><p className="text-2xl font-bold">{Math.round(passed / mockControls.length * 100)}%</p></div></CardContent></Card>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="controls">Control Library</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="risk">Risk Register</TabsTrigger>
        </TabsList>
        <TabsContent value="controls" className="space-y-2 mt-4">
          {mockControls.map(c => (
            <Card key={c.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.framework} · {c.category} · {c.test_frequency}</p>
                </div>
                <Badge variant={resultColor[c.last_result]}>{c.last_result}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="assessments" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">Control</th><th className="text-left pb-2">Assessor</th><th className="text-left pb-2">Result</th><th className="text-left pb-2">Date</th></tr></thead>
                <tbody>{mockAssessments.map(a => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2">{a.control_id}</td><td>{a.assessor}</td>
                    <td><Badge variant={resultColor[a.result]}>{a.result}</Badge></td>
                    <td className="text-muted-foreground">{a.assessed_at}</td>
                  </tr>
                ))}</tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="risk" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Risk Register</CardTitle></CardHeader>
            <CardContent>
              {mockControls.filter(c => c.last_result === "fail").map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-muted-foreground">{c.description}</p></div>
                  <Badge variant="destructive">High Risk</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
