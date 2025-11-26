import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, FileText, UserCheck, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ComplianceDashboard() {
  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: behaviorEvents } = useQuery({
    queryKey: ['user-behavior'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_behavior_events' as any)
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: complianceReports } = useQuery({
    queryKey: ['compliance-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_reports' as any)
        .select('*')
        .order('generated_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const anomalyCount = behaviorEvents?.filter(e => e.anomaly_score && e.anomaly_score > 0.7).length || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compliance & Security</h1>
        <p className="text-muted-foreground">Monitor audit trails and user behavior</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Audit Events</p>
                <p className="text-2xl font-bold">{auditLogs?.length || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Behavior Events</p>
                <p className="text-2xl font-bold">{behaviorEvents?.length || 0}</p>
              </div>
              <UserCheck className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Anomalies Detected</p>
                <p className="text-2xl font-bold text-red-500">{anomalyCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliance Status</p>
                <p className="text-2xl font-bold text-green-500">Active</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="behavior">User Behavior</TabsTrigger>
          <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          {auditLogs?.map((log) => (
            <Card key={log.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge>{log.action}</Badge>
                      <span className="text-sm text-muted-foreground">{log.resource_type}</span>
                    </div>
                    <p className="text-sm">
                      {log.actor_role && `Role: ${log.actor_role}`}
                      {log.mfa_verified && <CheckCircle className="inline h-4 w-4 ml-2 text-green-500" />}
                    </p>
                    {log.reason && <p className="text-sm text-muted-foreground">Reason: {log.reason}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          {behaviorEvents?.map((event) => (
            <Card key={event.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={event.anomaly_score && event.anomaly_score > 0.7 ? 'destructive' : 'secondary'}>
                        {event.event_type}
                      </Badge>
                      {event.anomaly_score && event.anomaly_score > 0.7 && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    {event.anomaly_score && (
                      <p className="text-sm">
                        Anomaly Score: <span className="font-bold">{(event.anomaly_score * 100).toFixed(1)}%</span>
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {complianceReports?.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{report.report_type}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Period: {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={report.compliance_score && report.compliance_score > 90 ? 'default' : 'destructive'}>
                    Score: {report.compliance_score}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {report.findings && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Key Findings:</p>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                      {JSON.stringify(report.findings, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
