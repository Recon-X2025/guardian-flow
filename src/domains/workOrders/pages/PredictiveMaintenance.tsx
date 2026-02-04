import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, TrendingUp, Zap, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function PredictiveMaintenance() {
  const { data: predictions, isLoading } = useQuery({
    queryKey: ['maintenance-predictions'],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from('maintenance_predictions')
        .select('*, equipment(name, equipment_number, serial_number)')
        .order('failure_probability', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    }
  });

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
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="h-8 w-8" />
          Predictive Maintenance
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-powered equipment failure prediction and preventive maintenance scheduling
        </p>
      </div>

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
              {predictions.map((prediction: any) => (
                <TableRow key={prediction.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{prediction.equipment?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {prediction.equipment?.equipment_number}
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
                        ({(prediction.confidence_score * 100).toFixed(0)}% confidence)
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
                    <Button variant="outline" size="sm">
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