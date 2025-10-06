import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, TrendingDown, Receipt, AlertTriangle, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Finance() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [penalties, setPenalties] = useState<any[]>([]);
  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invoicesRes, penaltiesRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, work_orders(wo_number)')
          .order('created_at', { ascending: false }),
        supabase
          .from('penalty_applications')
          .select('*, work_orders(wo_number)')
          .order('created_at', { ascending: false })
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (penaltiesRes.error) throw penaltiesRes.error;

      // Use mock data if no real data exists
      const mockInvoices = [
        { id: '1', invoice_number: 'INV-2025-001', status: 'paid', subtotal: 850, penalties: 42.50, total_amount: 807.50, created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), work_orders: { wo_number: 'WO-1234' } },
        { id: '2', invoice_number: 'INV-2025-002', status: 'sent', subtotal: 1200, penalties: 0, total_amount: 1200, created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), work_orders: { wo_number: 'WO-1235' } },
        { id: '3', invoice_number: 'INV-2025-003', status: 'on_hold', subtotal: 650, penalties: 97.50, total_amount: 552.50, hold_reason: 'Fraud investigation', created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), work_orders: { wo_number: 'WO-1236' } },
        { id: '4', invoice_number: 'INV-2025-004', status: 'paid', subtotal: 1500, penalties: 0, total_amount: 1500, created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), work_orders: { wo_number: 'WO-1238' } },
        { id: '5', invoice_number: 'INV-2025-005', status: 'paid', subtotal: 2200, penalties: 110, total_amount: 2090, created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), work_orders: { wo_number: 'WO-1241' } }
      ];

      const mockPenalties = [
        { id: '1', penalty_code: 'LATE-COMP', reason: 'Work order completed 2 hours past SLA', amount: 42.50, created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), disputed: false, work_orders: { wo_number: 'WO-1234' } },
        { id: '2', penalty_code: 'MISS-PHOTO', reason: 'Missing before photos', amount: 97.50, created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), disputed: true, dispute_reason: 'Photos were uploaded but system error occurred', work_orders: { wo_number: 'WO-1236' } },
        { id: '3', penalty_code: 'LATE-COMP', reason: 'Exceeded SLA by 4 hours', amount: 110, created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), disputed: false, resolved_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), work_orders: { wo_number: 'WO-1241' } }
      ];

      setInvoices((invoicesRes.data && invoicesRes.data.length > 0) ? invoicesRes.data : mockInvoices);
      setPenalties((penaltiesRes.data && penaltiesRes.data.length > 0) ? penaltiesRes.data : mockPenalties);

      // Generate revenue chart - last 30 days
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
      });

      const chartData = last30Days.map(date => {
        const dailyRevenue = (invoicesRes.data || [])
          .filter((inv: any) => inv.created_at?.startsWith(date) && inv.status === 'paid')
          .reduce((sum: number, inv: any) => sum + Number(inv.total_amount), 0);
        
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dailyRevenue
        };
      });

      setRevenueChart(chartData);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
      on_hold: "bg-orange-100 text-orange-800",
    };
    return colors[status] || colors.draft;
  };

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.total_amount), 0);
  const totalPenalties = penalties.reduce((sum, p) => sum + Number(p.amount), 0);
  const onHoldInvoices = invoices.filter(i => i.status === 'on_hold');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Finance & Settlements</h1>
        <p className="text-muted-foreground">
          Invoice management with penalty enforcement
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Paid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penalties</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalPenalties.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total count</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.filter(i => i.status === 'paid').length}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed payments</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Hold</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{onHoldInvoices.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Under review</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Last 30 days - paid invoices only</CardDescription>
        </CardHeader>
        <CardContent>
          {revenueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No revenue data available
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Customer invoices with penalty adjustments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{invoice.invoice_number || 'Draft'}</h3>
                    <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                    {invoice.hold_reason && (
                      <Badge variant="destructive">{invoice.hold_reason}</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <span>WO: {invoice.work_orders?.wo_number || 'N/A'}</span>
                    <span>Subtotal: ${Number(invoice.subtotal).toFixed(2)}</span>
                    <span>Penalties: -${Number(invoice.penalties).toFixed(2)}</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    Total: ${Number(invoice.total_amount).toFixed(2)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(invoice.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}

            {invoices.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No invoices yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Penalty Applications</CardTitle>
          <CardDescription>Automatic penalty calculation and enforcement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {penalties.map((penalty) => (
              <div
                key={penalty.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{penalty.penalty_code}</h3>
                    {penalty.disputed && (
                      <Badge variant="outline">Disputed</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{penalty.reason}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>WO: {penalty.work_orders?.wo_number || 'N/A'}</span>
                    <span>Amount: ${Number(penalty.amount).toFixed(2)}</span>
                    {penalty.resolved_at && (
                      <span>Resolved: {new Date(penalty.resolved_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  {penalty.dispute_reason && (
                    <p className="text-xs text-orange-600 mt-2">
                      Dispute: {penalty.dispute_reason}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {penalties.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No penalties applied. Good compliance!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settlement Process</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Penalties automatically applied to partner settlements before payout</p>
          <p>• All penalty calculations logged in audit trail</p>
          <p>• Invoices on hold (fraud investigation) cannot be settled until resolved</p>
          <p>• Dispute flow available for penalty challenges (requires MFA)</p>
        </CardContent>
      </Card>
    </div>
  );
}