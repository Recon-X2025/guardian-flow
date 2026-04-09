import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, Users, Building2, PlusCircle } from "lucide-react";

const mockReports = [
  { id: "r1", period: "Q4 2023", framework: "GRI", status: "submitted", carbon_kg: 142000, water_litres: 890000, waste_kg: 12400, social_score: 78, governance_score: 85 },
  { id: "r2", period: "Q3 2023", framework: "TCFD", status: "draft", carbon_kg: 155000, water_litres: 920000, waste_kg: 13800, social_score: 74, governance_score: 82 },
];

const mockBenchmarks = [
  { category: "Carbon Intensity", your_value: 48.2, industry_avg: 62.1, unit: "kg CO₂e/revenue $k" },
  { category: "Water Usage", your_value: 298.3, industry_avg: 310.0, unit: "L/employee/day" },
  { category: "Waste Diversion", your_value: 72, industry_avg: 65, unit: "%" },
];

const frameworkColor: Record<string, "default" | "secondary" | "outline"> = { GRI: "default", TCFD: "secondary", SASB: "outline" };

export default function ESGReporting() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ESG Reporting</h1>
          <p className="text-muted-foreground">Environmental, Social and Governance metrics and reporting</p>
        </div>
        <Button size="sm"><PlusCircle className="h-4 w-4 mr-2" />New Report</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Leaf className="h-8 w-8 text-green-500" /><div><p className="text-xs text-muted-foreground">Carbon (Q4)</p><p className="text-xl font-bold">142 t CO₂e</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Users className="h-8 w-8 text-blue-500" /><div><p className="text-xs text-muted-foreground">Social Score</p><p className="text-xl font-bold">78 / 100</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Building2 className="h-8 w-8 text-purple-500" /><div><p className="text-xs text-muted-foreground">Governance Score</p><p className="text-xl font-bold">85 / 100</p></div></CardContent></Card>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Reports</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-3 mt-4">
          {mockReports.map(r => (
            <Card key={r.id}>
              <CardContent className="py-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{r.period}</p>
                    <p className="text-xs text-muted-foreground">Carbon: {(r.carbon_kg / 1000).toFixed(1)}t · Water: {(r.water_litres / 1000).toFixed(0)}kL · Waste: {r.waste_kg.toLocaleString()}kg</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={frameworkColor[r.framework] ?? "secondary"}>{r.framework}</Badge>
                    <Badge variant={r.status === "submitted" ? "default" : "secondary"}>{r.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="benchmarks" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Industry Benchmarks</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground border-b"><th className="text-left pb-2">Category</th><th className="text-right pb-2">You</th><th className="text-right pb-2">Industry Avg</th><th className="text-left pb-2 pl-4">Unit</th></tr></thead>
                <tbody>{mockBenchmarks.map(b => (
                  <tr key={b.category} className="border-b last:border-0">
                    <td className="py-2">{b.category}</td>
                    <td className="text-right font-medium">{b.your_value}</td>
                    <td className="text-right text-muted-foreground">{b.industry_avg}</td>
                    <td className="pl-4 text-xs text-muted-foreground">{b.unit}</td>
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
