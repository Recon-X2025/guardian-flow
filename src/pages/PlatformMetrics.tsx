import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Zap, Users, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PlatformMetrics() {
  const { data: apiMetrics } = useQuery({
    queryKey: ['api-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_usage_metrics' as any)
        .select('*, partners(company_name)')
        .order('recorded_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: marketplaceData } = useQuery({
    queryKey: ['marketplace-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_analytics' as any)
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as any[];
    }
  });

  const totalRevenue = marketplaceData?.reduce((sum, item) => sum + (item.revenue_amount || 0), 0) || 0;
  const totalAPIcalls = apiMetrics?.reduce((sum, item) => sum + (item.request_count || 0), 0) || 0;
  const avgResponseTime = apiMetrics?.reduce((sum, item) => sum + (item.response_time_ms || 0), 0) / (apiMetrics?.length || 1);

  const uniquePartners = new Set(apiMetrics?.map(m => m.partner_id)).size;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Platform Metrics & Marketplace
        </h1>
        <p className="text-muted-foreground mt-1">
          API usage, marketplace analytics, and partner performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              API Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalAPIcalls.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {avgResponseTime.toFixed(0)}ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Partners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {uniquePartners}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="api" className="space-y-4">
        <TabsList>
          <TabsTrigger value="api">API Usage</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="billing">Billing & Monetization</TabsTrigger>
        </TabsList>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>Recent API Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {apiMetrics && apiMetrics.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead>Avg Response</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiMetrics.slice(0, 20).map((metric) => (
                      <TableRow key={metric.id}>
                        <TableCell className="font-medium">
                          {metric.partners?.company_name || 'Unknown'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {metric.api_endpoint}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{metric.http_method}</Badge>
                        </TableCell>
                        <TableCell>{metric.request_count}</TableCell>
                        <TableCell>{metric.response_time_ms}ms</TableCell>
                        <TableCell>
                          <Badge>{metric.billing_tier || 'free'}</Badge>
                        </TableCell>
                        <TableCell>${metric.cost_incurred?.toFixed(4) || '0.0000'}</TableCell>
                        <TableCell>
                          {new Date(metric.recorded_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No API usage data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketplace">
          <Card>
            <CardHeader>
              <CardTitle>Marketplace Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {marketplaceData && marketplaceData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Extension</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marketplaceData.slice(0, 20).map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Badge variant={event.event_type === 'revenue' ? 'default' : 'secondary'}>
                            {event.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{event.extension_id?.substring(0, 8) || 'N/A'}</TableCell>
                        <TableCell>{event.partner_id?.substring(0, 8) || 'N/A'}</TableCell>
                        <TableCell>
                          {event.revenue_amount > 0 ? `$${event.revenue_amount.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(event.recorded_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No marketplace activity yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Billing Tiers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-semibold">Free Tier</div>
                      <Badge variant="secondary">$0/month</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      1,000 API calls/month • Basic support • Rate limit: 60/min
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-semibold">Basic</div>
                      <Badge>$99/month</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      10,000 API calls/month • Email support • Rate limit: 120/min
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-semibold">Pro</div>
                      <Badge variant="default">$299/month</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      100,000 API calls/month • Priority support • Rate limit: 300/min
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-primary/5">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-semibold">Enterprise</div>
                      <Badge variant="outline">Custom</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Unlimited API calls • Dedicated support • Custom rate limits • White-label options
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}