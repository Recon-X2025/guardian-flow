import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load pending work orders
      const { data: wos, error: woError } = await supabase
        .from('work_orders')
        .select(`
          *,
          ticket:tickets(*),
          technician:profiles(full_name),
          work_order_prechecks(*)
        `)
        .in('status', ['pending_validation', 'ready_to_release'])
        .order('created_at', { ascending: false });

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
      toast({
        title: enabled ? "Agent Enabled" : "Agent Disabled",
        description: enabled 
          ? "Ops Agent will auto-release eligible work orders"
          : "Manual release required for work orders",
      });
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
                <Sparkles className="h-5 w-5 text-primary" />
                <Label htmlFor="agent-toggle">Agent Auto-Release</Label>
              </div>
              <Switch
                id="agent-toggle"
                checked={agentEnabled}
                onCheckedChange={toggleAgent}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {agentEnabled 
                ? "AI agent will automatically release eligible work orders"
                : "Manual approval required for all releases"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {workOrders.map((wo) => {
          const precheck = wo.work_order_prechecks?.[0];
          const canRelease = precheck?.can_release;
          
          return (
            <Card key={wo.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>{wo.wo_number || 'Draft'}</CardTitle>
                    <Badge variant={wo.status === 'ready_to_release' ? 'default' : 'secondary'}>
                      {wo.status?.replace('_', ' ')}
                    </Badge>
                    {canRelease && (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!precheck && (
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
                    <Button
                      size="sm"
                      disabled={!canRelease}
                      onClick={() => releaseToField(wo.id)}
                    >
                      Release to Field
                    </Button>
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
                  <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
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
                    <div className="flex items-center gap-2">
                      {precheck.photo_status === 'passed' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                      )}
                      <span>Photos: {precheck.photo_status}</span>
                    </div>
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
