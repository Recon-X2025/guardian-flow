import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/integrations/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from '@/components/ui/sonner';

interface SLAMetrics {
  compliance: number;
  total: number;
  completed: number;
  breached: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  firstTimeFixRate: number;
  atRiskCount: number;
}

interface SLAViolation {
  id: string;
  work_order_id: string;
  violation_type: string;
  severity: string;
  threshold_value: number;
  actual_value: number;
  detected_at: string;
  resolved_at: string | null;
}

export function EnhancedSLATab() {
  const [metrics, setMetrics] = useState<SLAMetrics | null>(null);
  const [violations, setViolations] = useState<SLAViolation[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; total: number; completed: number; breached: number; compliance: number | string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [predictionData, setPredictionData] = useState<{ atRiskOrders?: number; confidence?: number; recommendedActions?: number } | null>(null);

  useEffect(() => {
    fetchAllSLAData();
    const interval = setInterval(fetchAllSLAData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAllSLAData = async () => {
    try {
      await Promise.all([
        fetchSLAMetrics(),
        fetchViolations(),
        fetchTrendData(),
        fetchPredictions()
      ]);
    } catch (error) {
      console.error('Failed to fetch SLA data:', error);
      toast.error('Failed to load SLA data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSLAMetrics = async () => {
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const { data: workOrders } = await apiClient
      .from('work_orders')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .then();

    if (workOrders) {
      const total = workOrders.length;
      const completed = workOrders.filter(wo => wo.status === 'completed');
      const breached = workOrders.filter(wo => {
        if (!wo.completed_at || !wo.created_at) return false;
        const duration = new Date(wo.completed_at).getTime() - new Date(wo.created_at).getTime();
        return duration > 7 * 24 * 60 * 60 * 1000;
      });

      // Calculate at-risk work orders (> 5 days old, not completed)
      const atRisk = workOrders.filter(wo => {
        if (wo.status === 'completed') return false;
        const age = Date.now() - new Date(wo.created_at).getTime();
        return age > 5 * 24 * 60 * 60 * 1000;
      });

      const avgResponseTime = completed.reduce((sum, wo) => {
        if (!wo.signed_at) return sum;
        return sum + (new Date(wo.signed_at).getTime() - new Date(wo.created_at).getTime());
      }, 0) / (completed.length || 1) / (1000 * 60 * 60); // Convert to hours

      const avgResolutionTime = completed.reduce((sum, wo) => {
        return sum + (new Date(wo.completed_at).getTime() - new Date(wo.created_at).getTime());
      }, 0) / (completed.length || 1) / (1000 * 60 * 60);

      const compliance = total > 0 ? ((total - breached.length) / total * 100) : 100;
      // First-time fix rate: completed work orders resolved in a single attempt
      const firstTimeFixes = completed.filter(wo => !wo.attempt_count || wo.attempt_count <= 1).length;
      const firstTimeFixRate = completed.length > 0 ? (firstTimeFixes / completed.length * 100) : 0;

      setMetrics({
        compliance,
        total,
        completed: completed.length,
        breached: breached.length,
        avgResponseTime,
        avgResolutionTime,
        firstTimeFixRate,
        atRiskCount: atRisk.length
      });
    }
  };

  const fetchViolations = async () => {
    let query = apiClient
      .from('sla_violations')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(50);

    if (filterSeverity !== 'all') {
      query = query.eq('severity', filterSeverity);
    }

    const { data } = await query.then();
    if (data) setViolations(data as SLAViolation[]);
  };

  const fetchTrendData = async () => {
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const { data: workOrders } = await apiClient
      .from('work_orders')
      .select('created_at, completed_at, status')
      .gte('created_at', startDate.toISOString())
      .then();

    if (workOrders) {
      const dailyData: Record<string, { date: string; total: number; completed: number; breached: number; compliance: number }> = {};
      workOrders.forEach(wo => {
        const date = new Date(wo.created_at).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { date, total: 0, completed: 0, breached: 0, compliance: 0 };
        }
        dailyData[date].total++;
        if (wo.status === 'completed') {
          dailyData[date].completed++;
          if (wo.completed_at) {
            const duration = new Date(wo.completed_at).getTime() - new Date(wo.created_at).getTime();
            if (duration > 7 * 24 * 60 * 60 * 1000) {
              dailyData[date].breached++;
            }
          }
        }
      });

      const trendArray = Object.values(dailyData).map((day) => ({
        ...day,
        compliance: day.total > 0 ? ((day.total - day.breached) / day.total * 100).toFixed(1) : 100
      }));

      setTrendData(trendArray);
    }
  };

  const fetchPredictions = async () => {
    try {
      const result = await apiClient.functions.invoke('predict-sla-breach', {
        body: { timeframe: timeRange }
      });
      if (result.data) setPredictionData(result.data);
    } catch (error) {
      console.error('Prediction fetch failed:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-4 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-20" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end gap-2">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={metrics && metrics.compliance < 90 ? 'border-destructive' : ''}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              SLA Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics?.compliance.toFixed(1)}%
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              {metrics && metrics.compliance >= 95 ? (
                <><TrendingUp className="h-3 w-3 text-success" /> Excellent</>
              ) : metrics && metrics.compliance >= 90 ? (
                <><Activity className="h-3 w-3 text-warning" /> Good</>
              ) : (
                <><TrendingDown className="h-3 w-3 text-destructive" /> Needs Attention</>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics?.avgResponseTime.toFixed(1)}h
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Target: &lt;4h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              First Time Fix Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              {metrics?.firstTimeFixRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Target: &gt;90%
            </div>
          </CardContent>
        </Card>

        <Card className={metrics && metrics.atRiskCount > 0 ? 'border-warning' : ''}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">
              {metrics?.atRiskCount || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Orders at risk of breach
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="predictions">AI Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SLA Compliance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="compliance" stroke="#22c55e" name="Compliance %" />
                  <Line type="monotone" dataKey="breached" stroke="#ef4444" name="Breached" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Work Order Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#3b82f6" name="Total Orders" />
                  <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Recent SLA Violations</CardTitle>
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {violations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Work Order</TableHead>
                      <TableHead>Violation Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Detected</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violations.map((violation) => (
                      <TableRow key={violation.id}>
                        <TableCell className="font-mono text-sm">
                          {violation.work_order_id?.substring(0, 8)}
                        </TableCell>
                        <TableCell>{violation.violation_type}</TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(violation.severity) as "default" | "destructive" | "secondary" | "outline"}>
                            {violation.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{violation.threshold_value}</TableCell>
                        <TableCell>{violation.actual_value}</TableCell>
                        <TableCell>
                          {new Date(violation.detected_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {violation.resolved_at ? (
                            <Badge variant="outline" className="bg-success">Resolved</Badge>
                          ) : (
                            <Badge variant="destructive">Open</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No violations recorded. Excellent SLA performance!
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                AI-Powered SLA Breach Predictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {predictionData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-warning">
                          {predictionData.atRiskOrders || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Orders Predicted to Breach
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {predictionData.confidence || 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Model Confidence
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-primary">
                          {predictionData.recommendedActions || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Recommended Actions
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    AI model analyzes historical patterns, current workload, and resource availability to predict potential SLA breaches.
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>AI prediction model is training...</p>
                  <p className="text-xs mt-2">Predictions will be available once sufficient data is collected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}