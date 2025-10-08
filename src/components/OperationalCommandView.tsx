import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Users, Package, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface OPCVData {
  stages: {
    scheduled: number;
    in_progress: number;
    pending_parts: number;
    pending_validation: number;
    sla_breached: number;
    avg_age_hours: number;
  };
  forecast_breaches: Array<{ geography_key: string; value: number }>;
  top_engineers: Array<{ id: string; name: string; active_wos: number }>;
  inventory_alerts: Array<{ part_id: string; name: string; risk_level: string; days_stock: number }>;
  ai_summary: string;
  generated_at: string;
}

export function OperationalCommandView() {
  const [data, setData] = useState<OPCVData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOPCVData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchOPCVData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchOPCVData = async () => {
    try {
      const { data: response, error } = await supabase.functions.invoke('opcv-summary', {
        body: { tenant_id: null } // Will use user's tenant
      });

      if (error) throw error;
      setData(response);
    } catch (error) {
      console.error('Failed to fetch OPCV data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Failed to load operational data</p>
        </CardContent>
      </Card>
    );
  }

  const totalActive = data.stages.scheduled + data.stages.in_progress + 
                      data.stages.pending_parts + data.stages.pending_validation;

  return (
    <div className="space-y-6">
      {/* Stage Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Active</CardTitle>
            <Badge variant="default">{totalActive}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActive}</div>
            <p className="text-xs text-muted-foreground">Work orders in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Badge variant="secondary">{data.stages.scheduled}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stages.scheduled}</div>
            <p className="text-xs text-muted-foreground">Awaiting dispatch</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Badge variant="default">{data.stages.in_progress}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stages.in_progress}</div>
            <p className="text-xs text-muted-foreground">Currently servicing</p>
          </CardContent>
        </Card>

        <Card className={data.stages.sla_breached > 0 ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SLA Breached</CardTitle>
            <AlertTriangle className={data.stages.sla_breached > 0 ? 'text-destructive' : 'text-muted-foreground'} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{data.stages.sla_breached}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forecast Breaches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              High Volume Zones (48h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.forecast_breaches.length > 0 ? (
              <div className="space-y-2">
                {data.forecast_breaches.slice(0, 5).map((breach, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded bg-muted/50">
                    <span className="text-sm font-medium">{breach.geography_key}</span>
                    <Badge variant="outline">{Math.round(breach.value)} WOs</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No high-volume zones predicted</p>
            )}
          </CardContent>
        </Card>

        {/* Top Engineers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Active Engineers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.top_engineers.length > 0 ? (
              <div className="space-y-2">
                {data.top_engineers.map((engineer) => (
                  <div key={engineer.id} className="flex justify-between items-center p-2 rounded bg-muted/50">
                    <span className="text-sm font-medium">{engineer.name}</span>
                    <Badge variant="secondary">{engineer.active_wos} WOs</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active engineers</p>
            )}
          </CardContent>
        </Card>

        {/* Inventory Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.inventory_alerts.length > 0 ? (
              <div className="space-y-2">
                {data.inventory_alerts.map((alert, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded bg-muted/50">
                    <div>
                      <span className="text-sm font-medium block">{alert.name}</span>
                      <span className="text-xs text-muted-foreground">{alert.part_id}</span>
                    </div>
                    <Badge variant={alert.risk_level === 'high' ? 'destructive' : 'outline'}>
                      {alert.days_stock}d stock
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">All parts adequately stocked</p>
            )}
          </CardContent>
        </Card>

        {/* AI Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{data.ai_summary}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Generated at {new Date(data.generated_at).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
