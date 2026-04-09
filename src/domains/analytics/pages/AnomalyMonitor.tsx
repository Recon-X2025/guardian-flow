import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from 'recharts';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Activity } from 'lucide-react';

interface Anomaly {
  id: string;
  metric_name: string;
  value: number;
  timestamp: string;
  z_score: number;
  severity: string;
  detected_at: string;
}

export default function AnomalyMonitor() {
  const { toast } = useToast();
  const [metricName, setMetricName] = useState('response_time');
  const [valuesStr, setValuesStr] = useState('120,130,125,500,128,122,800,119');

  const { data: anomalyData, refetch } = useQuery({
    queryKey: ['anomaly-events'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/anomalies');
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const detectMut = useMutation({
    mutationFn: async () => {
      const values = valuesStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
      const timestamps = values.map((_, i) => new Date(Date.now() - (values.length - i) * 60000).toISOString());
      const res = await fetch('/api/analytics/anomalies/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metricName, values, timestamps }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Detected ${data.total} anomaly(ies)` });
      refetch();
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const chartData = valuesStr.split(',').map((v, i) => ({
    index: i,
    value: parseFloat(v.trim()),
  })).filter(d => !isNaN(d.value));

  const anomalies: Anomaly[] = anomalyData?.anomalies || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Anomaly Monitor</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Detect Anomalies</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Metric name" value={metricName} onChange={e => setMetricName(e.target.value)} />
          <Input placeholder="Values (comma-separated)" value={valuesStr} onChange={e => setValuesStr(e.target.value)} />
          <Button onClick={() => detectMut.mutate()} disabled={detectMut.isPending}>Detect Anomalies</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Time Series</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="index" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#6366f1" dot={(props) => {
                const { cx, cy, payload } = props;
                const mean = chartData.reduce((s, d) => s + d.value, 0) / chartData.length;
                const std = Math.sqrt(chartData.reduce((s, d) => s + (d.value - mean) ** 2, 0) / chartData.length);
                const isAnomaly = std > 0 && Math.abs((payload.value - mean) / std) > 2.5;
                return <Dot cx={cx} cy={cy} r={isAnomaly ? 6 : 3} fill={isAnomaly ? '#ef4444' : '#6366f1'} />;
              }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Detected Anomalies</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Z-Score</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anomalies.map(a => (
                <TableRow key={a.id}>
                  <TableCell>{a.metric_name}</TableCell>
                  <TableCell>{a.value}</TableCell>
                  <TableCell>{a.z_score}</TableCell>
                  <TableCell><Badge variant={a.severity === 'high' ? 'destructive' : 'secondary'}>{a.severity}</Badge></TableCell>
                  <TableCell>{new Date(a.timestamp).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {anomalies.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No anomalies recorded.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
