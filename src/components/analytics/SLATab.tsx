import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { EnhancedSLATab } from './EnhancedSLATab';

export function SLATab() {
  return <EnhancedSLATab />;
}

export function SLATabLegacy() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSLAMetrics();
  }, []);

  const fetchSLAMetrics = async () => {
    try {
      const { data } = await supabase
        .from('work_orders')
        .select('status, completed_at, created_at');

      if (data) {
        const total = data.length;
        const completed = data.filter(wo => wo.status === 'completed');
        // Simplified breach calculation - WOs taking > 7 days
        const breached = data.filter(wo => {
          if (!wo.completed_at || !wo.created_at) return false;
          const duration = new Date(wo.completed_at).getTime() - new Date(wo.created_at).getTime();
          return duration > 7 * 24 * 60 * 60 * 1000; // 7 days in ms
        });
        
        const compliance = total > 0 ? ((total - breached.length) / total * 100).toFixed(1) : '100';

        setMetrics({
          total,
          completed: completed.length,
          breached: breached.length,
          compliance
        });
      }
    } catch (error) {
      console.error('Failed to fetch SLA metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              SLA Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-20" /> : `${metrics?.compliance}%`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-20" /> : metrics?.total || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {loading ? <Skeleton className="h-8 w-20" /> : metrics?.completed || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Breached
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {loading ? <Skeleton className="h-8 w-20" /> : metrics?.breached || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            SLA Performance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Trend charts will display once more data is available. Currently showing {metrics?.total || 0} work orders.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
