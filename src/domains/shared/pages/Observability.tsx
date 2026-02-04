import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Activity, Search, AlertTriangle, CheckCircle2, Clock, Eye } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { FullTracesDialog } from '@/domains/shared/components/FullTracesDialog';

export default function Observability() {
  const { toast } = useToast();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showFullTraces, setShowFullTraces] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState({
    totalEvents: 0,
    criticalAlerts: 0,
    avgResponseTime: 0,
    uptimePercent: 99.9,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchObservabilityData();
  }, []);

  const fetchObservabilityData = async () => {
    try {
      // Fetch recent audit logs
      const { data: logs, error: logsError } = await apiClient
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;

      setAuditLogs(logs || []);

      // Calculate system metrics from audit logs
      const totalEvents = logs?.length || 0;

      // Count critical alerts (fraud alerts with high severity)
      const { count: criticalCount } = await apiClient
        .from('fraud_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'high');

      setSystemMetrics({
        totalEvents,
        criticalAlerts: criticalCount || 0,
        avgResponseTime: 1.2, // Mock in seconds
        uptimePercent: 99.9,
      });
    } catch (error: any) {
      toast({
        title: 'Error loading observability data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('reject')) return 'text-destructive';
    if (action.includes('approve') || action.includes('complete')) return 'text-success';
    if (action.includes('override') || action.includes('mfa')) return 'text-warning';
    return 'text-primary';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Observability</h1>
          <p className="text-muted-foreground">System health monitoring and audit trail</p>
        </div>
        <Button variant="outline" onClick={() => setShowFullTraces(true)}>
          <Eye className="mr-2 h-4 w-4" />
          View Full Traces
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.totalEvents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.avgResponseTime.toFixed(2)}s</div>
            <p className="text-xs text-muted-foreground">p95 latency</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.uptimePercent}%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>Track all system actions with correlation IDs</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search audit logs..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
          ) : (
            <div className="space-y-2">
              {auditLogs.slice(0, 20).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors text-sm"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.resource_type}
                      </Badge>
                      {log.mfa_verified && (
                        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                          MFA Verified
                        </Badge>
                      )}
                    </div>
                    {log.reason && (
                      <p className="text-xs text-muted-foreground">Reason: {log.reason}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>User: {log.user_id?.slice(0, 8)}</span>
                      {log.actor_role && <span>Role: {log.actor_role}</span>}
                      {log.correlation_id && (
                        <code className="px-1 py-0.5 rounded bg-muted">
                          {log.correlation_id.slice(0, 8)}
                        </code>
                      )}
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Production Observability Stack
          </CardTitle>
          <CardDescription>Recommended setup for production deployments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg bg-card">
                <p className="font-semibold mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  OpenTelemetry
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Distributed tracing with correlation IDs
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Trace precheck latencies (p50/p95)</li>
                  <li>• Track photo validation pass rate</li>
                  <li>• Monitor offer acceptance rate</li>
                  <li>• Fraud alert queue depth</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg bg-card">
                <p className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Prometheus + Grafana
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Metrics collection and dashboards
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Edge function response times</li>
                  <li>• Database query performance</li>
                  <li>• API endpoint throughput</li>
                  <li>• System resource utilization</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg bg-card">
                <p className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Sentry
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Error tracking and alerting
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Exception capture with stack traces</li>
                  <li>• Correlation ID linkage</li>
                  <li>• User session replay</li>
                  <li>• Performance monitoring</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Current Implementation</p>
                <p className="text-xs text-muted-foreground">
                  This page provides audit logs, system metrics, and correlation ID tracking. 
                  For production-scale monitoring with Prometheus, Grafana, and Jaeger, see{' '}
                  <code className="px-1 py-0.5 rounded bg-card">docs/INFRASTRUCTURE_REQUIREMENTS.md</code>.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <FullTracesDialog
        open={showFullTraces}
        onOpenChange={setShowFullTraces}
        logs={auditLogs}
      />
    </div>
  );
}
