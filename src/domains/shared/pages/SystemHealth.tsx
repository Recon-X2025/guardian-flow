import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Database, Bell, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

export default function SystemHealth() {
  const { data: healthMetrics, isLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const result = await apiClient.functions.invoke('health-monitor');
      if (result.error) throw result.error;
      return result.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: historicalMetrics } = useQuery({
    queryKey: ['system-health-history'],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from('system_health_metrics' as any)
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);
      if (result.error) throw result.error;
      return (data as any[])?.reverse();
    },
  });

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-6 w-6 text-green-500" />;
    if (score >= 70) return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
    return <AlertTriangle className="h-6 w-6 text-red-500" />;
  };

  const metrics = [
    { 
      key: 'db_latency', 
      label: 'Database Response', 
      icon: Database, 
      unit: 'ms',
      threshold: 100
    },
    { 
      key: 'forecast_queue_depth', 
      label: 'Forecast Queue', 
      icon: Activity, 
      unit: ' jobs',
      threshold: 50
    },
    { 
      key: 'pending_notifications', 
      label: 'Pending Notifications', 
      icon: Bell, 
      unit: ' items',
      threshold: 100
    },
    { 
      key: 'sync_backlog', 
      label: 'Sync Backlog', 
      icon: Zap, 
      unit: ' items',
      threshold: 20
    },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading system health...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Health Monitor</h1>
          <p className="text-muted-foreground">Real-time platform health metrics</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              {getHealthIcon(healthMetrics?.health_score || 0)}
              Overall Health Score
            </CardTitle>
            <div className={`text-4xl font-bold ${getHealthColor(healthMetrics?.health_score || 0)}`}>
              {healthMetrics?.health_score || 0}%
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={healthMetrics?.health_score || 0} className="h-3" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const value = healthMetrics?.metrics?.[metric.key] || 0;
          const isHealthy = value <= metric.threshold;
          const Icon = metric.icon;

          return (
            <Card key={metric.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <Badge variant={isHealthy ? 'default' : 'destructive'}>
                    {isHealthy ? 'Healthy' : 'Warning'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold">
                    {value}{metric.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Threshold: {metric.threshold}{metric.unit}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {historicalMetrics && historicalMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Health Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="health_score" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
