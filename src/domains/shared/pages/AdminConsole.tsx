import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { useAuth } from '@/domains/auth/contexts/AuthContext';
import { useRBAC } from '@/domains/auth/contexts/RBACContext';
import { apiClient } from '@/integrations/api/client';
import { 
  Settings, 
  CreditCard, 
  BarChart3, 
  Shield, 
  Users, 
  Activity, 
  Plug, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Server,
  Database,
  Zap,
  Save,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminConsole() {
  const { toast } = useToast();
  const { user } = useAuth();
  const rbac = useRBAC();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Platform Configuration State
  const [platformSettings, setPlatformSettings] = useState<any[]>([]);
  const [newSettingKey, setNewSettingKey] = useState('');
  const [newSettingValue, setNewSettingValue] = useState('');
  const [newSettingType, setNewSettingType] = useState('system');
  
  // Billing State
  const [billingPlans, setBillingPlans] = useState<any[]>([]);
  const [tenantSubscription, setTenantSubscription] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [billingFrequency, setBillingFrequency] = useState('monthly');
  
  // Usage Analytics State
  const [usageData, setUsageData] = useState<any[]>([]);
  const [usageMetrics, setUsageMetrics] = useState({
    totalWorkOrders: 0,
    totalApiCalls: 0,
    totalUsers: 0,
    avgResponseTime: 0
  });
  
  // System Health State
  const [systemHealth, setSystemHealth] = useState<any[]>([]);
  const [overallHealth, setOverallHealth] = useState('healthy');
  
  // User Management State
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    technicianUsers: 0
  });
  
  // Integrations State
  const [integrations, setIntegrations] = useState<any[]>([]);

  useEffect(() => {
    // Check admin access
    if (!rbac.isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Admin privileges required',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }
    
    loadAllData();
  }, [rbac.isAdmin]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPlatformSettings(),
        loadBillingData(),
        loadUsageAnalytics(),
        loadSystemHealth(),
        loadUserStats(),
        loadIntegrations()
      ]);
    } catch (error: any) {
      console.error('Error loading admin data:', error);
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPlatformSettings = async () => {
    let query = supabase
      .from('platform_settings' as any)
      .select('*')
      .order('created_at', { ascending: false }) as any;
    
    // tenant_admin and partner_admin only see their tenant's settings
    if (!rbac.hasRole('sys_admin') && rbac.tenantId) {
      query = query.eq('tenant_id', rbac.tenantId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    setPlatformSettings(data || []);
  };

  const loadBillingData = async () => {
    // Load billing plans
    const { data: plans, error: plansError } = await supabase
      .from('billing_plans' as any)
      .select('*')
      .eq('is_active', true)
      .order('price_monthly');
    
    if (plansError) throw plansError;
    setBillingPlans(plans || []);

    // Load tenant subscription if tenant admin
    if (rbac.hasRole('tenant_admin')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (profile?.tenant_id) {
        const { data: subscription } = await supabase
          .from('tenant_subscriptions' as any)
          .select('*, billing_plan:billing_plans(*)')
          .eq('tenant_id', profile.tenant_id)
          .single();
        
        setTenantSubscription(subscription);
      }
    }
  };

  const loadUsageAnalytics = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user?.id)
      .single();

    if (!profile?.tenant_id) return;

    // Get usage data for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('usage_analytics' as any)
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .gte('recorded_at', thirtyDaysAgo.toISOString())
      .order('recorded_at', { ascending: false });
    
    if (error) throw error;
    setUsageData(data || []);

    // Calculate metrics
    const woCount = data?.filter((d: any) => d.metric_type === 'work_orders')
      .reduce((sum: number, d: any) => sum + Number(d.metric_value), 0) || 0;
    const apiCount = data?.filter((d: any) => d.metric_type === 'api_calls')
      .reduce((sum: number, d: any) => sum + Number(d.metric_value), 0) || 0;
    
    setUsageMetrics({
      totalWorkOrders: woCount,
      totalApiCalls: apiCount,
      totalUsers: 0, // Will be calculated from user stats
      avgResponseTime: 0 // Will be calculated from system health
    });
  };

  const loadSystemHealth = async () => {
    let query = supabase
      .from('system_health_metrics' as any)
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(50) as any;
    
    // Only sys_admin sees global system health, others see tenant-specific
    if (!rbac.hasRole('sys_admin') && rbac.tenantId) {
      query = query.eq('tenant_id', rbac.tenantId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    setSystemHealth(data || []);

    // Determine overall health
    const criticalCount = data?.filter((d: any) => d.status === 'critical').length || 0;
    const warningCount = data?.filter((d: any) => d.status === 'warning').length || 0;
    
    if (criticalCount > 0) {
      setOverallHealth('critical');
    } else if (warningCount > 0) {
      setOverallHealth('warning');
    } else {
      setOverallHealth('healthy');
    }
  };

  const loadUserStats = async () => {
    let profilesQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true }) as any;
    
    let rolesQuery = supabase
      .from('user_roles')
      .select('role, tenant_id') as any;
    
    // Filter by tenant for non-sys_admin users
    if (!rbac.hasRole('sys_admin') && rbac.tenantId) {
      profilesQuery = profilesQuery.eq('tenant_id', rbac.tenantId);
      rolesQuery = rolesQuery.eq('tenant_id', rbac.tenantId);
    }
    
    const { count: totalCount } = await profilesQuery;
    const { data: roles } = await rolesQuery;

    const adminCount = roles?.filter(r => ['sys_admin', 'tenant_admin', 'partner_admin'].includes(r.role)).length || 0;
    const techCount = roles?.filter(r => r.role === 'technician').length || 0;

    setUserStats({
      totalUsers: totalCount || 0,
      activeUsers: totalCount || 0, // Simplified
      adminUsers: adminCount,
      technicianUsers: techCount
    });
  };

  const loadIntegrations = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user?.id)
      .single();

    if (!profile?.tenant_id) return;

    const { data, error } = await supabase
      .from('platform_integrations' as any)
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false});
    
    if (error) throw error;
    setIntegrations(data || []);
  };

  const savePlatformSetting = async () => {
    if (!newSettingKey || !newSettingValue) {
      toast({
        title: 'Missing information',
        description: 'Please provide both key and value',
        variant: 'destructive',
      });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user?.id)
      .single();

    try {
      const { error } = await supabase
        .from('platform_settings' as any)
        .upsert({
          tenant_id: profile?.tenant_id,
          setting_key: newSettingKey,
          setting_value: JSON.parse(newSettingValue),
          setting_type: newSettingType,
          updated_by: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Setting saved',
        description: 'Platform setting has been updated',
      });

      setNewSettingKey('');
      setNewSettingValue('');
      loadPlatformSettings();
    } catch (error: any) {
      toast({
        title: 'Error saving setting',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateSubscription = async () => {
    if (!selectedPlan) {
      toast({
        title: 'No plan selected',
        description: 'Please select a billing plan',
        variant: 'destructive',
      });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user?.id)
      .single();

    if (!profile?.tenant_id) return;

    const currentPeriodEnd = new Date();
    if (billingFrequency === 'monthly') {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    } else if (billingFrequency === 'quarterly') {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 3);
    } else {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    }

    try {
      const { error } = await supabase
        .from('tenant_subscriptions' as any)
        .upsert({
          tenant_id: profile.tenant_id,
          billing_plan_id: selectedPlan,
          status: 'active',
          billing_frequency: billingFrequency,
          current_period_start: new Date().toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
          auto_renew: true
        });

      if (error) throw error;

      toast({
        title: 'Subscription updated',
        description: 'Your billing plan has been updated successfully',
      });

      loadBillingData();
    } catch (error: any) {
      toast({
        title: 'Error updating subscription',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleIntegration = async (integrationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('platform_integrations' as any)
        .update({ is_active: !currentStatus })
        .eq('id', integrationId);

      if (error) throw error;

      toast({
        title: 'Integration updated',
        description: `Integration has been ${!currentStatus ? 'enabled' : 'disabled'}`,
      });

      loadIntegrations();
    } catch (error: any) {
      toast({
        title: 'Error updating integration',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'critical':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return CheckCircle2;
      case 'warning':
        return AlertTriangle;
      case 'critical':
        return XCircle;
      default:
        return Activity;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Console</h1>
          <p className="text-muted-foreground">Platform configuration and management</p>
        </div>
        <Button onClick={loadAllData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {(() => {
              const Icon = getHealthIcon(overallHealth);
              return <Icon className={`h-4 w-4 ${getHealthColor(overallHealth)}`} />;
            })()}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{overallHealth}</div>
            <p className="text-xs text-muted-foreground">
              {systemHealth.length} metrics tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {userStats.adminUsers} admins, {userStats.technicianUsers} technicians
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Work Orders</CardTitle>
            <BarChart3 className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageMetrics.totalWorkOrders}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Zap className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageMetrics.totalApiCalls}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('config')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Platform Configuration
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('billing')}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Subscription
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/settings')}>
                  <Users className="h-4 w-4 mr-2" />
                  User Management
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('health')}>
                  <Activity className="h-4 w-4 mr-2" />
                  System Monitoring
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {platformSettings.slice(0, 5).map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {setting.setting_key}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(setting.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {platformSettings.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>Configure system-wide settings and features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="setting-key">Setting Key</Label>
                  <Input
                    id="setting-key"
                    value={newSettingKey}
                    onChange={(e) => setNewSettingKey(e.target.value)}
                    placeholder="e.g., feature_flags.ai_enabled"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setting-value">Setting Value (JSON)</Label>
                  <Textarea
                    id="setting-value"
                    value={newSettingValue}
                    onChange={(e) => setNewSettingValue(e.target.value)}
                    placeholder='e.g., {"enabled": true, "model": "gpt-4"}'
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setting-type">Setting Type</Label>
                  <Select value={newSettingType} onValueChange={setNewSettingType}>
                    <SelectTrigger id="setting-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={savePlatformSetting}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Setting
                </Button>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Current Settings</h4>
                <div className="space-y-2">
                  {platformSettings.map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{setting.setting_key}</div>
                        <div className="text-xs text-muted-foreground">
                          {JSON.stringify(setting.setting_value)}
                        </div>
                      </div>
                      <Badge variant="outline">{setting.setting_type}</Badge>
                    </div>
                  ))}
                  {platformSettings.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No settings configured</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>Manage your billing plan and subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tenantSubscription ? (
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{tenantSubscription.billing_plan?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {tenantSubscription.billing_plan?.description}
                      </p>
                    </div>
                    <Badge>{tenantSubscription.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Billing Frequency:</span>
                      <p className="font-medium capitalize">{tenantSubscription.billing_frequency}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Current Period:</span>
                      <p className="font-medium">
                        {new Date(tenantSubscription.current_period_start).toLocaleDateString()} - {new Date(tenantSubscription.current_period_end).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No active subscription
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Change Plan</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Select Plan</Label>
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a plan..." />
                      </SelectTrigger>
                      <SelectContent>
                        {billingPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} - ${plan.price_monthly}/month
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Billing Frequency</Label>
                    <Select value={billingFrequency} onValueChange={setBillingFrequency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly (10% off)</SelectItem>
                        <SelectItem value="yearly">Yearly (20% off)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={updateSubscription} className="w-full">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Update Subscription
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Available Plans</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  {billingPlans.map((plan) => (
                    <Card key={plan.id} className={plan.id === selectedPlan ? 'border-primary' : ''}>
                      <CardHeader>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-4">
                          ${plan.price_monthly}
                          <span className="text-sm font-normal text-muted-foreground">/month</span>
                        </div>
                        <ul className="space-y-2 text-sm">
                          {(plan.features as string[]).map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Usage Overview</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Work Orders Created</span>
                    <span className="font-bold">{usageMetrics.totalWorkOrders}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">API Calls</span>
                    <span className="font-bold">{usageMetrics.totalApiCalls}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Users</span>
                    <span className="font-bold">{userStats.activeUsers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan Limits</CardTitle>
                <CardDescription>Current billing period</CardDescription>
              </CardHeader>
              <CardContent>
                {tenantSubscription?.billing_plan ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Users</span>
                        <span className="text-sm">
                          {userStats.totalUsers} / {tenantSubscription.billing_plan.max_users || '∞'}
                        </span>
                      </div>
                      {tenantSubscription.billing_plan.max_users && (
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary"
                            style={{ width: `${Math.min((userStats.totalUsers / tenantSubscription.billing_plan.max_users) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Work Orders</span>
                        <span className="text-sm">
                          {usageMetrics.totalWorkOrders} / {tenantSubscription.billing_plan.max_work_orders || '∞'}
                        </span>
                      </div>
                      {tenantSubscription.billing_plan.max_work_orders && (
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent"
                            style={{ width: `${Math.min((usageMetrics.totalWorkOrders / tenantSubscription.billing_plan.max_work_orders) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">No active subscription</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usage Trends</CardTitle>
              <CardDescription>Platform activity over time</CardDescription>
            </CardHeader>
            <CardContent>
              {usageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={usageData.slice(0, 30).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="recorded_at" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Line type="monotone" dataKey="metric_value" stroke="hsl(var(--primary))" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No usage data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
                <Database className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Healthy</div>
                <p className="text-xs text-muted-foreground">All connections active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Services</CardTitle>
                <Server className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Online</div>
                <p className="text-xs text-muted-foreground">99.9% uptime</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                <Zap className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">245ms</div>
                <p className="text-xs text-muted-foreground">Average latency</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Metrics</CardTitle>
              <CardDescription>Real-time health monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {systemHealth.slice(0, 10).map((metric) => {
                  const Icon = getHealthIcon(metric.status);
                  return (
                    <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${getHealthColor(metric.status)}`} />
                        <div>
                          <div className="font-medium">{metric.metric_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(metric.recorded_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{metric.metric_value}</div>
                        <Badge variant="outline" className={getHealthColor(metric.status)}>
                          {metric.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {systemHealth.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No health metrics available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Integrations</CardTitle>
              <CardDescription>Manage external service connections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {integrations.map((integration) => (
                  <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Plug className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">{integration.integration_name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {integration.integration_type}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {integration.last_sync_at && (
                        <span className="text-xs text-muted-foreground">
                          Last sync: {new Date(integration.last_sync_at).toLocaleDateString()}
                        </span>
                      )}
                      <Switch
                        checked={integration.is_active}
                        onCheckedChange={() => toggleIntegration(integration.id, integration.is_active)}
                      />
                    </div>
                  </div>
                ))}
                {integrations.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No integrations configured</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}