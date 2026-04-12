import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, ShieldAlert, Tag, Save } from "lucide-react";

const REGIONS = ["us-east-1", "eu-west-1", "ap-southeast-1", "ca-central-1", "au-southeast-2"];
const DATA_TYPES = ["pii", "health", "financial", "biometric", "contracts", "logs"];

const mockPolicy = {
  primary_region: "eu-west-1",
  allowed_regions: ["eu-west-1", "eu-central-1"],
  restricted_data_types: ["pii", "health", "financial"],
};

const mockViolations = [
  { id: "v1", data_type: "pii", source_region: "eu-west-1", target_region: "us-east-1", endpoint: "/api/analytics/export", detected_at: "2024-01-09T14:22:00Z", severity: "high" },
  { id: "v2", data_type: "financial", source_region: "eu-west-1", target_region: "ap-southeast-1", endpoint: "/api/reporting/reports/r5/run", detected_at: "2024-01-08T09:11:00Z", severity: "medium" },
];

export default function DataResidency() {
  const [policy] = useState(mockPolicy);
  const [tab, setTab] = useState("policy");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Residency & Sovereignty</h1>
          <p className="text-muted-foreground">Regional data policies, violation detection and classification</p>
        </div>
        <Button size="sm"><Save className="h-4 w-4 mr-2" />Save Policy</Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="policy">Policy</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="classify">Classify Data</TabsTrigger>
        </TabsList>
        <TabsContent value="policy" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" />Residency Policy</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><p className="text-xs text-muted-foreground font-medium">Primary Region</p><p className="text-sm font-medium mt-1 flex items-center gap-2"><Globe className="h-3 w-3" />{policy.primary_region}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Allowed Regions</p><div className="flex gap-2 mt-1 flex-wrap">{policy.allowed_regions.map(r => <Badge key={r} variant="secondary">{r}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground font-medium">Restricted Data Types</p><div className="flex gap-2 mt-1 flex-wrap">{policy.restricted_data_types.map(d => <Badge key={d} variant="destructive">{d}</Badge>)}</div></div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="violations" className="space-y-3 mt-4">
          {mockViolations.map(v => (
            <Card key={v.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{v.data_type} data sent cross-region</p>
                      <p className="text-xs text-muted-foreground">{v.source_region} → {v.target_region} via {v.endpoint}</p>
                      <p className="text-xs text-muted-foreground">{new Date(v.detected_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge variant={v.severity === "high" ? "destructive" : "default"}>{v.severity}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="classify" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Tag className="h-4 w-4" />Data Classifier</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Describe a data payload to classify it for residency rules.</p>
              <div className="flex flex-wrap gap-2">
                {DATA_TYPES.map(d => <Badge key={d} variant="outline" className="cursor-pointer hover:bg-muted">{d}</Badge>)}
              </div>
              <Button><Tag className="h-4 w-4 mr-2" />Classify</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
