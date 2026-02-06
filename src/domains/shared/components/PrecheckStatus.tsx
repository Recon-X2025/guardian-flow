import { useState, useEffect } from "react";
import { apiClient } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/domains/shared/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, Shield } from "lucide-react";
import { MFADialog } from "@/domains/auth/components/MFADialog";

interface PrecheckStatusProps {
  workOrderId: string;
}

export function PrecheckStatus({ workOrderId }: PrecheckStatusProps) {
  const [precheck, setPrecheck] = useState<{ inventory_status?: string; warranty_status?: string; photo_status?: string; can_release?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const { toast } = useToast();

  const fetchPrecheck = async () => {
    try {
      const { data, error } = await apiClient
        .from('work_order_prechecks')
        .select('*')
        .eq('work_order_id', workOrderId)
        .limit(1)
        .then();

      if (error) throw error;
      setPrecheck(data?.[0] || null);
    } catch (error: unknown) {
      console.error('Precheck fetch error:', error);
    }
  };

  useEffect(() => {
    fetchPrecheck();
  }, [workOrderId]);

  const runPrecheck = async () => {
    setRunning(true);
    try {
      const result = await apiClient.functions.invoke('precheck-orchestrator', {
        body: { workOrderId }
      });

      if (result.error) throw result.error;

      const data = result.data;
      toast({
        title: data?.can_release ? "Precheck Passed" : "Precheck Failed",
        description: data?.can_release 
          ? "Work order is ready for release"
          : "Some checks failed - review results",
        variant: data?.can_release ? "default" : "destructive",
      });

      fetchPrecheck();
    } catch (error: unknown) {
      toast({
        title: "Precheck Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const handleMFAVerified = async (tokenId: string) => {
    try {
      const { error } = await apiClient
        .from('work_order_prechecks')
        .update({
          inventory_status: 'overridden',
          warranty_status: 'overridden',
          photo_status: 'overridden',
          override_reason: overrideReason,
          override_mfa_token: tokenId
        })
        .eq('work_order_id', workOrderId)
        .then();

      if (error) throw error;

      toast({ title: "Override Applied", description: "Work order can now be released" });
      fetchPrecheck();
    } catch (error: unknown) {
      toast({
        title: "Override Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'failed': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'overridden': return <Shield className="h-5 w-5 text-orange-600" />;
      default: return <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'overridden': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const checksCompleted = precheck 
    ? ['inventory_status', 'warranty_status', 'photo_status'].filter(
        k => precheck[k] !== 'pending'
      ).length
    : 0;

  const progress = (checksCompleted / 3) * 100;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Work Order Precheck Status</CardTitle>
              <CardDescription>
                All checks must pass before release (or manager override)
              </CardDescription>
            </div>
            <Button onClick={runPrecheck} disabled={running}>
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                'Run Precheck'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{checksCompleted}/3 checks</span>
            </div>
            <Progress value={progress} />
          </div>

          {precheck && (
            <>
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(precheck.inventory_status)}
                    <div>
                      <p className="font-medium">Inventory Cascade</p>
                      <p className="text-xs text-muted-foreground">
                        Parts availability check across hubs
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(precheck.inventory_status)}>
                    {precheck.inventory_status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(precheck.warranty_status)}
                    <div>
                      <p className="font-medium">Warranty Check</p>
                      <p className="text-xs text-muted-foreground">
                        Coverage and pricing validation
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(precheck.warranty_status)}>
                    {precheck.warranty_status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(precheck.photo_status)}
                    <div>
                      <p className="font-medium">Photo Validation</p>
                      <p className="text-xs text-muted-foreground">
                        3 stages × 4 photos minimum
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(precheck.photo_status)}>
                    {precheck.photo_status}
                  </Badge>
                </div>
              </div>

              {precheck.can_release ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Work Order Ready for Release</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">Cannot Release - Checks Failed</span>
                  </div>

                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">Manager Override Available</span>
                    </div>
                    <p className="text-xs text-orange-700 mb-3">
                      Requires manager role + MFA authentication. All overrides are audited.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMfaOpen(true)}
                      className="border-orange-300"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Request Override (MFA Required)
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {!precheck && (
            <p className="text-center text-muted-foreground py-4">
              No precheck data. Run precheck to validate work order.
            </p>
          )}
        </CardContent>
      </Card>

      <MFADialog
        open={mfaOpen}
        onOpenChange={setMfaOpen}
        actionType="override_precheck"
        onVerified={handleMFAVerified}
      />
    </>
  );
}