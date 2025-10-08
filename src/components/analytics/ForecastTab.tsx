import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export function ForecastTab() {
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecastData();
  }, []);

  const fetchForecastData = async () => {
    try {
      // Get forecast outputs for next 30 days
      const { data: forecasts } = await supabase
        .from('forecast_outputs')
        .select('target_date, value, forecast_type')
        .gte('target_date', new Date().toISOString().split('T')[0])
        .lte('target_date', new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0])
        .order('target_date');

      // Get actual work orders for comparison
      const { data: actuals } = await supabase
        .from('work_orders')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString())
        .order('created_at');

      if (forecasts && actuals) {
        const forecastByDate = forecasts.reduce((acc: any, f) => {
          acc[f.target_date] = (acc[f.target_date] || 0) + f.value;
          return acc;
        }, {});

        const actualByDate = actuals.reduce((acc: any, wo) => {
          const day = new Date(wo.created_at).toISOString().split('T')[0];
          acc[day] = (acc[day] || 0) + 1;
          return acc;
        }, {});

        const allDates = [...new Set([...Object.keys(forecastByDate), ...Object.keys(actualByDate)])].sort();
        
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
      }
    } catch (error) {
      console.error('Failed to fetch forecast data:', error);
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
            <div className="text-2xl font-bold">30 Days</div>
            <p className="text-xs text-muted-foreground">Next 6 months available</p>
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
            <p className="text-xs text-muted-foreground">Work orders (next 30d)</p>
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
            <Badge variant={metrics?.accuracy > 90 ? 'default' : 'secondary'}>
              {metrics?.accuracy > 90 ? 'Excellent' : 'Good'}
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
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
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
