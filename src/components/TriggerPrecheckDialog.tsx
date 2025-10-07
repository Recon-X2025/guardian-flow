import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TriggerPrecheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  onSuccess: () => void;
}

export function TriggerPrecheckDialog({ open, onOpenChange, workOrderId, onSuccess }: TriggerPrecheckDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runPrecheck = async () => {
    setLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('precheck-orchestrator', {
        body: { workOrderId }
      });

      if (error) throw error;

      setResults(data);

      if (data.can_release) {
        // Update work order status
        await supabase
          .from('work_orders')
          .update({ 
            status: 'pending_validation',
            released_at: new Date().toISOString()
          })
          .eq('id', workOrderId);

        toast({
          title: 'Precheck Passed',
          description: 'Work order cleared for release to technician',
        });
      } else {
        toast({
          title: 'Precheck Failed',
          description: 'See details below. Override may be required.',
          variant: 'destructive',
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Precheck failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (passed: boolean | null) => {
    if (passed === null) return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    if (passed) return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Passed</Badge>;
    return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Run Precheck Orchestration</DialogTitle>
        </DialogHeader>

        {!results && !loading && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will run all required checks before releasing the work order:
            </p>
            <ul className="space-y-2 text-sm">
              <li>✓ Inventory cascade (hub → OEM → partner → buffer)</li>
              <li>✓ Warranty coverage verification</li>
              <li>✓ Customer cost calculation</li>
            </ul>
            <Button onClick={runPrecheck} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run Precheck
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Running precheck orchestration...</p>
          </div>
        )}

        {results && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="font-medium">Inventory Check</span>
              {getStatusBadge(results.inventory?.all_available)}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="font-medium">Warranty Check</span>
              {getStatusBadge(results.warranty?.covered)}
            </div>

            <div className={`p-4 border-2 rounded-lg ${results.can_release ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold">Can Release</span>
                {results.can_release ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
              {!results.can_release && (
                <p className="text-sm text-muted-foreground mt-2">
                  Override request required from manager with MFA
                </p>
              )}
            </div>

            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
