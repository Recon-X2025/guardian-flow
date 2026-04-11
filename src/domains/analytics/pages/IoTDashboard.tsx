import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Cpu, AlertTriangle, Wifi } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
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

      <Card>
        <CardHeader><CardTitle>Devices</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No devices</TableCell></TableRow>}
              {devices.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-muted-foreground">{d.device_type}</TableCell>
                  <TableCell>{statusBadge(d.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.last_seen ? new Date(d.last_seen).toLocaleString() : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Alerts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No alerts</TableCell></TableRow>}
              {alerts.map(a => (
                <TableRow key={a.id}>
                  <TableCell>{severityBadge(a.severity)}</TableCell>
                  <TableCell>{a.message}</TableCell>
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
    </div>
  );
}
