import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, TrendingUp, Activity } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AnalyticsAnomalies({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const { data: anomalies } = useQuery({
    queryKey: ["analytics-anomalies", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("analytics-anomaly-detector", {
        body: { action: "get_anomalies", workspaceId }
      });
      if (error) throw error;
      return data.anomalies || [];
    }
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async ({ anomalyId, notes }: { anomalyId: string; notes: string }) => {
      const { data, error } = await supabase.functions.invoke("analytics-anomaly-detector", {
        body: { action: "acknowledge_anomaly", anomalyId, notes }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-anomalies"] });
      toast.success("Anomaly acknowledged");
      setSelectedAnomaly(null);
      setResolutionNotes("");
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const unacknowledged = anomalies?.filter((a: any) => !a.acknowledged).length || 0;
  const critical = anomalies?.filter((a: any) => a.severity === 'critical').length || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Anomalies</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{anomalies?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Detected in last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unacknowledged</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unacknowledged}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{critical}</div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Anomalies List */}
      <Card>
        <CardHeader>
          <CardTitle>Detected Anomalies</CardTitle>
          <CardDescription>Statistical anomalies detected in your data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {anomalies?.map((anomaly: any) => (
              <div key={anomaly.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${anomaly.severity === 'critical' ? 'text-destructive' : 'text-yellow-500'}`} />
                    <h4 className="font-medium">{anomaly.metric_name}</h4>
                    <Badge variant={getSeverityColor(anomaly.severity)}>{anomaly.severity}</Badge>
                    {anomaly.acknowledged && (
                      <Badge variant="outline">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Acknowledged
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Type: {anomaly.anomaly_type}
                  </p>
                  <div className="text-xs text-muted-foreground mt-1 space-y-1">
                    <p>Expected: {anomaly.expected_value?.toFixed(2)} | Detected: {anomaly.detected_value?.toFixed(2)}</p>
                    <p>Deviation: {(anomaly.deviation_score * 100).toFixed(1)}% | Confidence: {(anomaly.confidence_score * 100).toFixed(1)}%</p>
                    <p>Detected: {new Date(anomaly.detected_at).toLocaleString()}</p>
                  </div>
                </div>
                {!anomaly.acknowledged && (
                  <Button
                    size="sm"
                    onClick={() => setSelectedAnomaly(anomaly)}
                  >
                    Acknowledge
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Acknowledge Dialog */}
      <Dialog open={!!selectedAnomaly} onOpenChange={() => setSelectedAnomaly(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acknowledge Anomaly</DialogTitle>
            <DialogDescription>
              Add notes about this anomaly and mark it as acknowledged
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">{selectedAnomaly?.metric_name}</p>
              <p className="text-xs text-muted-foreground">{selectedAnomaly?.anomaly_type}</p>
            </div>
            <Textarea
              placeholder="Add resolution notes..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAnomaly(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAnomaly) {
                  acknowledgeMutation.mutate({
                    anomalyId: selectedAnomaly.id,
                    notes: resolutionNotes
                  });
                }
              }}
              disabled={acknowledgeMutation.isPending}
            >
              Acknowledge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
