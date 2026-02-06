import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationalCommandView } from "@/domains/shared/components/OperationalCommandView";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "@/domains/auth/contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useCurrency } from '@/domains/shared/hooks/useCurrency';
import { useRBAC } from '@/domains/auth/contexts/RBACContext';
import { toast } from "sonner";
import { DashboardStats, getRoleConfig } from "@/domains/shared/config/dashboardConfig";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { formatCurrency } = useCurrency();
  const { tenantId, hasRole, roles, loading: rbacLoading } = useRBAC();
  const { user } = useAuth();
  const isSysAdmin = hasRole('sys_admin');
  
  const [stats, setStats] = useState<DashboardStats>({
    // Work Order metrics
    totalWOs: 0,
    activeWorkOrders: 0,
    completedWOs: 0,
    pendingValidation: 0,
    myAssignedWOs: 0,
    myCompletedToday: 0,
    
    // Ticket metrics
    pendingTickets: 0,
    openTickets: 0,
    
    // Inventory metrics
    partsInStock: 0,
    lowStockItems: 0,
    
    // Financial metrics
    saposRevenue: 0,
    totalPayables: 0,
    monthlyRevenue: 0,
    overdueInvoices: 0,
    
    // Fraud & Compliance
    activeFraudCases: 0,
    anomaliesDetected: 0,
    forgeriesDetected: 0,
    complianceScore: 95,
    policyViolations: 0,
    auditsPending: 0,
    
    // Team metrics
    activeTechnicians: 0,
    totalCustomers: 0,
    partnerPerformance: 0,
  });
  
interface ChartDataPoint {
  date: string;
  count: number;
}

interface StatusDataPoint {
  name: string;
  value: number;
  color: string;
}

interface WorkOrder {
  id: string;
  status?: string;
  created_at?: string;
  technician_id?: string;
  completed_at?: string;
  tenant_id?: string;
}

interface SaposOffer {
  price: number | string;
}

