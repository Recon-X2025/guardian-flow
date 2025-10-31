import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Clock, AlertCircle, Sparkles, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TriggerPrecheckDialog } from '@/components/TriggerPrecheckDialog';

export default function PendingValidation() {
  const { toast } = useToast();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentEnabled, setAgentEnabled] = useState(false);
  const [selectedWO, setSelectedWO] = useState<string | null>(null);
  const [precheckOpen, setPrecheckOpen] = useState(false);

  useEffect(() => {
    loadData();

    // Real-time subscription for work order updates
    const channel = supabase
      .channel('pending-validation-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_orders',
        },
        (payload) => {
          console.log('Work order update detected:', payload);
          loadData(); // Reload data when changes occur
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_order_prechecks'
        },
        (payload) => {
          console.log('Precheck update detected:', payload);
          loadData(); // Reload when prechecks update
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load pending work orders (including recently released ones for visibility)
      const { data: wos, error: woError } = await supabase
        .from('work_orders')
        .select(`
          *,
          ticket:tickets(*),
          technician:profiles(full_name),
          work_order_prechecks(*)
        `)
        .in('status', ['pending_validation', 'draft', 'assigned'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (woError) throw woError;
      setWorkOrders(wos || []);

      // Load agent toggle
      const { data: toggle } = await supabase
        .from('feature_toggles')
        .select('enabled')
        .eq('feature_key', 'agent_ops_autonomous')
        .single();
      
      setAgentEnabled(toggle?.enabled || false);
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

  const toggleAgent = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('feature_toggles')
        .update({ enabled })
        .eq('feature_key', 'agent_ops_autonomous');

      if (error) throw error;
      
      setAgentEnabled(enabled);
      
      const message = enabled 
        ? "🤖 Ops Agent is now active. It will automatically run prechecks and release eligible work orders every 5 minutes."
        : "Agent disabled. Work orders will require manual precheck and release.";
      
      toast({
        title: enabled ? "🤖 Agent Activated" : "Agent Disabled",
        description: message,
        duration: 5000,
      });

      // If enabling, trigger immediate agent run
      if (enabled) {
        console.log("Triggering immediate agent run...");
        await supabase.functions.invoke("ops-agent-processor");
        toast({
          title: "Agent Processing",
          description: "Running initial precheck and release cycle...",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const releaseToField = async (woId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('release-work-order', {
        body: { workOrderId: woId }
      });

      if (error) throw error;

      toast({
        title: "Released to Field",
        description: "Work order has been released successfully",
      });
      
      loadData();
    } catch (error: any) {
      toast({
        title: "Release Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pending Validation</h1>
          <p className="text-muted-foreground">Work orders awaiting release to field</p>
        </div>
        
        <Card className="w-80">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {agentEnabled && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                )}
                <Sparkles className="h-5 w-5 text-primary" />
                <Label htmlFor="agent-toggle">
                  {agentEnabled ? "🤖 Agent Active" : "Agent Inactive"}
                </Label>
              </div>
              <Switch
                id="agent-toggle"
                checked={agentEnabled}
                onCheckedChange={toggleAgent}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {agentEnabled 
                ? "Automatically running prechecks & releasing eligible WOs every 5min"
                : "Manual approval required for all releases"}
            </p>
          </CardContent>
        </Card>
      </div>

      {agentEnabled && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                <strong className="font-semibold">Agent is actively monitoring:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Automatically running prechecks for pending work orders</li>
                  <li>Auto-releasing work orders that pass all checks</li>
                  <li>Logging all actions for full audit trail</li>
                  <li>Updates appear here in real-time</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {workOrders.map((wo) => {
          const precheck = wo.work_order_prechecks?.[0];
          const canRelease = precheck?.can_release;
          const isReleased = wo.status === 'assigned';
          
          return (
            <Card key={wo.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>{wo.wo_number || 'Draft'}</CardTitle>
                    <Badge variant={wo.status === 'pending_validation' ? 'default' : wo.status === 'assigned' ? 'outline' : 'secondary'}>
                      {wo.status?.replace('_', ' ')}
                    </Badge>
                    {canRelease && !isReleased && (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    )}
                    {isReleased && agentEnabled && (
                      <Badge variant="outline" className="text-purple-600">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Auto-Released
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!precheck && !isReleased && (
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedWO(wo.id);
                          setPrecheckOpen(true);
                        }}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Run Precheck
                      </Button>
                    )}
                    {!isReleased && (
                      <Button
                        size="sm"
                        disabled={!canRelease}
                        onClick={() => releaseToField(wo.id)}
                      >
                        Release to Field
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Symptom:</span>
                    <p className="font-medium">{wo.ticket?.symptom || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Technician:</span>
                    <p className="font-medium">{wo.technician?.full_name || 'Unassigned'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <p className="font-medium">{new Date(wo.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {precheck && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      {precheck.inventory_status === 'passed' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                      )}
                      <span>Inventory: {precheck.inventory_status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {precheck.warranty_status === 'passed' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                      )}
                      <span>Warranty: {precheck.warranty_status}</span>
                    </div>
                  </div>
                )}
                
                {isReleased && wo.released_at && (
                  <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                    Released: {new Date(wo.released_at).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {workOrders.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No work orders pending validation</p>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedWO && (
        <TriggerPrecheckDialog
          open={precheckOpen}
          onOpenChange={setPrecheckOpen}
          workOrderId={selectedWO}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
