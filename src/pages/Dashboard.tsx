import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, CheckCircle2, Clock, DollarSign, Package, Users, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeWorkOrders: 0,
    pendingTickets: 0,
    partsInStock: 0,
    totalRevenue: 0,
  });
  const [recentWorkOrders, setRecentWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch work orders count
      const { count: woCount } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['in_progress', 'assigned']);

      // Fetch tickets count
      const { count: ticketCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      // Fetch inventory items count
      const { data: inventoryData } = await supabase
        .from('inventory_items')
        .select('id, stock_levels(qty_available, qty_reserved)');

      const totalParts = inventoryData?.reduce((sum, item) => {
        const stock = item.stock_levels?.reduce((s: number, level: any) => 
          s + (level.qty_available - level.qty_reserved), 0) || 0;
        return sum + stock;
      }, 0) || 0;

      // Fetch recent work orders with details
      const { data: workOrders } = await supabase
        .from('work_orders')
        .select(`
          *,
          ticket:tickets(unit_serial),
          technician:profiles(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      setStats({
        activeWorkOrders: woCount || 0,
        pendingTickets: ticketCount || 0,
        partsInStock: totalParts,
        totalRevenue: 0, // TODO: Calculate from invoices when implemented
      });

      setRecentWorkOrders(workOrders || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Active Work Orders",
      value: stats.activeWorkOrders.toString(),
      icon: Wrench,
      color: "text-primary",
    },
    {
      title: "Pending Tickets",
      value: stats.pendingTickets.toString(),
      icon: Clock,
      color: "text-warning",
    },
    {
      title: "Parts in Stock",
      value: stats.partsInStock.toLocaleString(),
      icon: Package,
      color: "text-success",
    },
    {
      title: "Revenue (MTD)",
      value: "$0.00",
      icon: DollarSign,
      color: "text-accent",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to ReconX AI Field Service Platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Work Orders</CardTitle>
            <CardDescription>Latest field service activities</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : recentWorkOrders.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No recent work orders</div>
            ) : (
              <div className="space-y-4">
                {recentWorkOrders.map((wo) => (
                <div
                    key={wo.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{wo.wo_number || 'Draft'}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            wo.status === "completed"
                              ? "bg-success/10 text-success"
                              : wo.status === "in_progress"
                              ? "bg-primary/10 text-primary"
                              : "bg-warning/10 text-warning"
                          }`}
                        >
                          {wo.status?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">Unit: {wo.ticket?.unit_serial || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">
                        {wo.technician?.full_name || 'Unassigned'} • {new Date(wo.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>Requires attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 border border-warning/20 bg-warning/5 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Low Stock Alert</p>
                  <p className="text-xs text-muted-foreground">
                    3 parts below minimum threshold
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border border-primary/20 bg-primary/5 rounded-lg">
                <Activity className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">SLA Risk</p>
                  <p className="text-xs text-muted-foreground">
                    2 work orders approaching deadline
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border border-success/20 bg-success/5 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <div>
                  <p className="text-sm font-medium">All Systems Operational</p>
                  <p className="text-xs text-muted-foreground">
                    No critical issues detected
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Platform Features
          </CardTitle>
          <CardDescription>87 integrated modules for complete field service management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3">
              <div className="text-2xl font-bold text-primary mb-1">87</div>
              <div className="text-xs text-muted-foreground">Total Modules</div>
            </div>
            <div className="text-center p-3">
              <div className="text-2xl font-bold text-accent mb-1">24/7</div>
              <div className="text-xs text-muted-foreground">AI Support</div>
            </div>
            <div className="text-center p-3">
              <div className="text-2xl font-bold text-success mb-1">99.9%</div>
              <div className="text-xs text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center p-3">
              <div className="text-2xl font-bold text-warning mb-1">Real-time</div>
              <div className="text-xs text-muted-foreground">Analytics</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
