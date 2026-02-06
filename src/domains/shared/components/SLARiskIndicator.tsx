import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiClient } from '@/integrations/api/client';
import { AlertTriangle, Clock } from 'lucide-react';

interface SLARiskIndicatorProps {
  workOrderId: string;
}

interface SLAPrediction {
  breach_probability: number;
  contributing_factors?: {
    hours_elapsed?: number;
    time_remaining?: number;
    current_status?: string;
  };
}

export function SLARiskIndicator({ workOrderId }: SLARiskIndicatorProps) {
  const [prediction, setPrediction] = useState<SLAPrediction | null>(null);

  useEffect(() => {
    fetchPrediction();
    // Set up real-time subscription using apiClient
    const channel = apiClient.channel(`sla_prediction_${workOrderId}`)
      .on('db_changes', {
        event: '*',
        schema: 'public',
        table: 'sla_predictions',
        filter: `work_order_id=eq.${workOrderId}`,
      }, (payload: { new: SLAPrediction }) => {
        setPrediction(payload.new);
      })
      .subscribe();

    return () => {
      apiClient.removeChannel(channel);
    };
  }, [workOrderId]);

  const fetchPrediction = async () => {
    const result = await apiClient.from('sla_predictions')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (result.data) setPrediction(result.data);
  };

  if (!prediction) return null;

  const { breach_probability, contributing_factors } = prediction;
  const risk = breach_probability > 90 ? 'critical' : breach_probability > 70 ? 'high' : breach_probability > 50 ? 'medium' : 'low';

  const variant = risk === 'critical' ? 'destructive' : risk === 'high' ? 'destructive' : risk === 'medium' ? 'default' : 'secondary';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant} className="gap-1">
            {risk === 'critical' || risk === 'high' ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            {breach_probability.toFixed(0)}% Risk
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">SLA Breach Prediction</p>
            <p className="text-sm">
              Hours Elapsed: {contributing_factors?.hours_elapsed || 0}
            </p>
            <p className="text-sm">
              Time Remaining: {contributing_factors?.time_remaining || 0}h
            </p>
            <p className="text-sm">
              Status: {contributing_factors?.current_status}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
