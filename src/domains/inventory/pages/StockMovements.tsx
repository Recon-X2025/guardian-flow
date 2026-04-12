import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const typeColor: Record<string, string> = {
  goods_receipt: 'bg-green-100 text-green-800',
  consumption: 'bg-red-100 text-red-800',
  transfer: 'bg-blue-100 text-blue-800',
  adjustment: 'bg-yellow-100 text-yellow-800',
  return: 'bg-purple-100 text-purple-800',
};

export default function StockMovements() {
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: () => fetch('/api/inventory-adv/stock-movements', { headers }).then(r => r.json()),
  });

  const movements = data?.movements ?? [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Stock Movements</h1>
      <Card>
        <CardHeader><CardTitle>Movement History</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Item</th>
                    <th className="py-2 pr-4">Qty</th>
                    <th className="py-2 pr-4">Reference</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m: any) => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColor[m.movement_type] ?? 'bg-gray-100 text-gray-800'}`}>
                          {m.movement_type}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{m.item_name}</td>
                      <td className={`py-2 pr-4 font-medium ${m.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.quantity >= 0 ? '+' : ''}{m.quantity}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{m.reference_type}</td>
                      <td className="py-2 text-muted-foreground">{m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                  {movements.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No movements recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
