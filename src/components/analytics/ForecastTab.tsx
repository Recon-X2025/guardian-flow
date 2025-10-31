import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface ForecastDataPoint {
  date: string;
  forecast: number;
  actual: number;
}

interface ForecastMetrics {
  totalForecast: number;
  totalActual: number;
  accuracy: string;
}

export function ForecastTab() {
  const [forecastData, setForecastData] = useState<ForecastDataPoint[]>([]);
  const [metrics, setMetrics] = useState<ForecastMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecastData();
  }, []);

  const fetchForecastData = async () => {
    try {
      console.log('[ForecastTab] Starting data fetch...');
      
      // Get forecast outputs for next 90 days
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0];

      // Resolve tenant for RLS-scoped reads
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .maybeSingle();
      const tenantId = profile?.tenant_id || user?.id || null;

      console.log('[ForecastTab] Querying forecasts from', today, 'to', future, 'tenant', tenantId);

      let forecastQuery = supabase.from('forecast_outputs')
        .select('target_date, value, forecast_type')
        .gte('target_date', today)
        .lte('target_date', future);
      
      if (tenantId) {
        forecastQuery = forecastQuery.eq('tenant_id', tenantId);
      }
      
      const { data: forecasts, error: forecastError } = await forecastQuery.order('target_date');

      if (forecastError) {
        console.error('[ForecastTab] Forecast query error:', forecastError);
        throw forecastError;
      }

      console.log('[ForecastTab] Fetched forecasts:', forecasts?.length || 0);

      // Get actual work orders for comparison (past 90 days)
      const past90Days = new Date(Date.now() - 90*24*60*60*1000).toISOString();
      
      const actualsResult = tenantId
        ? await (supabase.from('work_orders') as any).select('created_at').gte('created_at', past90Days).eq('tenant_id', tenantId).order('created_at')
        : await (supabase.from('work_orders') as any).select('created_at').gte('created_at', past90Days).order('created_at');
      
      const actuals = actualsResult.data;
      const actualsError = actualsResult.error;

      if (actualsError) {
        console.error('[ForecastTab] Actuals query error:', actualsError);
      }

      console.log('[ForecastTab] Fetched actuals:', actuals?.length || 0);

      if (forecasts && forecasts.length > 0) {
        const forecastByDate = forecasts.reduce((acc: Record<string, number>, f: any) => {
          acc[f.target_date] = (acc[f.target_date] || 0) + Number(f.value);
          return acc;
        }, {});

        const actualByDate = (actuals || []).reduce((acc: Record<string, number>, wo: any) => {
          const day = new Date(wo.created_at).toISOString().split('T')[0];
          acc[day] = (acc[day] || 0) + 1;
          return acc;
        }, {});

        const allDates = [...new Set([...Object.keys(forecastByDate), ...Object.keys(actualByDate)])].sort();
        
        console.log('[ForecastTab] Processing', allDates.length, 'dates');
        
        const chartData = allDates.map(date => ({
          date,
          forecast: forecastByDate[date] || 0,
          actual: actualByDate[date] || 0
        }));

        setForecastData(chartData);

        // Calculate metrics
        const totalForecast = chartData.reduce((sum, d) => sum + d.forecast, 0);
        const totalActual = chartData.reduce((sum, d) => sum + d.actual, 0);
        const mape = totalActual > 0 ? Math.abs((totalForecast - totalActual) / totalActual * 100) : 0;

        setMetrics({
          totalForecast: Math.round(totalForecast),
          totalActual,
          accuracy: Math.max(0, 100 - mape).toFixed(1)
        });

        console.log('[ForecastTab] Metrics calculated:', {
          totalForecast: Math.round(totalForecast),
          totalActual,
          accuracy: Math.max(0, 100 - mape).toFixed(1)
        });
      } else {
        console.warn('[ForecastTab] No forecast data found');
        setForecastData([]);
        setMetrics({ totalForecast: 0, totalActual: 0, accuracy: '0' });
      }
    } catch (error) {
      console.error('[ForecastTab] Failed to fetch forecast data:', error);
      setForecastData([]);
      setMetrics({ totalForecast: 0, totalActual: 0, accuracy: '0' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Forecast Horizon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">90 Days</div>
            <p className="text-xs text-muted-foreground">Next 3 months available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Projected Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-20" /> : metrics?.totalForecast || 0}
            </div>
            <p className="text-xs text-muted-foreground">Work orders (next 90d)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-20" /> : `${metrics?.accuracy || 0}%`}
            </div>
            <Badge variant={Number(metrics?.accuracy) > 90 ? 'default' : 'secondary'}>
              {Number(metrics?.accuracy) > 90 ? 'Excellent' : 'Good'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Forecast vs Actual Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast vs Actual Volume</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[400px]" />
          ) : forecastData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">No forecast data available</p>
                <p className="text-sm">Run the forecast engine to generate predictions</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                />
                <Legend />
                <Bar dataKey="actual" fill="hsl(var(--primary))" name="Actual" />
                <Line type="monotone" dataKey="forecast" stroke="hsl(var(--accent))" name="Forecast" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
