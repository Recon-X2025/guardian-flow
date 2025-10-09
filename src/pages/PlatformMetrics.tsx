import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, Clock, Users, TrendingUp } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function PlatformMetrics() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if user has sys_admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['sys_admin']);

    if (!roles || roles.length === 0) {
      navigate('/');
      return;
    }

    loadMetrics();
  };

  const loadMetrics = async () => {
    setLoading(true);
    try {
      // Get metrics from the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // Total API calls
      const { data: allCalls, count: totalCalls } = await supabase
        .from('api_usage_logs')
        .select('*', { count: 'exact' })
        .gte('timestamp', oneDayAgo.toISOString());

      // Success vs error rates
      const successCalls = allCalls?.filter(c => c.status_code >= 200 && c.status_code < 300).length || 0;
      const errorCalls = allCalls?.filter(c => c.status_code >= 400).length || 0;
      const successRate = totalCalls ? (successCalls / totalCalls) * 100 : 0;

      // Group by endpoint
      const endpointStats: any = {};
      allCalls?.forEach(call => {
        if (!endpointStats[call.endpoint]) {
          endpointStats[call.endpoint] = {
            endpoint: call.endpoint,
            total: 0,
            success: 0,
            error: 0,
            avgLatency: 0,
            latencies: [],
          };
        }
        endpointStats[call.endpoint].total++;
        if (call.status_code >= 200 && call.status_code < 300) {
          endpointStats[call.endpoint].success++;
        } else if (call.status_code >= 400) {
          endpointStats[call.endpoint].error++;
        }
        if (call.response_time) {
          endpointStats[call.endpoint].latencies.push(call.response_time);
        }
      });

      // Calculate average latencies
      Object.keys(endpointStats).forEach(key => {
        const stat = endpointStats[key];
        if (stat.latencies.length > 0) {
          stat.avgLatency = Math.round(
            stat.latencies.reduce((a: number, b: number) => a + b, 0) / stat.latencies.length
          );
        }
      });

      const endpointArray = Object.values(endpointStats).sort((a: any, b: any) => b.total - a.total);

      // Top tenants by usage
      const tenantUsage: any = {};
      allCalls?.forEach(call => {
        if (!tenantUsage[call.tenant_id]) {
          tenantUsage[call.tenant_id] = {
            tenant_id: call.tenant_id,
            calls: 0,
          };
        }
        tenantUsage[call.tenant_id].calls++;
      });

      const topTenants = Object.values(tenantUsage)
        .sort((a: any, b: any) => b.calls - a.calls)
        .slice(0, 5);

      // Hourly breakdown
      const hourlyData: any = {};
      allCalls?.forEach(call => {
        const hour = new Date(call.timestamp).getHours();
        if (!hourlyData[hour]) {
          hourlyData[hour] = { hour: `${hour}:00`, calls: 0, errors: 0 };
        }
        hourlyData[hour].calls++;
        if (call.status_code >= 400) {
          hourlyData[hour].errors++;
        }
      });

      const hourlyArray = Object.values(hourlyData).sort((a: any, b: any) => a.hour.localeCompare(b.hour));

      setMetrics({
        totalCalls,
        successCalls,
        errorCalls,
        successRate,
        endpoints: endpointArray,
        topTenants,
        hourlyData: hourlyArray,
      });

    } catch (error: any) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading metrics...</div>;
  }

  if (!metrics) {
    return <div className="flex items-center justify-center min-h-screen">No data available</div>;
  }

  const errorRate = metrics.totalCalls ? (metrics.errorCalls / metrics.totalCalls) * 100 : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Platform Metrics</h1>
          <p className="text-muted-foreground mt-2">System-wide observability and analytics (Last 24 hours)</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Total API Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalCalls?.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.successRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">{metrics.successCalls.toLocaleString()} successful</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Error Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{errorRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">{metrics.errorCalls.toLocaleString()} errors</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Active Tenants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.topTenants.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Hourly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Hourly API Usage</CardTitle>
            <CardDescription>Last 24 hours breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="calls" fill="hsl(var(--primary))" name="Total Calls" />
                <Bar dataKey="errors" fill="hsl(var(--destructive))" name="Errors" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Endpoint Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Endpoint Performance</CardTitle>
            <CardDescription>Calls, success rate, and average latency</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead className="text-right">Total Calls</TableHead>
                  <TableHead className="text-right">Success</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="text-right">Success Rate</TableHead>
                  <TableHead className="text-right">Avg Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.endpoints.slice(0, 10).map((endpoint: any) => {
                  const rate = endpoint.total ? (endpoint.success / endpoint.total) * 100 : 0;
                  return (
                    <TableRow key={endpoint.endpoint}>
                      <TableCell className="font-mono text-xs">{endpoint.endpoint}</TableCell>
                      <TableCell className="text-right">{endpoint.total.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-500">{endpoint.success.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-500">{endpoint.error.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={rate >= 95 ? 'default' : rate >= 90 ? 'secondary' : 'destructive'}>
                          {rate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{endpoint.avgLatency}ms</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Tenants */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Tenants by Usage</CardTitle>
            <CardDescription>Most active tenants in the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Tenant ID</TableHead>
                  <TableHead className="text-right">API Calls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.topTenants.map((tenant: any, index: number) => (
                  <TableRow key={tenant.tenant_id}>
                    <TableCell className="font-bold">{index + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{tenant.tenant_id}</TableCell>
                    <TableCell className="text-right font-medium">{tenant.calls.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
