import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Cpu, AlertTriangle, Wifi, Activity, Thermometer, Gauge } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface DigitalTwin {
  device_id: string;
  health_score: number;
  predicted_failure_days: number;
  anomaly_count_7d: number;
  factors: { property: string; value: number; severity: string; penalty: number }[];
  current_readings: Record<string, { value: number; unit: string | null; timestamp: string }>;
  computed_from_readings: number;
}

function DigitalTwinPanel({ deviceId, deviceName }: { deviceId: string; deviceName: string }) {
  const { data, isLoading, error } = useQuery<DigitalTwin>({
    queryKey: ['iot-twin', deviceId],
    queryFn: async () => {
      const res = await fetch(`/api/iot-telemetry/devices/${deviceId}/twin`, { headers: authHeader() });
      if (!res.ok) throw new Error('Failed to load digital twin');
      return res.json();
    },
    staleTime: 30_000,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground py-2">Loading twin…</p>;
  if (error || !data) return <p className="text-sm text-destructive py-2">Failed to load digital twin</p>;

  const scoreColour = data.health_score >= 70 ? 'text-green-600' : data.health_score >= 40 ? 'text-orange-500' : 'text-red-600';
  const readings = Object.entries(data.current_readings);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Health Score</p>
            <p className={`text-3xl font-bold ${scoreColour}`}>{data.health_score}%</p>
            <Progress value={data.health_score} className="mt-1 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Est. Days to Failure</p>
            <p className="text-3xl font-bold">{data.predicted_failure_days === 0 ? 'Imm.' : data.predicted_failure_days}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Alerts (7d)</p>
            <p className="text-3xl font-bold text-orange-500">{data.anomaly_count_7d}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Readings Analysed</p>
            <p className="text-3xl font-bold">{data.computed_from_readings}</p>
          </CardContent>
        </Card>
      </div>

      {readings.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Current Sensor Readings</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {readings.map(([prop, reading]) => (
                <div key={prop} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                  <Thermometer className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground capitalize">{prop}</p>
                    <p className="text-sm font-semibold">{reading.value} {reading.unit || ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.factors.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Health Factors</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.factors.map(f => (
                <div key={f.property} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{f.property}</span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{f.value}</span>
                    <Badge className={f.severity === 'critical' ? 'bg-red-100 text-red-800 border-0' : 'bg-yellow-100 text-yellow-800 border-0'} variant="outline">
                      {f.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">-{f.penalty}pts</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface IoTDevice {
  id: string;
  name: string;
  device_type: string;
  status: 'online' | 'offline' | 'unknown';
  last_seen: string;
}

interface IoTAlert {
  id: string;
  device_id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  created_at: string;
  acknowledged: boolean;
}

export default function IoTDashboard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const { data: devicesData } = useQuery({
    queryKey: ['iot-devices'],
    queryFn: async () => {
      const res = await fetch('/api/iot-telemetry/devices', { headers: authHeader() });
      if (!res.ok) throw new Error('Failed to fetch devices');
      return res.json();
    },
  });

  const { data: alertsData } = useQuery({
    queryKey: ['iot-alerts'],
    queryFn: async () => {
      const res = await fetch('/api/iot-telemetry/alerts', { headers: authHeader() });
      if (!res.ok) throw new Error('Failed to fetch alerts');
      return res.json();
    },
  });

  const devices: IoTDevice[] = devicesData?.devices ?? [];
  const alerts: IoTAlert[] = alertsData?.alerts ?? [];

  const ackMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/iot-telemetry/alerts/${id}/acknowledge`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
      });
      if (!res.ok) throw new Error('Failed to acknowledge');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['iot-alerts'] });
      toast({ title: 'Alert acknowledged' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const onlineCount = devices.filter(d => d.status === 'online').length;

  const statusBadge = (status: string) => {
    if (status === 'online') return <Badge className="bg-green-100 text-green-800 border-0">Online</Badge>;
    if (status === 'offline') return <Badge className="bg-red-100 text-red-800 border-0">Offline</Badge>;
    return <Badge variant="secondary">Unknown</Badge>;
  };

  const severityBadge = (sev: string) => {
    if (sev === 'critical') return <Badge className="bg-red-100 text-red-800 border-0">Critical</Badge>;
    if (sev === 'warning') return <Badge className="bg-yellow-100 text-yellow-800 border-0">Warning</Badge>;
    return <Badge variant="secondary">Info</Badge>;
  };

  const selectedDevice = devices.find(d => d.id === selectedDeviceId) ?? null;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">IoT Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Cpu className="h-4 w-4" />Total Devices</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{devices.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Wifi className="h-4 w-4 text-green-500" />Online</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{onlineCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" />Active Alerts</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-orange-500">{alerts.filter(a => !a.acknowledged).length}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="devices">
        <TabsList>
          <TabsTrigger value="devices"><Cpu className="h-3.5 w-3.5 mr-1.5" />Devices</TabsTrigger>
          <TabsTrigger value="alerts"><AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Alerts</TabsTrigger>
          <TabsTrigger value="twin"><Activity className="h-3.5 w-3.5 mr-1.5" />Digital Twin</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Twin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No devices</TableCell></TableRow>}
                  {devices.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-muted-foreground">{d.device_type}</TableCell>
                      <TableCell>{statusBadge(d.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.last_seen ? new Date(d.last_seen).toLocaleString() : '—'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedDeviceId(d.id)}>
                          <Gauge className="h-3.5 w-3.5 mr-1" />View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No alerts</TableCell></TableRow>}
                  {alerts.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>{severityBadge(a.severity)}</TableCell>
                      <TableCell className="text-sm">{devices.find(d => d.id === a.device_id)?.name ?? a.device_id}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(a as unknown as Record<string, string>).property ?? '—'}</TableCell>
                      <TableCell className="text-sm">{(a as unknown as Record<string, string>).value ?? a.message ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(a.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        {!a.acknowledged ? (
                          <Button size="sm" variant="outline" onClick={() => ackMut.mutate(a.id)} disabled={ackMut.isPending}>
                            Acknowledge
                          </Button>
                        ) : (
                          <Badge variant="outline">Acknowledged</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="twin" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Select device:</span>
            <div className="flex flex-wrap gap-2">
              {devices.map(d => (
                <Button
                  key={d.id}
                  size="sm"
                  variant={selectedDeviceId === d.id ? 'default' : 'outline'}
                  onClick={() => setSelectedDeviceId(d.id)}
                >
                  {d.name}
                </Button>
              ))}
              {devices.length === 0 && <span className="text-sm text-muted-foreground">No devices registered</span>}
            </div>
          </div>
          {selectedDevice && selectedDeviceId && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Digital Twin — {selectedDevice.name}</h3>
              <DigitalTwinPanel deviceId={selectedDeviceId} deviceName={selectedDevice.name} />
            </div>
          )}
          {!selectedDeviceId && devices.length > 0 && (
            <p className="text-sm text-muted-foreground">Select a device above to view its digital twin health analysis.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
