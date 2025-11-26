import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Users, Package, Sparkles } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
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
      console.log('[OPCV Client] Fetching data...');
      const result = await apiClient.functions.invoke('opcv-summary');

      if (result.error) {
        console.error('[OPCV Client] Invoke error:', result.error);
        throw result.error;
      }

      console.log('[OPCV Client] Response received:', result.data);
      setData(result.data);
    } catch (error) {
      console.error('[OPCV Client] Failed to fetch OPCV data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-24 sm:h-32" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <p className="text-sm text-muted-foreground">Failed to load operational data</p>
        </CardContent>
      </Card>
    );
  }

  const totalActive = data.stages.scheduled + data.stages.in_progress + 
                      data.stages.pending_parts + data.stages.pending_validation;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stage Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Active</CardTitle>
            <Badge variant="default" className="text-xs">{totalActive}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totalActive}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Work orders in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium">Scheduled</CardTitle>
            <Badge variant="secondary" className="text-xs">{data.stages.scheduled}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{data.stages.scheduled}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Awaiting dispatch</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium">In Progress</CardTitle>
            <Badge variant="default" className="text-xs">{data.stages.in_progress}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{data.stages.in_progress}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Currently servicing</p>
          </CardContent>
        </Card>

        <Card className={data.stages.sla_breached > 0 ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium">SLA Breached</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${data.stages.sla_breached > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-destructive">{data.stages.sla_breached}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Forecast Breaches */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              High Volume Zones (48h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.forecast_breaches.length > 0 ? (
              <div className="space-y-2">
                {data.forecast_breaches.slice(0, 5).map((breach, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded bg-muted/50">
                    <span className="text-xs sm:text-sm font-medium truncate pr-2">{breach.geography_key || `Zone ${idx + 1}`}</span>
                    <Badge variant="outline" className="text-xs shrink-0">{Math.round(breach.value)} WOs</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">No high-volume zones predicted</p>
            )}
          </CardContent>
        </Card>

        {/* Top Engineers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              Top Active Engineers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.top_engineers.length > 0 ? (
              <div className="space-y-2">
                {data.top_engineers.map((engineer) => (
                  <div key={engineer.id} className="flex justify-between items-center p-2 rounded bg-muted/50">
                    <span className="text-xs sm:text-sm font-medium truncate pr-2">{engineer.name}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">{engineer.active_wos} WOs</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">No active engineers</p>
            )}
          </CardContent>
        </Card>

        {/* Inventory Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              Inventory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.inventory_alerts.length > 0 ? (
              <div className="space-y-2">
                {data.inventory_alerts.map((alert, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded bg-muted/50 gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-medium block truncate">{alert.name}</span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground truncate block">{alert.part_id}</span>
                    </div>
                    <Badge variant={alert.risk_level === 'high' ? 'destructive' : 'outline'} className="text-xs shrink-0">
                      {alert.days_stock}d stock
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">All parts adequately stocked</p>
            )}
          </CardContent>
        </Card>

        {/* AI Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm leading-relaxed">{data.ai_summary}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
              Generated at {new Date(data.generated_at).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
