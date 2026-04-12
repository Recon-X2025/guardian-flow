import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, CheckCircle2, XCircle, Play, PlusCircle } from "lucide-react";

const mockSuites = [
  { id: "s1", name: "Core API Smoke Tests", description: "Critical path checks for all primary APIs", tests: 24, last_passed: 24, last_run: "2024-01-10T08:00:00Z", status: "pass" },
  { id: "s2", name: "Auth & RBAC Tests", description: "Role-based access control end-to-end", tests: 18, last_passed: 18, last_run: "2024-01-10T08:01:00Z", status: "pass" },
  { id: "s3", name: "Financial Workflows", description: "Invoice → payment → reconciliation flow", tests: 12, last_passed: 10, last_run: "2024-01-09T21:00:00Z", status: "fail" },
  { id: "s4", name: "IoT Telemetry Pipeline", description: "Ingest → CBM evaluate → work order create", tests: 8, last_passed: 8, last_run: "2024-01-10T07:45:00Z", status: "pass" },
];

const mockRuns = [
  { id: "r1", suite_id: "s1", started_at: "2024-01-10T08:00:00Z", passed: 24, failed: 0, duration_ms: 4820 },
  { id: "r2", suite_id: "s3", started_at: "2024-01-09T21:00:00Z", passed: 10, failed: 2, duration_ms: 12400 },
];

export default function E2ETestSuite() {
  const [tab, setTab] = useState("suites");
  const totalPassed = mockSuites.reduce((s, t) => s + t.last_passed, 0);
  const totalTests = mockSuites.reduce((s, t) => s + t.tests, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><FlaskConical className="h-6 w-6" />E2E Integration Test Suite</h1>
          <p className="text-muted-foreground">End-to-end integration tests across all platform workflows</p>
        </div>
        <Button size="sm"><PlusCircle className="h-4 w-4 mr-2" />New Suite</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Test Suites</p><p className="text-2xl font-bold">{mockSuites.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pass Rate</p><p className="text-2xl font-bold text-green-600">{Math.round((totalPassed / totalTests) * 100)}%</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Failing Suites</p><p className="text-2xl font-bold text-red-600">{mockSuites.filter(s => s.status === "fail").length}</p></CardContent></Card>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="suites">Test Suites</TabsTrigger>
          <TabsTrigger value="runs">Run History</TabsTrigger>
        </TabsList>
        <TabsContent value="suites" className="space-y-3 mt-4">
          {mockSuites.map(s => (
            <Card key={s.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {s.status === "pass" ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.description} · {s.last_passed}/{s.tests} passing · last: {new Date(s.last_run).toLocaleString()}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline"><Play className="h-3 w-3 mr-1" />Run</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="runs" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">Suite</th><th className="text-right pb-2">Passed</th><th className="text-right pb-2">Failed</th><th className="text-right pb-2">Duration</th><th className="text-left pb-2 pl-4">Started</th></tr></thead>
                <tbody>{mockRuns.map(r => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">{r.suite_id}</td>
                    <td className="text-right text-green-600">{r.passed}</td>
                    <td className="text-right text-red-600">{r.failed}</td>
                    <td className="text-right">{(r.duration_ms / 1000).toFixed(1)}s</td>
                    <td className="pl-4 text-muted-foreground text-xs">{new Date(r.started_at).toLocaleString()}</td>
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
