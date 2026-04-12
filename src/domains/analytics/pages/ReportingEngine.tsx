import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Play, Download, PlusCircle, Clock } from "lucide-react";

const mockReports = [
  { id: "r1", name: "Monthly Revenue Summary", datasource: "ledger", schedule: "monthly", output_format: "pdf", last_run: "2024-01-01T06:00:00Z", status: "success" },
  { id: "r2", name: "Technician Performance", datasource: "work_orders", schedule: "weekly", output_format: "xlsx", last_run: "2024-01-08T06:00:00Z", status: "success" },
  { id: "r3", name: "Customer SLA Compliance", datasource: "sla_evaluations", schedule: "daily", output_format: "json", last_run: "2024-01-10T06:00:00Z", status: "running" },
];

const mockRuns = [
  { id: "ru1", report_id: "r1", started_at: "2024-01-01T06:00:00Z", duration_s: 12, rows: 142, status: "success" },
  { id: "ru2", report_id: "r1", started_at: "2023-12-01T06:00:00Z", duration_s: 9, rows: 138, status: "success" },
];

const fmtColor: Record<string, "default" | "secondary" | "outline"> = { pdf: "default", xlsx: "secondary", json: "outline" };
const statusColor: Record<string, "default" | "secondary" | "destructive"> = { success: "default", running: "secondary", failed: "destructive" };

export default function ReportingEngine() {
  const [tab, setTab] = useState("reports");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Advanced Reporting Engine</h1>
          <p className="text-muted-foreground">Scheduled and on-demand reports across all datasources</p>
        </div>
        <Button size="sm"><PlusCircle className="h-4 w-4 mr-2" />New Report</Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="runs">Run History</TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="space-y-3 mt-4">
          {mockReports.map(r => (
            <Card key={r.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2"><FileText className="h-4 w-4" />{r.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2"><Clock className="h-3 w-3" />{r.schedule} · source: {r.datasource} · last: {new Date(r.last_run).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={fmtColor[r.output_format]}>{r.output_format.toUpperCase()}</Badge>
                  <Badge variant={statusColor[r.status]}>{r.status}</Badge>
                  <Button size="sm" variant="outline"><Play className="h-3 w-3 mr-1" />Run</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="runs" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">Report</th><th className="text-right pb-2">Rows</th><th className="text-right pb-2">Duration</th><th className="text-left pb-2 pl-4">Started</th><th className="text-left pb-2">Status</th></tr></thead>
                <tbody>{mockRuns.map(ru => (
                  <tr key={ru.id} className="border-b last:border-0">
                    <td className="py-2">{ru.report_id}</td>
                    <td className="text-right">{ru.rows}</td>
                    <td className="text-right">{ru.duration_s}s</td>
                    <td className="pl-4 text-muted-foreground">{new Date(ru.started_at).toLocaleString()}</td>
                    <td><Badge variant={statusColor[ru.status]} className="ml-2">{ru.status}</Badge></td>
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
