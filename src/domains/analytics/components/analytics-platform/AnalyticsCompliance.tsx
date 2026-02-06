import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileCheck, Download, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Workspace {
  id: string;
  name: string;
}

export function AnalyticsCompliance() {
  const [selectedFramework, setSelectedFramework] = useState("soc2");
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");

  const { data: workspaces } = useQuery({
    queryKey: ["analytics-workspaces"],
    queryFn: async () => {
      const result = await apiClient.functions.invoke("analytics-workspace-manager", {
        body: { action: "list" },
      });
      if (result.error) throw result.error;
      return result.data?.workspaces || [];
    },
  });

  // Mock compliance data
  const complianceStatus = {
    soc2: {
      overall: 94,
      controls: [
        { id: "CC1.1", name: "COSO Principles", status: "compliant", evidence: 12 },
        { id: "CC2.1", name: "Communication Integrity", status: "compliant", evidence: 8 },
        { id: "CC3.1", name: "Risk Assessment", status: "partial", evidence: 5 },
        { id: "CC4.1", name: "Monitoring Activities", status: "compliant", evidence: 15 },
        { id: "CC5.1", name: "Control Activities", status: "compliant", evidence: 10 },
        { id: "CC6.1", name: "Logical Access", status: "partial", evidence: 7 },
        { id: "CC7.1", name: "System Operations", status: "compliant", evidence: 18 },
        { id: "CC8.1", name: "Change Management", status: "compliant", evidence: 9 },
        { id: "CC9.1", name: "Risk Mitigation", status: "non_compliant", evidence: 2 },
      ],
    },
    iso27001: {
      overall: 87,
      controls: [
        { id: "A.5", name: "Information Security Policies", status: "compliant", evidence: 6 },
        { id: "A.6", name: "Organization of Info Security", status: "compliant", evidence: 9 },
        { id: "A.7", name: "Human Resource Security", status: "partial", evidence: 4 },
        { id: "A.8", name: "Asset Management", status: "compliant", evidence: 11 },
        { id: "A.9", name: "Access Control", status: "compliant", evidence: 14 },
        { id: "A.10", name: "Cryptography", status: "partial", evidence: 5 },
        { id: "A.12", name: "Operations Security", status: "compliant", evidence: 16 },
        { id: "A.14", name: "System Acquisition", status: "non_compliant", evidence: 3 },
      ],
    },
    gdpr: {
      overall: 91,
      controls: [
        { id: "Art.5", name: "Principles of Processing", status: "compliant", evidence: 10 },
        { id: "Art.6", name: "Lawfulness of Processing", status: "compliant", evidence: 8 },
        { id: "Art.25", name: "Data Protection by Design", status: "compliant", evidence: 12 },
        { id: "Art.30", name: "Records of Processing", status: "partial", evidence: 6 },
        { id: "Art.32", name: "Security of Processing", status: "compliant", evidence: 15 },
        { id: "Art.33", name: "Breach Notification", status: "compliant", evidence: 7 },
      ],
    },
  };

  const currentFramework = complianceStatus[selectedFramework as keyof typeof complianceStatus];

  const handleExport = () => {
    toast.success(`Exporting ${selectedFramework.toUpperCase()} compliance report...`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "compliant":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Compliant</Badge>;
      case "partial":
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Partial</Badge>;
      case "non_compliant":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Non-Compliant</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces?.map((ws: Workspace) => (
                <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedFramework} onValueChange={setSelectedFramework}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="soc2">SOC 2 Type II</SelectItem>
              <SelectItem value="iso27001">ISO 27001</SelectItem>
              <SelectItem value="gdpr">GDPR</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentFramework.overall}%</div>
            <Progress value={currentFramework.overall} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Compliant</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentFramework.controls.filter(c => c.status === 'compliant').length}
            </div>
            <p className="text-xs text-muted-foreground">Controls</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Partial</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentFramework.controls.filter(c => c.status === 'partial').length}
            </div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Evidence Collected</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentFramework.controls.reduce((sum, c) => sum + c.evidence, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Artifacts</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls List */}
      <Card>
        <CardHeader>
          <CardTitle>{selectedFramework.toUpperCase()} Control Requirements</CardTitle>
          <CardDescription>Compliance status and evidence collection progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentFramework.controls.map((control) => (
              <div key={control.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-sm font-medium">{control.id}</span>
                    <h4 className="font-medium">{control.name}</h4>
                    {getStatusBadge(control.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{control.evidence} evidence artifacts</span>
                    <span>Last reviewed: {new Date().toLocaleDateString()}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "Compliance Evidence", description: `${control.evidence} artifacts available for ${control.name}` })}>
                  View Evidence
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Heatmap</CardTitle>
          <CardDescription>Compliance risk assessment matrix</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {[...Array(25)].map((_, i) => {
              const severity = Math.floor(Math.random() * 4);
              const colors = ['bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];
              return (
                <div
                  key={i}
                  className={`h-12 rounded ${colors[severity]} opacity-${severity + 1}0`}
                  title={`Risk ${i + 1}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-4 text-xs text-muted-foreground">
            <span>Low Risk</span>
            <span>High Risk</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
