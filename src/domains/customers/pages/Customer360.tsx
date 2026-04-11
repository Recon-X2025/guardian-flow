import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Star, FileText, Briefcase, MessageSquare, Clock } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { apiClient } from '@/integrations/api/client';

interface CustomerStats {
  totalWorkOrders: number;
  openWorkOrders: number;
  totalInvoices: number;
  openInvoices: number;
  csatScore: number | null;
  csatResponses: number;
  lastInteractionDate: string | null;
}

interface WorkOrder {
  id: string;
  title?: string;
  status: string;
  service_type?: string;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number?: string;
  status: string;
  total_amount?: number;
  currency?: string;
  created_at: string;
}

interface TimelineEvent {
  id: string;
  type: 'work_order' | 'invoice' | 'communication' | 'booking';
  title: string;
  status: string;
  date: string;
  metadata: Record<string, unknown>;
}

interface Customer360Data {
  customer: Record<string, unknown>;
  stats: CustomerStats;
  workOrders: WorkOrder[];
  invoices: Invoice[];
  communicationThreads: unknown[];
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
  invoice: 'bg-purple-100 text-purple-700',
  work_order: 'bg-blue-100 text-blue-700',
  communication: 'bg-orange-100 text-orange-700',
  booking: 'bg-teal-100 text-teal-700',
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number | null }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value ?? '—'}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Customer360() {
  const { customerId } = useParams<{ customerId: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Customer360Data | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const result = await apiClient.get(`/api/customer360/${customerId}`);
      setData(result);
    } catch {
      toast({ title: 'Error', description: 'Could not load customer data.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [customerId, toast]);

  const fetchTimeline = useCallback(async () => {
    if (!customerId) return;
    setTimelineLoading(true);
    try {
      const result = await apiClient.get(`/api/customer360/${customerId}/timeline`);
      setTimeline(result.events || []);
    } catch {
      toast({ title: 'Error', description: 'Could not load timeline.', variant: 'destructive' });
    } finally {
      setTimelineLoading(false);
    }
  }, [customerId, toast]);

  useEffect(() => {
    fetchData();
    fetchTimeline();
  }, [fetchData, fetchTimeline]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-muted-foreground">Customer not found.</div>
    );
  }

  const { customer, stats, workOrders, invoices } = data;
  const openWOs = workOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled');
  const openInvoices = invoices.filter(inv => inv.status === 'open' || inv.status === 'overdue');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/10">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {String(customer.name || customer.full_name || `Customer ${customerId}`)}
          </h1>
          <p className="text-muted-foreground">
            {String(customer.email || '')}
            {customer.phone ? ` · ${String(customer.phone)}` : ''}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Briefcase className="w-4 h-4" />}
          label="Total Work Orders"
          value={stats.totalWorkOrders}
        />
        <StatCard
          icon={<FileText className="w-4 h-4" />}
          label="Open Invoices"
          value={stats.openInvoices}
        />
        <StatCard
          icon={<Star className="w-4 h-4" />}
          label="CSAT Score"
          value={stats.csatScore !== null ? `${stats.csatScore}/5` : null}
        />
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label="Last Interaction"
          value={
            stats.lastInteractionDate
              ? new Date(stats.lastInteractionDate).toLocaleDateString()
              : null
          }
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="open-wos">
            Open WOs{' '}
            {openWOs.length > 0 && (
              <Badge variant="secondary" className="ml-1">{openWOs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices{' '}
            {openInvoices.length > 0 && (
              <Badge variant="secondary" className="ml-1">{openInvoices.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="mt-4">
          {timelineLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : timeline.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No events yet.</p>
          ) : (
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />
              {timeline.map(event => (
                <div key={event.id} className="relative flex gap-4">
                  <div className="absolute -left-4 w-3 h-3 rounded-full border-2 border-primary bg-background mt-1.5" />
                  <Card className="flex-1">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(event.date).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-xs ${STATUS_COLORS[event.type] || ''}`}
                          >
                            {event.type.replace('_', ' ')}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${STATUS_COLORS[event.status] || ''}`}
                          >
                            {event.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Open WOs Tab */}
        <TabsContent value="open-wos" className="mt-4">
          {openWOs.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No open work orders.</p>
          ) : (
            <div className="space-y-3">
              {openWOs.map(wo => (
                <Card key={wo.id}>
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {wo.title || `Work Order #${wo.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(wo.created_at).toLocaleDateString()}
                        {wo.service_type ? ` · ${wo.service_type}` : ''}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${STATUS_COLORS[wo.status] || ''}`}
                    >
                      {wo.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-4">
          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No invoices.</p>
          ) : (
            <div className="space-y-3">
              {invoices.map(inv => (
                <Card key={inv.id}>
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        Invoice #{inv.invoice_number || inv.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString()}
                        {inv.total_amount != null
                          ? ` · ${inv.currency || 'USD'} ${inv.total_amount.toFixed(2)}`
                          : ''}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${STATUS_COLORS[inv.status] || ''}`}
                    >
                      {inv.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4" /> Customer Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Document management is not yet enabled for this customer. Contact your administrator to enable document storage integration.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
