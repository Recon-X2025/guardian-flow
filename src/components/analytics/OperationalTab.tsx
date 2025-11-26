import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OperationalCommandView } from '@/components/OperationalCommandView';
import { apiClient } from '@/integrations/api/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export function OperationalTab() {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendData();
  }, []);

  const fetchTrendData = async () => {
    try {
      const { data } = await apiClient
        .from('work_orders')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString())
        .order('created_at')
        .then();

      if (data) {
        const dailyCounts = data.reduce((acc: any, wo) => {
          const day = new Date(wo.created_at).toISOString().split('T')[0];
          acc[day] = (acc[day] || 0) + 1;
          return acc;
        }, {});

        const chartData = Object.entries(dailyCounts).map(([date, count]) => ({
          date,
          count
        }));

        setTrendData(chartData);
      }
    } catch (error) {
      console.error('Failed to fetch trend data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Operational Command View */}
      <OperationalCommandView />

      {/* Work Orders Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Work Orders Trend (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
