import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ActivityTimeline from './ActivityTimeline';

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage_name: string;
  contact_id?: string;
  account_id?: string;
  probability: number;
  close_date?: string;
}

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['crm-deal', id],
    queryFn: async () => {
      const res = await fetch('/api/crm/deals', { headers: authHeader() });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      const deals: Deal[] = json.deals ?? [];
      return deals.find(d => d.id === id) ?? null;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-6 text-muted-foreground">Deal not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{data.title}</h1>

      <Card>
        <CardHeader><CardTitle>Deal Info</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Amount: </span><span className="font-semibold">{data.currency} {data.value?.toLocaleString()}</span></div>
          <div><span className="text-muted-foreground">Stage: </span><Badge>{data.stage_name}</Badge></div>
          <div><span className="text-muted-foreground">Probability: </span><span>{data.probability}%</span></div>
          {data.close_date && <div><span className="text-muted-foreground">Close Date: </span><span>{new Date(data.close_date).toLocaleDateString()}</span></div>}
          {data.contact_id && <div><span className="text-muted-foreground">Contact ID: </span><span>{data.contact_id}</span></div>}
        </CardContent>
      </Card>

      <ActivityTimeline dealId={id} />
    </div>
  );
}
