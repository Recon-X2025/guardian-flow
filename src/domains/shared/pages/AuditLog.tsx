import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const methodColor: Record<string, string> = {
  POST: 'bg-blue-100 text-blue-800',
  PUT: 'bg-orange-100 text-orange-800',
  PATCH: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
};

export default function AuditLog() {
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => fetch('/api/audit-log?per_page=50', { headers }).then(r => r.json()),
  });

  const { data: statsData } = useQuery({
    queryKey: ['audit-log-stats'],
    queryFn: () => fetch('/api/audit-log/stats', { headers }).then(r => r.json()),
  });

  const logs = data?.logs ?? [];
  const stats = statsData ?? {};

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(stats).map(([k, v]) => (
          <Card key={k}>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{String(v)}</div>
              <div className="text-sm text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Timestamp</th>
                    <th className="py-2 pr-4">Actor</th>
                    <th className="py-2 pr-4">Method</th>
                    <th className="py-2 pr-4">Path</th>
                    <th className="py-2">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l: any) => (
                    <tr key={l.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                      <td className="py-2 pr-4">{l.actor_email || l.actor_id || '—'}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${methodColor[l.method] ?? 'bg-gray-100 text-gray-800'}`}>{l.method}</span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{l.path}</td>
                      <td className="py-2 text-muted-foreground text-xs">{l.ip}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No audit events yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
