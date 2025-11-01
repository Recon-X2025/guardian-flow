import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Shield, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle,
  Download,
  RefreshCw
} from "lucide-react";

type ComplianceFramework = "SOC2" | "ISO27001" | "HIPAA" | "GDPR";

type ComplianceControl = {
  id: string;
  framework: ComplianceFramework;
  control_id: string;
  title: string;
  description: string;
  status: "compliant" | "partial" | "non_compliant" | "not_applicable";
  evidence_count: number;
  last_reviewed: string;
};

type ComplianceEvidence = {
  id: string;
  control_id: string;
  type: string;
  description: string;
  collected_at: string;
  verified: boolean;
};

export default function AdvancedComplianceModule() {
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework>("SOC2");
  const [controls, setControls] = useState<ComplianceControl[]>([]);
  const [evidence, setEvidence] = useState<ComplianceEvidence[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [complianceScore, setComplianceScore] = useState(0);

  useEffect(() => {
    loadComplianceData();
  }, [selectedFramework]);

  const loadComplianceData = async () => {
    try {
      const { data: controlsData } = await supabase
        .from("compliance_controls")
        .select("*")
        .eq("framework", selectedFramework)
        .order("control_id");

      if (controlsData) {
        setControls(controlsData);
        calculateComplianceScore(controlsData);
      }

      const { data: evidenceData } = await supabase
        .from("compliance_evidence")
        .select("*")
        .order("collected_at", { ascending: false })
        .limit(50);

      if (evidenceData) {
        setEvidence(evidenceData);
      }
    } catch (error) {
      console.error("Error loading compliance data:", error);
    }
  };

  const calculateComplianceScore = (controls: ComplianceControl[]) => {
    if (controls.length === 0) return;
    
    const compliant = controls.filter(c => c.status === "compliant").length;
    const score = (compliant / controls.length) * 100;
    setComplianceScore(Math.round(score));
  };

  const collectEvidence = async () => {
    setIsCollecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("collect-compliance-evidence", {
        body: { framework: selectedFramework }
      });

      if (error) throw error;

      toast.success(`Collected ${data.evidenceCount} new evidence items`);
      loadComplianceData();
    } catch (error: any) {
      console.error("Evidence collection error:", error);
      toast.error("Failed to collect evidence");
    } finally {
      setIsCollecting(false);
    }
  };

  const generateAuditReport = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-compliance-report", {
        body: { framework: selectedFramework }
      });

      if (error) throw error;

      // Download report
      const blob = new Blob([data.reportData], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedFramework}_Compliance_Report_${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();

      toast.success("Audit report generated");
    } catch (error: any) {
      console.error("Report generation error:", error);
      toast.error("Failed to generate report");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant": return "bg-green-500";
      case "partial": return "bg-yellow-500";
      case "non_compliant": return "bg-red-500";
      case "not_applicable": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Compliance & Regulatory Automation
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated compliance monitoring and evidence collection
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={collectEvidence} disabled={isCollecting}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isCollecting ? "animate-spin" : ""}`} />
            Collect Evidence
          </Button>
          <Button onClick={generateAuditReport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(["SOC2", "ISO27001", "HIPAA", "GDPR"] as ComplianceFramework[]).map((framework) => (
          <Card
            key={framework}
            className={`cursor-pointer transition-all ${
              selectedFramework === framework ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedFramework(framework)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{framework}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-secondary"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - complianceScore / 100)}`}
                      className="text-primary transition-all"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{complianceScore}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="controls" className="w-full">
        <TabsList>
          <TabsTrigger value="controls">Controls ({controls.length})</TabsTrigger>
          <TabsTrigger value="evidence">Evidence ({evidence.length})</TabsTrigger>
          <TabsTrigger value="gaps">Gaps & Remediation</TabsTrigger>
        </TabsList>

        <TabsContent value="controls" className="space-y-3">
          {controls.map((control) => (
            <Card key={control.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{control.control_id}</Badge>
                      <Badge className={getStatusColor(control.status)}>
                        {control.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <CardTitle className="text-base">{control.title}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {control.description}
                    </CardDescription>
                  </div>
                  {control.status === "compliant" ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : control.status === "non_compliant" ? (
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {control.evidence_count} evidence item(s)
                  </span>
                  <span className="text-muted-foreground">
                    Last reviewed: {new Date(control.last_reviewed).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="evidence" className="space-y-3">
          {evidence.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FileCheck className="w-4 h-4" />
                      <span className="font-semibold">{item.type}</span>
                      {item.verified && (
                        <Badge variant="default" className="bg-green-500">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Collected: {new Date(item.collected_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="gaps">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Gaps & Remediation Plan</CardTitle>
              <CardDescription>
                Actions required to achieve full compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {controls.filter(c => c.status !== "compliant" && c.status !== "not_applicable").map((control) => (
                <div key={control.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{control.control_id}: {control.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Status: <span className="font-medium">{control.status.replace("_", " ")}</span>
                      </p>
                    </div>
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2">Recommended Actions:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Collect additional evidence documentation</li>
                      <li>Implement automated monitoring controls</li>
                      <li>Schedule quarterly review with compliance officer</li>
                    </ul>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
