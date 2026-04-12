import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, Zap, Calendar, Loader2, Play, Info } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { format } from 'date-fns';

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Prediction {
  id: string;
  prediction_type: string;
  risk_level: string;
  failure_probability: number;
  confidence_score?: number;
  predicted_failure_date?: string;
  recommended_action?: string;
  status: string;
  equipment?: {
    serial_number?: string;
    model?: string;
    manufacturer?: string;
  };
}

interface AtRiskAsset {
  assetId: string;
  serialNumber?: string;
  model?: string;
  healthScore: number;
  failureProbability: number;
  riskLevel: string;
  recommendedAction?: string;
}

function AtRiskSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['at-risk-assets'],
    queryFn: async () => {
      const res = await fetch('/api/assets/at-risk', { headers: authHeader() });
      if (!res.ok) throw new Error('Failed to load at-risk assets');
      return res.json();
    },
  });

  const assets: AtRiskAsset[] = data?.assets || [];

  if (isLoading) return <div className="text-sm text-muted-foreground py-2">Loading at-risk assets...</div>;
  if (assets.length === 0) return null;

  return (
    <Card className="p-6 border-destructive">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h2 className="text-lg font-semibold text-destructive">At-Risk Assets</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {assets.map(asset => (
          <div key={asset.assetId} className="p-3 border rounded-md space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">{asset.model || asset.serialNumber || asset.assetId}</span>
              <Badge variant="destructive">{asset.riskLevel}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">Health: {asset.healthScore}%</div>
            <div className="text-xs text-muted-foreground">Failure prob: {(asset.failureProbability * 100).toFixed(1)}%</div>
            {asset.recommendedAction && (
              <div className="text-xs text-orange-600">{asset.recommendedAction}</div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function PredictiveMaintenance() {
  const [running, setRunning] = useState(false);
  const [modelInfo, setModelInfo] = useState<{ ai_provider?: string; llm_provider?: string; model_info?: { trained?: boolean; data_points?: number } } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: predictionsData, isLoading } = useQuery({
    queryKey: ['maintenance-predictions'],
    queryFn: async () => {
      const res = await fetch('/api/functions/maintenance-predictions', { headers: authHeader() });
      if (!res.ok) throw new Error('Failed to load predictions');
      return res.json();
    },
  });

  const predictions: Prediction[] = (predictionsData?.predictions ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    equipment: p.equipment as Prediction['equipment'],
  }));

  const runPredictions = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/functions/predict-maintenance-failures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { count?: number; ai_provider?: string; llm_provider?: string; model_info?: { trained?: boolean; data_points?: number } };
      setModelInfo(data ? { ai_provider: data.ai_provider, llm_provider: data.llm_provider, model_info: data.model_info } : null);
      toast({
        title: 'Predictions generated',
        description: `Generated ${data?.count || 0} predictions for equipment`,
      });
      queryClient.invalidateQueries({ queryKey: ['maintenance-predictions'] });
    } catch (error: unknown) {
      toast({
        title: 'Prediction failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRunning(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      default: return 'bg-muted';
    }
  };

  const criticalCount = predictions?.filter(p => p.risk_level === 'high').length || 0;
  const mediumCount = predictions?.filter(p => p.risk_level === 'medium').length || 0;
  const lowCount = predictions?.filter(p => p.risk_level === 'low').length || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Predictive Maintenance
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered equipment failure prediction and preventive maintenance scheduling
          </p>
        </div>
        <Button onClick={runPredictions} disabled={running}>
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run Predictions
            </>
          )}
        </Button>
      </div>

      {modelInfo && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Predictions powered by {modelInfo.ai_provider === 'local_ml' ? 'local logistic regression ML model' : modelInfo.ai_provider || 'ML model'}
            {modelInfo.model_info?.data_points ? ` trained on ${modelInfo.model_info.data_points} lifecycle events` : ' (seed data for better accuracy)'}
            {modelInfo.llm_provider === 'mock' ? '. Connect OpenAI for AI-generated maintenance recommendations.' : '.'}
          </AlertDescription>
        </Alert>
      )}

      <AtRiskSection />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">High Risk</p>
              <p className="text-3xl font-bold text-destructive">{criticalCount}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Medium Risk</p>
              <p className="text-3xl font-bold text-warning">{mediumCount}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-warning" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Low Risk</p>
              <p className="text-3xl font-bold text-success">{lowCount}</p>
            </div>
            <Zap className="h-8 w-8 text-success" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Equipment Predictions</h2>

        {isLoading ? (
          <div className="text-center py-8">Loading predictions...</div>
        ) : predictions && predictions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Prediction Type</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Failure Probability</TableHead>
                <TableHead>Predicted Date</TableHead>
                <TableHead>Recommended Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {predictions.map((prediction: Prediction) => (
                <TableRow key={prediction.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{prediction.equipment?.manufacturer} {prediction.equipment?.model}</div>
                      <div className="text-sm text-muted-foreground">
                        {prediction.equipment?.serial_number}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{prediction.prediction_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiskColor(prediction.risk_level)}>
                      {prediction.risk_level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold">
                        {(prediction.failure_probability * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ({((prediction.confidence_score ?? 0) * 100).toFixed(0)}% confidence)
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {prediction.predicted_failure_date ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(prediction.predicted_failure_date), 'MMM d, yyyy')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-xs">
                      {prediction.recommended_action}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={prediction.status === 'pending' ? 'secondary' : 'outline'}>
                      {prediction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast({ title: "Maintenance Scheduled", description: `Scheduled preventive maintenance for ${prediction.equipment?.name || 'equipment'}` })}
                    >
                      Schedule Maintenance
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No predictions available. Equipment monitoring data will appear here.</p>
          </div>
        )}
      </Card>
    </div>
  );
}