interface Invoice {
  total_amount: number | string;
  status: string;
}

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [statusData, setStatusData] = useState<StatusDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get role-specific configuration
  const roleConfig = getRoleConfig(roles.map(r => r.role));

  useEffect(() => {
    if (!rbacLoading) {
      fetchDashboardData();
    }
  }, [tenantId, isSysAdmin, rbacLoading]);

  const fetchDashboardData = async () => {
    if (rbacLoading || (!isSysAdmin && !tenantId)) {
      console.log('Waiting for RBAC context...');
      return;
    }

    try {
      if (!user) return;
      
      // Build query with tenant filtering - only sys_admin sees ALL data
      let woQuery = apiClient.from('work_orders').select('*');
      
      // Apply tenant filter for everyone except sys_admin
      if (!isSysAdmin && tenantId) {
        woQuery = woQuery.eq('tenant_id', tenantId);
      }

      const woResult = await woQuery;
      const allWorkOrders = (woResult.data || []) as WorkOrder[];
      const totalWOCount = allWorkOrders.length;

      const activeWOs = allWorkOrders.filter(wo => ['in_progress', 'assigned'].includes(wo.status || '')).length;
      const completedWOs = allWorkOrders.filter(wo => wo.status === 'completed').length;
      const pendingWOs = allWorkOrders.filter(wo => wo.status === 'pending_validation').length;

      // Technician-specific metrics
      let myAssignedWOs = 0;
      let myCompletedToday = 0;
      if (hasRole('technician') && user) {
        const myWOsResult = await apiClient.from('work_orders')
          .select('*')
          .eq('technician_id', user.id)
          .in('status', ['in_progress', 'assigned']);
        myAssignedWOs = myWOsResult.data?.length || 0;

        const today = new Date().toISOString().split('T')[0];
        const completedTodayResult = await apiClient.from('work_orders')
          .select('*')
          .eq('technician_id', user.id)
          .eq('status', 'completed')
          .gte('completed_at', today);
        myCompletedToday = completedTodayResult.data?.length || 0;
      }

      // Ticket metrics
      let ticketQuery = apiClient.from('tickets')
        .select('*')
        .eq('status', 'open');
      
      if (!isSysAdmin && tenantId) {
        ticketQuery = ticketQuery.eq('tenant_id', tenantId);
      }
      
      const ticketResult = await ticketQuery;
      const openTicketCount = ticketResult.data?.length || 0;

      // Inventory metrics (simplified - stock_levels relationship may not exist)
      let inventoryQuery = apiClient.from('inventory_items')
        .select('id');
      
      if (!isSysAdmin && tenantId) {
        inventoryQuery = inventoryQuery.eq('tenant_id', tenantId);
      }
      
      const inventoryResult = await inventoryQuery;
      const inventoryData = inventoryResult.data || [];

      // Simplified inventory calculation (assuming qty_available column exists)
      const totalParts = inventoryData.length || 0;
      const lowStockItems = 0; // Placeholder - would need stock_levels data

      // Financial metrics
      let offersQuery = apiClient.from('sapos_offers')
        .select('price')
        .eq('status', 'accepted');
      
      if (!isSysAdmin && tenantId) {
        offersQuery = offersQuery.eq('tenant_id', tenantId);
      }
      
      const saposResult = await offersQuery;
      const saposOffers = (saposResult.data || []) as SaposOffer[];
      const saposRevenue = saposOffers.reduce((sum, offer) => sum + Number(offer.price || 0), 0);

      // Monthly revenue (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let monthlyOffersQuery = apiClient.from('sapos_offers')
        .select('price')
        .eq('status', 'accepted')
        .gte('created_at', thirtyDaysAgo.toISOString());
      
      if (!isSysAdmin && tenantId) {
        monthlyOffersQuery = monthlyOffersQuery.eq('tenant_id', tenantId);
      }
      
      const monthlyResult = await monthlyOffersQuery;
      const monthlyOffers = (monthlyResult.data || []) as SaposOffer[];
      const monthlyRevenue = monthlyOffers.reduce((sum, offer) => sum + Number(offer.price || 0), 0);

      // Invoices
      let invoicesQuery = apiClient.from('invoices')
        .select('total_amount, status')
        .in('status', ['sent', 'overdue']);
      
      if (!isSysAdmin && tenantId) {
        invoicesQuery = invoicesQuery.eq('tenant_id', tenantId);
      }
      
      const invoicesResult = await invoicesQuery;
      const invoices = (invoicesResult.data || []) as Invoice[];
      const totalPayables = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
      const overdueInvoices = invoices.filter((inv) => inv.status === 'overdue').length;

      // Fraud & Compliance metrics (placeholder - these tables may not exist yet)
      // Use work orders as proxy for now
      const fraudCount = 0; // Placeholder
      const anomalyCount = 0; // Placeholder  
      const forgeryCount = 0; // Placeholder

      // Team metrics
      let techQuery = apiClient.from('profiles').select('*');
      
      if (!isSysAdmin && tenantId) {
        techQuery = techQuery.eq('tenant_id', tenantId);
      }
      
      const techResult = await techQuery;
      const techCount = techResult.data?.length || 0;

      setStats({
        totalWOs: totalWOCount || 0,
        activeWorkOrders: activeWOs,
        completedWOs,
        pendingValidation: pendingWOs,
        myAssignedWOs,
        myCompletedToday,
        
        pendingTickets: pendingWOs,
        openTickets: openTicketCount || 0,
        
        partsInStock: totalParts,
        lowStockItems,
        
        saposRevenue,
        totalPayables,
        monthlyRevenue,
        overdueInvoices,
        
        activeFraudCases: fraudCount || 0,
        anomaliesDetected: anomalyCount || 0,
        forgeriesDetected: forgeryCount || 0,
        complianceScore: 95,
        policyViolations: 0,
        auditsPending: 0,
        
        activeTechnicians: techCount || 0,
        totalCustomers: 0,
        partnerPerformance: 0,
      });

      // Generate chart data - last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const chartDataProcessed = last7Days.map(date => {
        const count = allWorkOrders.filter(wo => wo.created_at?.startsWith(date)).length;
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

  // Format card values based on data type
  const formatCardValue = (value: number | string, dataKey: keyof DashboardStats): string => {
    if (typeof value === 'number') {
      // Financial metrics
      if (['saposRevenue', 'totalPayables', 'monthlyRevenue'].includes(dataKey)) {
        return formatCurrency(value, false);
      }
      // Percentage metrics
      if (dataKey === 'complianceScore') {
        return `${value}%`;
      }
      // Regular numbers
      return value.toLocaleString();
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isSysAdmin ? 'Platform-wide Overview' : 'Your Organization Overview'}
          </p>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex">
          {roles.join(', ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Badge>
      </div>

      {/* Role-specific stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {roleConfig.cards.map((card) => {
          const IconComponent = card.icon;
          const value = stats[card.dataKey];
          const formattedValue = formatCardValue(value, card.dataKey);
          
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <IconComponent className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formattedValue}</div>
                {'subtitle' in card && card.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Operational Command View - only for certain roles */}
      {roleConfig.showOperationalView && (
        <div className="lg:col-span-2">
          <OperationalCommandView />
        </div>
      )}

      {/* Charts - only show for roles that need them */}
      {roleConfig.showCharts && (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Work Orders Trend</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Last 7 days activity</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-[10px] sm:text-xs" />
                    <YAxis className="text-[10px] sm:text-xs" />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Status Distribution</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Current work order breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name: string; percent?: number }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={60}
                      className="sm:outerRadius-80"
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
                <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Platform Features Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            Platform Features
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">87 integrated modules for complete field service management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center p-2 sm:p-3">
              <div className="text-xl sm:text-2xl font-bold text-primary mb-1">87</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Total Modules</div>
            </div>
            <div className="text-center p-2 sm:p-3">
              <div className="text-xl sm:text-2xl font-bold text-accent mb-1">24/7</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">AI Support</div>
            </div>
            <div className="text-center p-2 sm:p-3">
              <div className="text-xl sm:text-2xl font-bold text-success mb-1">99.9%</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center p-2 sm:p-3">
              <div className="text-xl sm:text-2xl font-bold text-warning mb-1">Real-time</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Analytics</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
