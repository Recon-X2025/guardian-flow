import { useState, useEffect } from "react";
import { apiClient } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/domains/shared/hooks/use-toast";
import { Loader2, AlertTriangle, Shield, CheckCircle2, XCircle, Play, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FraudAlert {
  id: string;
  anomaly_type: string;
  severity: string;
  investigation_status: string;
  description?: string;
  resource_type?: string;
  resource_id?: string;
  detection_model?: string;
  confidence_score?: number;
  investigator_id?: string;
  resolution_notes?: string;
  resolved_at?: string;
  created_at: string;
}

export default function FraudInvestigation() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [llmProvider, setLlmProvider] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await apiClient
        .from('fraud_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts((data || []) as FraudAlert[]);
    } catch (error: unknown) {
      toast({
        title: "Error loading alerts",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runFraudDetection = async () => {
    setDetecting(true);
    try {
      const result = await apiClient.functions.invoke('run-fraud-detection', {
        body: {}
      });
      if (result.error) throw result.error;
      const data = result.data as { summary?: { total_alerts?: number }; llm_provider?: string };
      setLlmProvider(data?.llm_provider || null);
      const alertCount = data?.summary?.total_alerts || 0;
      toast({
        title: 'Fraud detection complete',
        description: `Found ${alertCount} alert${alertCount !== 1 ? 's' : ''}`,
      });
      fetchAlerts();
    } catch (error: unknown) {
      toast({
        title: 'Fraud detection failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDetecting(false);
    }
  };

  const loadDetectionDetails = async (detectionId: string) => {
    try {
      const { data: detection } = await apiClient
        .from("forgery_detections")
        .select("*, fraud_alerts(*)")
        .eq("id", detectionId)
        .single();

      const detectionData = detection as { fraud_alerts?: { id: string } } | null;
      if (detectionData && detectionData.fraud_alerts) {
        // Scroll to the fraud alert card
        setTimeout(() => {
          const alertElement = document.getElementById(`alert-${detectionData.fraud_alerts!.id}`);
          alertElement?.scrollIntoView({ behavior: 'smooth' });
        }, 500);
      }
    } catch (error: unknown) {
      console.error("Error loading detection details:", error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    
    // Check for detection ID in URL params to show specific detection
    const params = new URLSearchParams(window.location.search);
    const detectionId = params.get('detection');
    if (detectionId) {
      loadDetectionDetails(detectionId);
    }
  }, []);

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    return colors[severity] || colors.medium;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ElementType> = {
      open: AlertTriangle,
      in_progress: Shield,
      resolved: CheckCircle2,
      escalated: XCircle,
    };
    const Icon = icons[status] || AlertTriangle;
    return <Icon className="h-4 w-4" />;
  };

  const updateInvestigation = async (alertId: string, status: 'open' | 'in_progress' | 'resolved' | 'escalated') => {
    try {
      const result = await apiClient.functions.invoke('update-fraud-investigation', {
        body: {
          alert_id: alertId,
          investigation_status: status,
          resolution_notes: resolutionNotes[alertId] || null,
        }
      });

      if (result.error) throw result.error;

      toast({ title: "Investigation updated" });
      setResolutionNotes(prev => { const next = { ...prev }; delete next[alertId]; return next; });
      fetchAlerts();
    } catch (error: unknown) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const openAlerts = alerts.filter(a => a.investigation_status === 'open');
  const inProgress = alerts.filter(a => a.investigation_status === 'in_progress');
  const resolved = alerts.filter(a => a.investigation_status === 'resolved');
  const critical = alerts.filter(a => a.severity === 'critical');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fraud & Anomaly Investigation</h1>
          <p className="text-muted-foreground">
            Investigate and resolve detected anomalies and fraud alerts
          </p>
        </div>
        <Button onClick={runFraudDetection} disabled={detecting}>
          {detecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run Fraud Detection
            </>
          )}
        </Button>
      </div>

      {llmProvider === 'mock' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Fraud detection powered by statistical z-score anomaly analysis. Connect OpenAI for AI-generated alert explanations.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openAlerts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgress.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolved.length}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{critical.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Investigations</CardTitle>
          <CardDescription>Fraud alerts requiring investigation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(alert.investigation_status)}
                    <h3 className="font-semibold">{alert.anomaly_type.replace(/_/g, ' ').toUpperCase()}</h3>
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <Badge variant="outline">{alert.investigation_status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(alert.created_at).toLocaleString()}
                  </div>
                </div>

                <p className="text-sm mb-3">{alert.description || 'No description'}</p>

                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground mb-3">
                  <div>
                    <span className="font-medium">Resource:</span> {alert.resource_type} ({alert.resource_id})
                  </div>
                  <div>
                    <span className="font-medium">Detection Model:</span> {alert.detection_model || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Confidence:</span> {((alert.confidence_score || 0) * 100).toFixed(0)}%
                  </div>
                  {alert.investigator_id && (
                    <div>
                      <span className="font-medium">Investigator:</span> {alert.investigator_id}
                    </div>
                  )}
                </div>

                {alert.investigation_status !== 'resolved' && (
                  <div className="space-y-3 pt-3 border-t">
                    <Textarea
                      placeholder="Resolution notes..."
                      value={resolutionNotes[alert.id] || ''}
                      onChange={(e) => setResolutionNotes(prev => ({ ...prev, [alert.id]: e.target.value }))}
                      className="h-20"
                    />
                    <div className="flex gap-2">
                      <Select
                        onValueChange={(value) => updateInvestigation(alert.id, value as 'open' | 'in_progress' | 'resolved' | 'escalated')}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Update status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="escalated">Escalated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {alert.resolution_notes && (
                  <div className="mt-3 p-3 bg-muted rounded text-sm">
                    <p className="font-medium mb-1">Resolution:</p>
                    <p>{alert.resolution_notes}</p>
                    {alert.resolved_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Resolved: {new Date(alert.resolved_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            ))}

            {alerts.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No fraud alerts. System is secure.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feedback Loop Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Investigation outcomes feed back into anomaly detection models</p>
          <p>• Active learning improves detection accuracy over time</p>
          <p>• High-risk invoices auto-hold until investigation closed</p>
          <p>• All resolutions are logged in audit trail</p>
        </CardContent>
      </Card>
    </div>
  );
}