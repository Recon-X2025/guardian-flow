import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationalCommandView } from "@/components/OperationalCommandView";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, CheckCircle2, Clock, DollarSign, Package, Users, Wrench, TrendingUp, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from "sonner";

export default function Dashboard() {
  const { formatCurrency } = useCurrency();
  const [stats, setStats] = useState({
    activeWorkOrders: 0,
    pendingTickets: 0,
    partsInStock: 0,
    saposRevenue: 0,
    totalPayables: 0,
    completedWOs: 0,
    pendingValidation: 0,
    totalWOs: 0,
  });
  const [recentWorkOrders, setRecentWorkOrders] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all work orders for comprehensive analysis
      const { data: allWorkOrders, count: totalWOCount } = await supabase
        .from('work_orders')
        .select('*, created_at, status', { count: 'exact' });

      console.log('Dashboard: Total WOs in DB:', totalWOCount, 'Fetched:', allWorkOrders?.length);

      const activeWOs = allWorkOrders?.filter(wo => ['in_progress', 'assigned'].includes(wo.status || '')).length || 0;
      const completedWOs = allWorkOrders?.filter(wo => wo.status === 'completed').length || 0;
      const pendingWOs = allWorkOrders?.filter(wo => wo.status === 'pending_validation').length || 0;

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

      // Fetch SaPOS offers for revenue
      const { data: saposOffers } = await supabase
        .from('sapos_offers')
        .select('price')
        .eq('status', 'accepted');

      const saposRevenue = saposOffers?.reduce((sum, offer) => sum + Number(offer.price), 0) || 0;

      // Fetch invoices for payables
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, status')
        .in('status', ['sent', 'overdue']);

      const totalPayables = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

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
        activeWorkOrders: activeWOs,
        pendingTickets: ticketCount || 0,
        partsInStock: totalParts,
        saposRevenue,
        totalPayables,
        completedWOs,
        pendingValidation: pendingWOs,
        totalWOs: totalWOCount || 0,
      });

      setRecentWorkOrders(workOrders || []);

      // Generate chart data - last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const chartDataProcessed = last7Days.map(date => {
        const count = allWorkOrders?.filter(wo => wo.created_at?.startsWith(date)).length || 0;
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count
        };
      });

      setChartData(chartDataProcessed);

      // Status distribution
      const statusCounts = [
        { name: 'Completed', value: completedWOs, color: '#22c55e' },
        { name: 'In Progress', value: activeWOs, color: '#3b82f6' },
        { name: 'Pending', value: pendingWOs, color: '#f97316' },
      ].filter(s => s.value > 0);

      setStatusData(statusCounts);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadProductSpecs = async () => {
    try {
      const response = await fetch('/PRODUCT_SPECIFICATIONS_V5.md');
      const content = await response.text();
      
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ReconX_Product_Specifications.md';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Product Specifications downloaded successfully');
    } catch (error) {
      console.error('Error downloading specs:', error);
      toast.error('Failed to download Product Specifications');
    }
  };

  const statCards = [
    {
      title: "Total Work Orders",
      value: stats.totalWOs.toLocaleString(),
      subtitle: `${stats.activeWorkOrders} active`,
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
      title: "Revenue (SaPOS)",
      value: formatCurrency(stats.saposRevenue, false),
      icon: TrendingUp,
      color: "text-accent",
    },
    {
      title: "Total Payables",
      value: formatCurrency(stats.totalPayables, false),
      subtitle: "Finance & Settlements",
      icon: DollarSign,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to ReconX AI Field Service Platform</p>
        </div>
        <Button onClick={downloadProductSpecs} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Download Product Specs
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {(stat as any).subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{(stat as any).subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Operational Command View */}
      <div className="lg:col-span-2">
        <OperationalCommandView />
      </div>


      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Work Orders Trend</CardTitle>
            <CardDescription>Last 7 days activity</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Current work order breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
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
