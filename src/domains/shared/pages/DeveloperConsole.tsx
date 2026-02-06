import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/domains/shared/hooks/use-toast";
import { Key, TrendingUp, Download, RefreshCw, Copy, Plus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAuth } from '@/domains/auth/contexts/AuthContext';

// Type definitions
interface TenantApiKey {
  id: string;
  tenant_id: string;
  api_key: string;
  name: string;
  status: string;
  rate_limit: number;
  expiry_date: string;
  last_used_at?: string;
  created_at: string;
}

interface UsageLog {
  endpoint: string;
  timestamp: string;
  status_code: number;
}

interface UsageDataPoint {
  date: string;
  total: number;
  success: number;
  error: number;
}

interface BillingData {
  id: string;
  tenant_id: string;
  api_calls: number;
  amount_due: number;
  status: string;
  billing_cycle_start: string;
  billing_cycle_end: string;
}

export default function DeveloperConsole() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<TenantApiKey[]>([]);
  const [usageData, setUsageData] = useState<UsageDataPoint[]>([]);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Get user profile and tenant
    const { data: profile } = await apiClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    const profileData = profile as { tenant_id?: string } | null;
    if (!profileData?.tenant_id) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You must be associated with a tenant to access the developer console",
      });
      navigate('/');
      return;
    }

    setTenantId(profileData.tenant_id);
    loadData(profileData.tenant_id);
  };

  const loadData = async (tid: string) => {
    setLoading(true);
    try {
      // Load API keys
      const { data: keys } = await apiClient
        .from('tenant_api_keys')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false });

      setApiKeys((keys || []) as TenantApiKey[]);

      // Load usage analytics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: usage } = await apiClient
        .from('api_usage_logs')
        .select('endpoint, timestamp, status_code')
        .eq('tenant_id', tid)
        .gte('timestamp', thirtyDaysAgo.toISOString());

      if (usage) {
        const grouped = groupUsageByDate(usage as UsageLog[]);
        setUsageData(grouped);
      }

      // Load billing data
      const { data: billing } = await apiClient
        .from('billing_usage')
        .select('*')
        .eq('tenant_id', tid)
        .order('billing_cycle_start', { ascending: false })
        .limit(1);

      const billingArray = billing as BillingData[] | null;
      setBillingData(billingArray && billingArray.length > 0 ? billingArray[0] : null);

    } catch (error: unknown) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load developer console data",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupUsageByDate = (usage: UsageLog[]): UsageDataPoint[] => {
    const grouped: Record<string, UsageDataPoint> = {};
    usage.forEach(log => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { date, total: 0, success: 0, error: 0 };
      }
      grouped[date].total++;
      if (log.status_code >= 200 && log.status_code < 300) {
        grouped[date].success++;
      } else {
        grouped[date].error++;
      }
    });
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  };

  const generateApiKey = async () => {
    if (!tenantId) return;

    const apiKey = crypto.randomUUID();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    try {
      const { error } = await apiClient
        .from('tenant_api_keys')
        .insert({
          tenant_id: tenantId,
          api_key: apiKey,
          name: `API Key - ${new Date().toLocaleDateString()}`,
          expiry_date: expiryDate.toISOString(),
          rate_limit: 1000,
        });

      if (error) throw error;

      toast({
        title: "API Key Generated",
        description: "Your new API key has been created",
      });

      loadData(tenantId);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const revokeApiKey = async (keyId: string) => {
    try {
      const { error } = await apiClient
        .from('tenant_api_keys')
        .update({ status: 'revoked' })
        .eq('id', keyId);

      if (error) throw error;

      toast({
        title: "API Key Revoked",
        description: "The API key has been revoked",
      });

      if (tenantId) loadData(tenantId);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Developer Console</h1>
          <p className="text-muted-foreground mt-2">Manage your API keys, monitor usage, and view billing</p>
        </div>

        {/* API Key Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Key Management
                </CardTitle>
                <CardDescription>Create and manage API keys for accessing Guardian Flow APIs</CardDescription>
              </div>
              <Button onClick={generateApiKey}>
                <Plus className="h-4 w-4 mr-2" />
                Generate New Key
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs">{key.api_key.substring(0, 8)}...</code>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(key.api_key)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.status === 'active' ? 'default' : 'destructive'}>
                        {key.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{key.rate_limit} / day</TableCell>
                    <TableCell>{new Date(key.expiry_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      {key.status === 'active' && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => revokeApiKey(key.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Usage Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage Analytics
            </CardTitle>
            <CardDescription>Last 30 days API usage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" name="Total Calls" />
                <Line type="monotone" dataKey="success" stroke="hsl(var(--chart-2))" name="Success" />
                <Line type="monotone" dataKey="error" stroke="hsl(var(--destructive))" name="Errors" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Billing Summary */}
        {billingData && (
          <Card>
            <CardHeader>
              <CardTitle>Billing Summary</CardTitle>
              <CardDescription>Current billing cycle</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">API Calls</div>
                  <div className="text-2xl font-bold">{billingData.api_calls.toLocaleString()}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Amount Due</div>
                  <div className="text-2xl font-bold">₹{billingData.amount_due.toFixed(2)}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="text-2xl font-bold capitalize">{billingData.status}</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Billing Cycle: {new Date(billingData.billing_cycle_start).toLocaleDateString()} - {new Date(billingData.billing_cycle_end).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
