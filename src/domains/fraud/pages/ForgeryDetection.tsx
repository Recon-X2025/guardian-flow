import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Eye,
  Play,
  BarChart3,
  Brain,
  AlertCircle,
  FileImage
} from "lucide-react";
import { apiClient } from "@/integrations/api/client";
import { useToast } from "@/domains/shared/hooks/use-toast";

export default function ForgeryDetection() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detections, setDetections] = useState<any[]>([]);
  const [batchJobs, setBatchJobs] = useState<any[]>([]);
  const [modelMetrics, setModelMetrics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [startingBatch, setStartingBatch] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch detections (using any to bypass type checking until types regenerate)
      let detectionQuery = (apiClient as any)
        .from('forgery_detections')
        .select('*, attachments(filename), work_orders(wo_number)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        detectionQuery = detectionQuery.eq('review_status', filter);
      }

      const { data: detectionsData } = await detectionQuery;
      setDetections(detectionsData || []);

      // Fetch batch jobs
      const { data: jobsData } = await (apiClient as any)
        .from('forgery_batch_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setBatchJobs(jobsData || []);

      // Fetch active model metrics
      const { data: metricsData } = await (apiClient as any)
        .from('forgery_model_metrics')
        .select('*')
        .eq('is_active', true)
        .order('deployed_at', { ascending: false })
        .limit(1)
        .single();
      setModelMetrics(metricsData);

      // Fetch active alerts
      const { data: alertsData } = await (apiClient as any)
        .from('forgery_monitoring_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);
      setAlerts(alertsData || []);

    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startBatchDetection = async () => {
    setStartingBatch(true);
    try {
      // Get recent work orders with attachments
      const { data: recentWOs } = await apiClient
        .from('work_orders')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!recentWOs || recentWOs.length === 0) {
        toast({
          title: "No work orders found",
          description: "No work orders with attachments to process",
          variant: "destructive",
        });
        return;
      }

      const woIds = recentWOs.map(wo => wo.id);

      const result = await apiClient.functions.invoke('process-forgery-batch', {
        body: {
          job_name: `Batch detection ${new Date().toLocaleDateString()}`,
          work_order_ids: woIds,
          job_type: 'detection'
        }
      });

      if (result.error) throw result.error;

      toast({
        title: "Batch job started",
        description: `Processing ${data.processed || 0} images. Job ID: ${data.batch_id}`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Failed to start batch job",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setStartingBatch(false);
    }
  };

  const getSeverityColor = (severity: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'false_positive': return 'secondary';
      case 'needs_review': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const totalDetections = detections.length;
  const forgeryDetected = detections.filter(d => d.forgery_detected).length;
  const avgConfidence = detections.length > 0 
    ? (detections.reduce((sum, d) => sum + parseFloat(d.confidence_score || 0), 0) / detections.length * 100).toFixed(1)
    : 0;
  const pendingReview = detections.filter(d => d.review_status === 'pending' || d.review_status === 'needs_review').length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Image Forgery Detection</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered pixel-level forgery detection and monitoring
          </p>
        </div>
        <Button onClick={startBatchDetection} disabled={startingBatch}>
          {startingBatch ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Start Batch Detection
            </>
          )}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Detections</CardTitle>
            <FileImage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDetections}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 50 analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Forgeries Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{forgeryDetected}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalDetections > 0 ? ((forgeryDetected / totalDetections) * 100).toFixed(1) : 0}% detection rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConfidence}%</div>
            <Progress value={parseFloat(avgConfidence as string)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReview}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting human review</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <strong>{alert.alert_type.replace(/_/g, ' ').toUpperCase()}</strong>: {alert.details?.recommendation || 'Requires attention'}
                </div>
                <Badge variant={getSeverityColor(alert.severity)}>
                  {alert.severity}
                </Badge>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Model Performance */}
      {modelMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Active Model Performance
            </CardTitle>
            <CardDescription>
              {modelMetrics.model_type} v{modelMetrics.model_version}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Precision</p>
                <p className="text-2xl font-bold">{(parseFloat(modelMetrics.precision_score) * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recall</p>
                <p className="text-2xl font-bold">{(parseFloat(modelMetrics.recall_score) * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">F1 Score</p>
                <p className="text-2xl font-bold">{(parseFloat(modelMetrics.f1_score) * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="text-2xl font-bold">{(parseFloat(modelMetrics.accuracy) * 100).toFixed(1)}%</p>
              </div>
            </div>
            {modelMetrics.drift_detected && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Model drift detected (score: {modelMetrics.drift_score}). Consider retraining with recent data.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      <Tabs defaultValue="detections" className="w-full">
        <TabsList>
          <TabsTrigger value="detections">
            <Shield className="mr-2 h-4 w-4" />
            Detections
          </TabsTrigger>
          <TabsTrigger value="batches">
            <Activity className="mr-2 h-4 w-4" />
            Batch Jobs
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detections" className="space-y-4">
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Detections</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="false_positive">False Positives</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Work Order</TableHead>
                  <TableHead>Forgery Type</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detections.map((detection) => (
                  <TableRow key={detection.id}>
                    <TableCell className="font-mono text-xs">
                      {detection.attachments?.filename || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => navigate(`/work-orders?id=${detection.work_order_id}`)}
                      >
                        {detection.work_orders?.wo_number || 'N/A'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {detection.forgery_detected ? (
                        <Badge variant="destructive">
                          {detection.forgery_type?.replace(/_/g, ' ')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Clean</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{(parseFloat(detection.confidence_score) * 100).toFixed(1)}%</span>
                        <Progress 
                          value={parseFloat(detection.confidence_score) * 100} 
                          className="w-16" 
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {detection.model_type} {detection.model_version}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(detection.review_status)}>
                        {detection.review_status?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(detection.processed_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/fraud-investigation?detection=${detection.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Images</TableHead>
                  <TableHead>Detections</TableHead>
                  <TableHead>Avg Confidence</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.job_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{job.job_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {job.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-success inline mr-2" />}
                      {job.status === 'failed' && <XCircle className="h-4 w-4 text-destructive inline mr-2" />}
                      {job.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin inline mr-2" />}
                      {job.status}
                    </TableCell>
                    <TableCell>
                      {job.processed_images} / {job.total_images}
                    </TableCell>
                    <TableCell className="text-destructive font-semibold">
                      {job.detections_found}
                    </TableCell>
                    <TableCell>
                      {job.avg_confidence ? `${(job.avg_confidence * 100).toFixed(1)}%` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {job.processing_time_seconds ? `${job.processing_time_seconds}s` : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Forgery Type Distribution</CardTitle>
                <CardDescription>Types of forgeries detected</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const forgeryTypes = detections
                    .filter(d => d.forgery_detected)
                    .reduce((acc: any, d) => {
                      acc[d.forgery_type] = (acc[d.forgery_type] || 0) + 1;
                      return acc;
                    }, {});
                  
                  return Object.entries(forgeryTypes).map(([type, count]: [string, any]) => (
                    <div key={type} className="flex items-center justify-between py-2">
                      <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review Status Breakdown</CardTitle>
                <CardDescription>Detection review progress</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const statuses = detections.reduce((acc: any, d) => {
                    acc[d.review_status || 'unknown'] = (acc[d.review_status || 'unknown'] || 0) + 1;
                    return acc;
                  }, {});
                  
                  return Object.entries(statuses).map(([status, count]: [string, any]) => (
                    <div key={status} className="flex items-center justify-between py-2">
                      <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                      <Badge variant={getStatusColor(status)}>{count}</Badge>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}