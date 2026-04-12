import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from 'recharts';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Activity, Wifi, WifiOff, Bell } from 'lucide-react';

interface AnomalyEvent {
  type: string;
  assetId: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: string;
  direction?: string;
}

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
  const [wsConnected, setWsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState<AnomalyEvent[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    function connect() {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          ws.send(JSON.stringify({ event: 'subscribe', channel: 'public:anomalies' }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'anomaly_alert' || data.payload?.type === 'anomaly_alert') {
              const alert: AnomalyEvent = data.type === 'anomaly_alert' ? data : data.payload;
              setLiveEvents(prev => [alert, ...prev].slice(0, 50));
              setAlertCount(c => c + 1);
              toast({ title: 'Anomaly Detected', description: `${alert.metric} on asset ${alert.assetId}: ${alert.value}`, variant: 'destructive' });
            }
          } catch {
            // ignore parse errors
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          setTimeout(connect, 5000);
        };

        ws.onerror = () => {
          setWsConnected(false);
          ws.close();
        };
      } catch {
        setWsConnected(false);
      }
    }

    connect();
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const { data: anomalyData, refetch } = useQuery({
    queryKey: ['anomaly-events'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/anomalies');
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const handleDetect = async () => {
    try {
      const values = valuesStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
      const timestamps = values.map((_, i) => new Date(Date.now() - (values.length - i) * 60000).toISOString());
      const res = await fetch('/api/analytics/anomalies/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metricName, values, timestamps }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast({ title: `Detected ${data.total} anomaly(ies)` });
      refetch();
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    }
  };

  const handleTestAlert = async () => {
    try {
      const res = await fetch('/api/anomaly/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: 'asset-test-001', metric: metricName, value: 9999 }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: 'Test alert injected' });
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    }
  };

  const chartData = valuesStr.split(',').map((v, i) => ({
    index: i,
    value: parseFloat(v.trim()),
  })).filter(d => !isNaN(d.value));

  const anomalies: Anomaly[] = anomalyData?.anomalies || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Anomaly Monitor</h1>
          {alertCount > 0 && <Badge variant="destructive" className="ml-2"><Bell className="h-3 w-3 mr-1" />{alertCount}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {wsConnected ? (
            <Badge variant="default" className="gap-1"><Wifi className="h-3 w-3" />Live</Badge>
          ) : (
            <Badge variant="secondary" className="gap-1"><WifiOff className="h-3 w-3" />Connecting...</Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleTestAlert}>Test Alert</Button>
        </div>
      </div>

      {liveEvents.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader><CardTitle className="text-base text-destructive">Live Anomaly Feed</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {liveEvents.map((evt, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b last:border-0 pb-1">
                  <span className="font-medium">{evt.assetId}</span>
                  <span className="text-muted-foreground">{evt.metric}</span>
                  <Badge variant="destructive">{evt.value}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Detect Anomalies</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Metric name" value={metricName} onChange={e => setMetricName(e.target.value)} />
          <Input placeholder="Values (comma-separated)" value={valuesStr} onChange={e => setValuesStr(e.target.value)} />
          <Button onClick={handleDetect}>Detect Anomalies</Button>
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
        <CardHeader><CardTitle>Detected Anomalies (Historical)</CardTitle></CardHeader>
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
