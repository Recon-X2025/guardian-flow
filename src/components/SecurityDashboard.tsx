import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Shield, Activity } from 'lucide-react';

interface SecurityMetrics {
  security_events: {
    total: number;
    critical: number;
    high: number;
    suspicious_patterns: any[];
  };
  errors: {
    total: number;
    by_function: Record<string, number>;
    recent_critical: any[];
  };
  timestamp: string;
}

export function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityMetrics();
    const interval = setInterval(fetchSecurityMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityMetrics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('security-monitor');
      if (error) throw error;
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch security metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading security dashboard...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.security_events.total || 0}</div>
            <p className="text-xs text-muted-foreground">Last hour</p>
            <div className="mt-2 flex gap-2">
              <Badge variant="destructive">{metrics?.security_events.critical || 0} Critical</Badge>
              <Badge variant="destructive">{metrics?.security_events.high || 0} High</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Function Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.errors.total || 0}</div>
            <p className="text-xs text-muted-foreground">Last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics?.security_events.critical || 0) > 0 ? 'Alert' : 'Normal'}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.timestamp && new Date(metrics.timestamp).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {metrics?.security_events.suspicious_patterns && metrics.security_events.suspicious_patterns.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Suspicious Activity Detected</div>
            {metrics.security_events.suspicious_patterns.map((pattern, idx) => (
              <div key={idx} className="text-sm">
                {pattern.type}: {JSON.stringify(pattern)}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Error Analysis</CardTitle>
          <CardDescription>Function errors by name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics?.errors.by_function && Object.entries(metrics.errors.by_function)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([fn, count]) => (
                <div key={fn} className="flex justify-between items-center">
                  <span className="text-sm font-mono">{fn}</span>
                  <Badge>{count}</Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
