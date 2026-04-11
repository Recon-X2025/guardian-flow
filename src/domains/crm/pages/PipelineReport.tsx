import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Deal {
  id: string;
  title: string;
  value: number;
  stage_name: string;
  probability: number;
}

interface CRMStats {
  win_rate?: number;
  total_deals?: number;
  avg_deal_size?: number;
}

export default function PipelineReport() {
  const { data: dealsData } = useQuery({
    queryKey: ['crm-deals-report'],
    queryFn: async () => {
      const res = await fetch('/api/crm/deals', { headers: authHeader() });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['crm-stats'],
    queryFn: async () => {
      const res = await fetch('/api/crm/stats', { headers: authHeader() });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const deals: Deal[] = dealsData?.deals ?? [];
  const stats: CRMStats = statsData ?? {};

  const totalPipeline = deals.reduce((s, d) => s + (d.value ?? 0), 0);
  const winRate = stats.win_rate ?? 0;
  const avgDealSize = deals.length > 0 ? totalPipeline / deals.length : (stats.avg_deal_size ?? 0);

  const byStage = deals.reduce<Record<string, number>>((acc, d) => {
    const stage = d.stage_name ?? 'Unknown';
    acc[stage] = (acc[stage] ?? 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(byStage).map(([stage, count]) => ({ stage, count }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pipeline Report</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${totalPipeline.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Win Rate</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{(winRate * 100).toFixed(1)}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Deals by Stage</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
