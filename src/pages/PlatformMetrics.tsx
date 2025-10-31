import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, TrendingUp, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function PlatformMetrics() {
  const { data: telemetry } = useQuery({
    queryKey: ['function-telemetry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('function_telemetry')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (error) throw error;
      return data;
    },
  });

  const avgResponseTime = telemetry?.reduce((acc, t) => acc + t.execution_time_ms, 0) / (telemetry?.length || 1);
  const successRate = ((telemetry?.filter(t => t.status === 'success').length || 0) / (telemetry?.length || 1)) * 100;
  const totalRequests = telemetry?.length || 0;
  const errorCount = telemetry?.filter(t => t.status === 'error').length || 0;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="w-8 h-8" />
          Platform Metrics
        </h1>
        <p className="text-muted-foreground">
          Real-time system performance monitoring
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 1000 requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgResponseTime)}ms</div>
            <Badge variant={avgResponseTime < 500 ? 'default' : 'destructive'}>
              {avgResponseTime < 500 ? 'Good' : 'Slow'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <Badge variant={successRate > 95 ? 'default' : 'destructive'}>
              {successRate > 95 ? 'Healthy' : 'Warning'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorCount}</div>
            <p className="text-xs text-muted-foreground">Failed requests</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}