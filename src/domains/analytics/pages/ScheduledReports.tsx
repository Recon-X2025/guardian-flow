import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/domains/shared/hooks/use-toast';

export default function ScheduledReports() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };

  const { data, isLoading } = useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: () => fetch('/api/scheduled-reports', { headers }).then(r => r.json()),
  });

  const runNow = useMutation({
    mutationFn: (id: string) => fetch(`/api/scheduled-reports/${id}/run-now`, { method: 'POST', headers }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scheduled-reports'] }); toast({ title: 'Report triggered' }); },
  });

  const reports = data?.reports ?? [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Scheduled Reports</h1>
      <Card>
        <CardHeader><CardTitle>Reports</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Schedule</th>
                    <th className="py-2 pr-4">Format</th>
                    <th className="py-2 pr-4">Last Run</th>
                    <th className="py-2 pr-4">Enabled</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 pr-4 font-medium">{r.name}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{r.report_type}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{r.schedule_cron}</td>
                      <td className="py-2 pr-4"><span className="px-2 py-0.5 rounded text-xs bg-gray-100">{r.format?.toUpperCase()}</span></td>
                      <td className="py-2 pr-4 text-muted-foreground">{r.last_run ? new Date(r.last_run).toLocaleString() : '—'}</td>
                      <td className="py-2 pr-4"><span className={`px-2 py-0.5 rounded text-xs ${r.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{r.enabled ? 'On' : 'Off'}</span></td>
                      <td className="py-2"><Button size="sm" variant="outline" onClick={() => runNow.mutate(r.id)}>Run Now</Button></td>
                    </tr>
                  ))}
                  {reports.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No scheduled reports configured.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
