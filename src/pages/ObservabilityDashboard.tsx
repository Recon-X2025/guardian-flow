import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, 
  Activity, 
  Database, 
  Zap, 
  TrendingUp, 
  Shield,
  Eye,
  EyeOff,
  Settings,
  BarChart3
} from 'lucide-react';
import { useRBAC } from '@/contexts/RBACContext';
import { toast } from 'sonner';

export default function ObservabilityDashboard() {
  const { tenantId, hasAnyRole } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user has observability access
  const canViewObservability = hasAnyRole(['sys_admin', 'ops_manager', 'tenant_admin', 'ml_ops']);

  // Fetch observability config for tenant
  const { data: config, refetch: refetchConfig } = useQuery({
    queryKey: ['observability-config', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('observability_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: canViewObservability && !!tenantId,
  });

  // Fetch frontend errors
  const { data: errors, isLoading: errorsLoading } = useQuery({
    queryKey: ['frontend-errors', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('frontend_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (searchTerm) {
        query = query.ilike('error_message', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: canViewObservability && (config?.error_logging_enabled || false),
    refetchInterval: 30000,
  });

  // Fetch trace spans
  const { data: traces, isLoading: tracesLoading } = useQuery({
    queryKey: ['trace-spans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trace_spans')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: canViewObservability && (config?.tracing_enabled || false),
    refetchInterval: 30000,
  });

  // Fetch system health metrics
  const { data: healthMetrics, isLoading: healthLoading } = useQuery({
    queryKey: ['system-health-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_health_metrics')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: canViewObservability && (config?.health_monitoring_enabled || false),
    refetchInterval: 10000,
  });

  const handleConfigUpdate = async (field: string, value: boolean) => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('observability_config')
        .upsert({
          tenant_id: tenantId,
          [field]: value,
          enabled: true,
        }, {
          onConflict: 'tenant_id',
        });

      if (error) throw error;
      
      toast.success('Configuration updated');
      refetchConfig();
    } catch (error) {
      console.error('Failed to update config:', error);
      toast.error('Failed to update configuration');
    }
  };

  if (!canViewObservability) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You don't have permission to view observability data.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'warning';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Observability Dashboard</h1>
          <p className="text-muted-foreground">
            Enterprise-grade monitoring and diagnostics
          </p>
        </div>
        <Badge variant={config?.enabled ? 'success' : 'secondary'}>
          {config?.enabled ? (
            <>
              <Eye className="h-3 w-3 mr-1" />
              Monitoring Active
            </>
          ) : (
            <>
              <EyeOff className="h-3 w-3 mr-1" />
              Monitoring Disabled
            </>
          )}
        </Badge>
      </div>

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Observability Configuration
          </CardTitle>
          <CardDescription>
            Enable or disable monitoring features for your tenant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="error-logging">Error Logging</Label>
              <p className="text-sm text-muted-foreground">
                Track frontend errors and exceptions
              </p>
            </div>
            <Switch
              id="error-logging"
              checked={config?.error_logging_enabled || false}
              onCheckedChange={(checked) => handleConfigUpdate('error_logging_enabled', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="tracing">Distributed Tracing</Label>
              <p className="text-sm text-muted-foreground">
                Monitor request flows across services
              </p>
            </div>
            <Switch
              id="tracing"
              checked={config?.tracing_enabled || false}
              onCheckedChange={(checked) => handleConfigUpdate('tracing_enabled', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="health">Health Monitoring</Label>
              <p className="text-sm text-muted-foreground">
                Real-time system health metrics
              </p>
            </div>
            <Switch
              id="health"
              checked={config?.health_monitoring_enabled || false}
              onCheckedChange={(checked) => handleConfigUpdate('health_monitoring_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="errors">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Errors
          </TabsTrigger>
          <TabsTrigger value="traces">
            <Activity className="h-4 w-4 mr-2" />
            Traces
          </TabsTrigger>
          <TabsTrigger value="health">
            <Database className="h-4 w-4 mr-2" />
            System Health
          </TabsTrigger>
        </TabsList>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Frontend Errors</CardTitle>
                <Input
                  placeholder="Search errors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {!config?.error_logging_enabled ? (
                <p className="text-muted-foreground text-center py-8">
                  Error logging is disabled. Enable it in configuration to see errors.
                </p>
              ) : errorsLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading errors...</p>
              ) : errors && errors.length > 0 ? (
                <div className="space-y-2">
                  {errors.map((error) => (
                    <Card key={error.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={getSeverityColor(error.severity)}>
                              {error.severity}
                            </Badge>
                            {error.component_name && (
                              <span className="text-sm text-muted-foreground">
                                {error.component_name}
                              </span>
                            )}
                          </div>
                          <p className="font-medium">{error.error_message}</p>
                          {error.url && (
                            <p className="text-sm text-muted-foreground">{error.url}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(error.created_at).toLocaleString()}
                        </span>
                      </div>
                      {error.error_stack && (
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                          {error.error_stack.slice(0, 200)}...
                        </pre>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No errors found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Traces Tab */}
        <TabsContent value="traces" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distributed Traces</CardTitle>
              <CardDescription>Request flow across services</CardDescription>
            </CardHeader>
            <CardContent>
              {!config?.tracing_enabled ? (
                <p className="text-muted-foreground text-center py-8">
                  Distributed tracing is disabled. Enable it in configuration.
                </p>
              ) : tracesLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading traces...</p>
              ) : traces && traces.length > 0 ? (
                <div className="space-y-2">
                  {traces.map((trace) => (
                    <Card key={trace.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={trace.status === 'ok' ? 'success' : 'destructive'}>
                              {trace.status}
                            </Badge>
                            <span className="font-medium">{trace.span_name}</span>
                            <span className="text-sm text-muted-foreground">
                              {trace.service_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Duration: {trace.duration_ms}ms</span>
                            <span>Trace ID: {trace.trace_id.slice(0, 8)}...</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(trace.start_time).toLocaleString()}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No traces found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {healthMetrics?.slice(0, 4).map((metric) => (
              <Card key={metric.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.metric_name}
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metric.metric_value}
                    {metric.metric_unit && <span className="text-sm ml-1">{metric.metric_unit}</span>}
                  </div>
                  {metric.status && (
                    <Badge variant={getStatusColor(metric.status)} className="mt-2">
                      {metric.status}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Health Metrics</CardTitle>
              <CardDescription>Real-time system performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              {!config?.health_monitoring_enabled ? (
                <p className="text-muted-foreground text-center py-8">
                  Health monitoring is disabled. Enable it in configuration.
                </p>
              ) : healthLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading metrics...</p>
              ) : healthMetrics && healthMetrics.length > 0 ? (
                <div className="space-y-2">
                  {healthMetrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{metric.metric_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(metric.recorded_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg">
                          {metric.metric_value}
                          {metric.metric_unit}
                        </span>
                        {metric.status && (
                          <Badge variant={getStatusColor(metric.status)}>
                            {metric.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No health metrics available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
