import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, AlertTriangle, CheckCircle2, Clock, FileText, Users, Key, Activity } from "lucide-react";

export default function ComplianceCenter() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    vulnerabilities: { critical: 0, high: 0, total: 0 },
    incidents: { open: 0, critical: 0, total: 0 },
    patches: { pending: 0, overdue: 0, total: 0 },
    risks: { high: 0, critical: 0, total: 0 },
    vendors: { pending: 0, high_risk: 0, total: 0 },
    training: { overdue: 0, upcoming: 0, total: 0 },
    compliance: { compliant: 0, total: 0, percentage: 0 }
  });
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [complianceCheckpoints, setComplianceCheckpoints] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchComplianceData = async () => {
    setLoading(true);
    try {
      const [
        vulnRes,
        incidentRes,
        patchRes,
        riskRes,
        vendorRes,
        trainingRes,
        checkpointRes
      ] = await Promise.all([
        supabase.from('vulnerabilities' as any).select('*').order('severity'),
        supabase.from('security_incidents' as any).select('*').order('detected_at', { ascending: false }),
        supabase.from('security_patches' as any).select('*'),
        supabase.from('risk_assessments' as any).select('*').order('risk_score', { ascending: false }),
        supabase.from('vendor_assessments' as any).select('*'),
        supabase.from('security_training_records' as any).select('*'),
        supabase.from('compliance_checkpoints' as any).select('*')
      ]);

      if (vulnRes.error) throw vulnRes.error;
      if (incidentRes.error) throw incidentRes.error;
      if (patchRes.error) throw patchRes.error;
      if (riskRes.error) throw riskRes.error;
      if (vendorRes.error) throw vendorRes.error;
      if (trainingRes.error) throw trainingRes.error;
      if (checkpointRes.error) throw checkpointRes.error;

      setVulnerabilities(vulnRes.data || []);
      setIncidents(incidentRes.data || []);
      setComplianceCheckpoints(checkpointRes.data || []);

      // Calculate stats
      const vulns = (vulnRes.data || []) as any[];
      const incs = (incidentRes.data || []) as any[];
      const patches = (patchRes.data || []) as any[];
      const risks = (riskRes.data || []) as any[];
      const vendors = (vendorRes.data || []) as any[];
      const training = (trainingRes.data || []) as any[];
      const checkpoints = (checkpointRes.data || []) as any[];

      const compliantCount = checkpoints.filter(c => c.review_outcome === 'compliant').length;

      setStats({
        vulnerabilities: {
          critical: vulns.filter(v => v.severity === 'critical').length,
          high: vulns.filter(v => v.severity === 'high').length,
          total: vulns.length
        },
        incidents: {
          open: incs.filter(i => ['detected', 'investigating', 'contained'].includes(i.status)).length,
          critical: incs.filter(i => i.severity === 'critical').length,
          total: incs.length
        },
        patches: {
          pending: patches.filter(p => p.status === 'pending').length,
          overdue: patches.filter(p => new Date(p.target_deployment_date) < new Date() && p.status !== 'deployed').length,
          total: patches.length
        },
        risks: {
          high: risks.filter(r => r.risk_score >= 15).length,
          critical: risks.filter(r => r.risk_score >= 20).length,
          total: risks.length
        },
        vendors: {
          pending: vendors.filter(v => v.approval_status === 'pending').length,
          high_risk: vendors.filter(v => ['high', 'critical'].includes(v.overall_risk_rating)).length,
          total: vendors.length
        },
        training: {
          overdue: training.filter(t => !t.completed_date && new Date(t.scheduled_date) < new Date()).length,
          upcoming: training.filter(t => !t.completed_date && new Date(t.scheduled_date) >= new Date()).length,
          total: training.length
        },
        compliance: {
          compliant: compliantCount,
          total: checkpoints.length,
          percentage: checkpoints.length > 0 ? Math.round((compliantCount / checkpoints.length) * 100) : 0
        }
      });
    } catch (error: any) {
      toast({
        title: "Error loading compliance data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-100 text-red-800 border-red-300",
      high: "bg-orange-100 text-orange-800 border-orange-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      low: "bg-blue-100 text-blue-800 border-blue-300",
      info: "bg-gray-100 text-gray-800 border-gray-300"
    };
    return colors[severity] || colors.info;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">SOC 2 & ISO 27001 Compliance Center</h1>
        <p className="text-muted-foreground">
          Comprehensive security and compliance management dashboard
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={stats.compliance.percentage < 80 ? "border-orange-300" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.compliance.percentage}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.compliance.compliant} of {stats.compliance.total} controls
            </p>
          </CardContent>
        </Card>

        <Card className={stats.vulnerabilities.critical > 0 ? "border-red-300" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vulnerabilities</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vulnerabilities.critical}</div>
            <p className="text-xs text-muted-foreground">
              Critical • {stats.vulnerabilities.total} total
            </p>
          </CardContent>
        </Card>

        <Card className={stats.incidents.open > 0 ? "border-orange-300" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Incidents</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.incidents.open}</div>
            <p className="text-xs text-muted-foreground">
              Open • {stats.incidents.total} total
            </p>
          </CardContent>
        </Card>

        <Card className={stats.patches.overdue > 0 ? "border-red-300" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patches Overdue</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.patches.overdue}</div>
            <p className="text-xs text-muted-foreground">
              {stats.patches.pending} pending deployment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="vulnerabilities" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="vulnerabilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vulnerability Management</CardTitle>
              <CardDescription>Track and remediate security vulnerabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vulnerabilities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No vulnerabilities tracked yet</p>
                ) : (
                  vulnerabilities.map((vuln) => (
                    <div key={vuln.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{vuln.title}</h3>
                          <Badge className={getSeverityColor(vuln.severity)}>{vuln.severity}</Badge>
                          <Badge variant="outline">{vuln.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{vuln.vulnerability_id}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Component: {vuln.affected_component} • CVSS: {vuln.cvss_score || 'N/A'}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">View Details</Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Incident Management</CardTitle>
              <CardDescription>Track and respond to security incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {incidents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No incidents recorded</p>
                ) : (
                  incidents.map((incident) => (
                    <div key={incident.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{incident.title}</h3>
                          <Badge className={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
                          <Badge variant="outline">{incident.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{incident.incident_number}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Detected: {new Date(incident.detected_at).toLocaleString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">Manage</Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Checkpoints</CardTitle>
              <CardDescription>SOC 2 and ISO 27001 control implementation status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {complianceCheckpoints.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No compliance checkpoints defined yet</p>
                ) : (
                  complianceCheckpoints.map((checkpoint) => (
                    <div key={checkpoint.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{checkpoint.checkpoint_name}</h3>
                          <Badge>{checkpoint.framework}</Badge>
                          <Badge variant={checkpoint.review_outcome === 'compliant' ? 'default' : 'destructive'}>
                            {checkpoint.review_outcome || 'Not Reviewed'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{checkpoint.control_id}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Status: {checkpoint.implementation_status}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">Review</Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
              <CardDescription>Identified risks and mitigation strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Risk assessments will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Security Assessments</CardTitle>
              <CardDescription>Third-party risk management</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Vendor assessments will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training">
          <Card>
            <CardHeader>
              <CardTitle>Security Awareness Training</CardTitle>
              <CardDescription>Employee security training records</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Training records will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Compliance Framework Coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>✓ Access Controls & Authentication (SOC 2 CC6.1, ISO 27001 A.9)</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="flex items-center justify-between">
            <span>✓ Audit Logging & Monitoring (SOC 2 CC7.2, ISO 27001 A.12.4)</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="flex items-center justify-between">
            <span>✓ Vulnerability Management (ISO 27001 A.12.6)</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="flex items-center justify-between">
            <span>✓ Incident Response (SOC 2 CC7.3, ISO 27001 A.16)</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="flex items-center justify-between">
            <span>✓ Risk Assessment (SOC 2 CC3.1, ISO 27001 A.8.2)</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="flex items-center justify-between">
            <span>✓ Security Training (ISO 27001 A.7.2)</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
