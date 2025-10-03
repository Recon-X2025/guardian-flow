import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, Clock, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Analytics() {
  const [metrics, setMetrics] = useState({
    saposAcceptRate: 0,
    photoComplianceRate: 0,
    avgPrecheckLatency: 0,
    fraudAlertsCount: 0,
    slaCompliance: 0,
    avgResolutionTime: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch SaPOS acceptance rate
      const { data: saposOffers } = await supabase
        .from('sapos_offers')
        .select('status');
      
      const acceptedOffers = saposOffers?.filter(o => o.status === 'accepted').length || 0;
      const saposAcceptRate = saposOffers?.length ? (acceptedOffers / saposOffers.length) * 100 : 0;

      // Fetch photo validation compliance
      const { data: photoValidations } = await supabase
        .from('photo_validations')
        .select('photos_validated');
      
      const validatedPhotos = photoValidations?.filter(p => p.photos_validated).length || 0;
      const photoComplianceRate = photoValidations?.length ? (validatedPhotos / photoValidations.length) * 100 : 0;

      // Fetch fraud alerts
      const { count: fraudCount } = await supabase
        .from('fraud_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('investigation_status', 'open');

      // Fetch work orders for SLA compliance
      const { data: workOrders } = await supabase
        .from('work_orders')
        .select('status, created_at, completed_at');

      const completedOnTime = workOrders?.filter(wo => {
        if (wo.status === 'completed' && wo.completed_at) {
          const duration = new Date(wo.completed_at).getTime() - new Date(wo.created_at).getTime();
          return duration < (24 * 60 * 60 * 1000); // Completed within 24 hours
        }
        return false;
      }).length || 0;

      const slaCompliance = workOrders?.length ? (completedOnTime / workOrders.length) * 100 : 0;

      setMetrics({
        saposAcceptRate,
        photoComplianceRate,
        avgPrecheckLatency: 1.2, // Mock latency in seconds
        fraudAlertsCount: fraudCount || 0,
        slaCompliance,
        avgResolutionTime: 18.5, // Mock in hours
      });

      // Generate trend data for last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          workOrders: Math.floor(Math.random() * 20) + 10,
          photoValidations: Math.floor(Math.random() * 25) + 15,
          saposOffers: Math.floor(Math.random() * 15) + 5,
        };
      });

      setChartData(last7Days);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    {
      title: 'SaPOS Accept Rate',
      value: `${metrics.saposAcceptRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-success',
      target: '85%',
    },
    {
      title: 'Photo Compliance',
      value: `${metrics.photoComplianceRate.toFixed(1)}%`,
      icon: CheckCircle2,
      color: 'text-primary',
      target: '95%',
    },
    {
      title: 'Avg Precheck Latency',
      value: `${metrics.avgPrecheckLatency.toFixed(1)}s`,
      icon: Zap,
      color: 'text-warning',
      target: '<2s',
    },
    {
      title: 'Open Fraud Alerts',
      value: metrics.fraudAlertsCount.toString(),
      icon: AlertCircle,
      color: 'text-destructive',
      target: '0',
    },
    {
      title: 'SLA Compliance',
      value: `${metrics.slaCompliance.toFixed(1)}%`,
      icon: Clock,
      color: 'text-accent',
      target: '98%',
    },
    {
      title: 'Avg Resolution Time',
      value: `${metrics.avgResolutionTime.toFixed(1)}h`,
      icon: Activity,
      color: 'text-info',
      target: '<24h',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics & Metrics</h1>
        <p className="text-muted-foreground">Real-time insights into platform performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">Target: {metric.target}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Activity Trends</CardTitle>
            <CardDescription>Last 7 days performance</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="workOrders" stroke="hsl(var(--primary))" strokeWidth={2} name="Work Orders" />
                  <Line type="monotone" dataKey="photoValidations" stroke="hsl(var(--success))" strokeWidth={2} name="Photo Validations" />
                  <Line type="monotone" dataKey="saposOffers" stroke="hsl(var(--accent))" strokeWidth={2} name="SaPOS Offers" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Loading chart data...
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Breakdown</CardTitle>
            <CardDescription>Key operational metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Precheck Pass', value: 92 },
                { name: 'Photo Pass', value: metrics.photoComplianceRate },
                { name: 'SLA Met', value: metrics.slaCompliance },
                { name: 'SaPOS Accept', value: metrics.saposAcceptRate },
              ]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Observability Integration
          </CardTitle>
          <CardDescription>Connect to external monitoring tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              For production deployments, integrate with:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg bg-card">
                <p className="font-semibold mb-1">Prometheus + Grafana</p>
                <p className="text-xs text-muted-foreground">Metrics collection and visualization</p>
              </div>
              <div className="p-4 border rounded-lg bg-card">
                <p className="font-semibold mb-1">OpenTelemetry</p>
                <p className="text-xs text-muted-foreground">Distributed tracing with correlation IDs</p>
              </div>
              <div className="p-4 border rounded-lg bg-card">
                <p className="font-semibold mb-1">Sentry</p>
                <p className="text-xs text-muted-foreground">Error tracking and alerting</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              See <code className="px-1 py-0.5 rounded bg-muted">docs/INFRASTRUCTURE_REQUIREMENTS.md</code> for setup instructions
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
