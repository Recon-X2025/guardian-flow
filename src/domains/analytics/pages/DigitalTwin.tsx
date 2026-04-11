import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DigitalTwin() {
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };

  const { data: devicesData } = useQuery({
    queryKey: ['iot-devices'],
    queryFn: () => fetch('/api/iot-telemetry/devices', { headers }).then(r => r.json()),
  });

  const { data: twinData } = useQuery({
    queryKey: ['digital-twin', selectedDevice?.id],
    queryFn: () => fetch(`/api/iot-telemetry/devices/${selectedDevice.id}/twin`, { headers }).then(r => r.json()),
    enabled: !!selectedDevice,
  });

  const devices = devicesData?.devices ?? [];

  const healthColor = (score: number) => score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Digital Twin</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {devices.map((d: any) => (
          <Card key={d.id} className={`cursor-pointer ${selectedDevice?.id === d.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedDevice(d)}>
            <CardHeader><CardTitle className="text-sm">{d.name}</CardTitle></CardHeader>
            <CardContent>
              <span className={`px-2 py-0.5 rounded text-xs ${d.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{d.status}</span>
              <p className="text-xs text-muted-foreground mt-1">{d.device_type}</p>
            </CardContent>
          </Card>
        ))}
        {devices.length === 0 && <p className="text-muted-foreground col-span-4">No IoT devices found.</p>}
      </div>

      {selectedDevice && twinData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Health Score — {selectedDevice.name}</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className={`text-6xl font-bold ${healthColor(twinData.health_score ?? 0)}`}>{twinData.health_score ?? 0}</div>
              <div className="text-muted-foreground mt-1">/ 100</div>
              <div className="mt-4 text-sm text-center space-y-1">
                <p>⏱ Predicted failure in <strong>{twinData.predicted_failure_days}</strong> days</p>
                <p>⚠️ <strong>{twinData.anomaly_count_7d}</strong> anomalies in last 7 days</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Current Readings</CardTitle></CardHeader>
            <CardContent>
              {twinData.current_readings && Object.keys(twinData.current_readings).length > 0 ? (
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left"><th className="py-2 pr-4">Property</th><th className="py-2">Value</th></tr></thead>
                  <tbody>
                    {Object.entries(twinData.current_readings).map(([k, v]: any) => (
                      <tr key={k} className="border-b last:border-0">
                        <td className="py-2 pr-4 text-muted-foreground">{k}</td>
                        <td className="py-2 font-medium">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted-foreground text-sm">No readings available. Ingest telemetry data first.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
