import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, TrendingDown, Receipt, AlertTriangle } from "lucide-react";

export default function Finance() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [penalties, setPenalties] = useState<any[]>([]);
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

      setInvoices(invoicesRes.data || []);
      setPenalties(penaltiesRes.data || []);
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

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
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
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Hold</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{onHoldInvoices.length}</div>
          </CardContent>
        </Card>
      </div>

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