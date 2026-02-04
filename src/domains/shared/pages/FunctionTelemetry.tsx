import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/integrations/api/client';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TelemetryData {
  function_name: string;
  execution_time_ms: number;
  status: string;
  security_level: string;
  created_at: string;
}

export default function FunctionTelemetry() {
  const [telemetry, setTelemetry] = useState<TelemetryData[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTelemetry = async () => {
    const { data } = await (apiClient as any)
      .from('function_telemetry')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      setTelemetry(data);
      calculateStats(data);
    }
  };

  const calculateStats = (data: TelemetryData[]) => {
    const byFunction = data.reduce((acc, t) => {
      if (!acc[t.function_name]) {
        acc[t.function_name] = { count: 0, avgTime: 0, errors: 0, times: [] };
      }
      acc[t.function_name].count++;
      acc[t.function_name].times.push(t.execution_time_ms);
      if (t.status === 'error') acc[t.function_name].errors++;
      return acc;
    }, {} as Record<string, any>);

    Object.keys(byFunction).forEach(fn => {
      const times = byFunction[fn].times;
      byFunction[fn].avgTime = times.reduce((a: number, b: number) => a + b, 0) / times.length;
    });

    setStats(byFunction);
  };

  const chartData = stats
    ? Object.entries(stats)
        .sort(([, a]: any, [, b]: any) => b.count - a.count)
        .slice(0, 10)
        .map(([name, data]: any) => ({
          name: name.replace('supabase/functions/', ''),
          calls: data.count,
          avgTime: Math.round(data.avgTime),
        }))
    : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Function Telemetry</h1>
        <p className="text-muted-foreground">Real-time performance monitoring for all edge functions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{telemetry.length}</div>
            <p className="text-xs text-muted-foreground">Last 100 calls</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                telemetry.reduce((sum, t) => sum + t.execution_time_ms, 0) / telemetry.length
              )}ms
            </div>
            <p className="text-xs text-muted-foreground">Across all functions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((telemetry.filter(t => t.status === 'error').length / telemetry.length) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {telemetry.filter(t => t.status === 'error').length} errors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Functions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(telemetry.map(t => t.function_name)).size}
            </div>
            <p className="text-xs text-muted-foreground">Active functions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Functions by Call Volume</CardTitle>
          <CardDescription>Average response time and call count</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="calls" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Function Calls</CardTitle>
          <CardDescription>Last 20 function invocations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {telemetry.slice(0, 20).map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 border rounded">
                <div className="flex-1 font-mono text-sm truncate">{t.function_name}</div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.status === 'success' ? 'default' : 'destructive'}>
                    {t.status}
                  </Badge>
                  <Badge variant="outline">{t.security_level}</Badge>
                  <span className="text-sm text-muted-foreground">{t.execution_time_ms}ms</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
