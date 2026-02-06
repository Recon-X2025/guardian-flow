import { useState, useEffect } from "react";
import { apiClient } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/domains/shared/hooks/use-toast";
import { Loader2, FileText, Download, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DOMPurify from 'dompurify';
import { useActionPermissions } from "@/domains/auth/hooks/useActionPermissions";

interface ServiceOrder {
  id: string;
  so_number: string;
  signed_at?: string;
  created_at: string;
  html_content?: string;
  work_orders?: {
    wo_number: string;
    cost_to_customer?: number;
  };
}

interface WorkOrderBasic {
  id: string;
  wo_number: string;
  status: string;
}

export default function ServiceOrders() {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderBasic[]>([]);
  const [selectedWO, setSelectedWO] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedSO, setSelectedSO] = useState<ServiceOrder | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { toast } = useToast();
  const soPerms = useActionPermissions('serviceOrders');
  const isViewOnly = !soPerms.create && !soPerms.edit && !soPerms.execute;

  const fetchServiceOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await apiClient
        .from('service_orders')
        .select('*, work_orders(wo_number, cost_to_customer)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServiceOrders((data || []) as ServiceOrder[]);
    } catch (error: unknown) {
      toast({
        title: "Error loading service orders",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceOrders();
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const { data, error } = await apiClient
        .from('work_orders')
        .select('id, wo_number, status')
        .in('status', ['in_progress', 'pending_validation'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkOrders((data || []) as WorkOrderBasic[]);
    } catch (error: unknown) {
      toast({
        title: "Error loading work orders",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const generateSO = async (workOrderId: string) => {
    setGenerating(true);
    try {
      const result = await apiClient.functions.invoke('generate-service-order', {
        body: { workOrderId }
      });

      if (result.error) throw result.error;

      toast({
        title: "Service Order Generated",
        description: `Service order created successfully`,
      });

      fetchServiceOrders();
      setSelectedWO('');
    } catch (error: unknown) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const previewSO = (so: ServiceOrder) => {
    setSelectedSO(so);
    setPreviewOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isViewOnly && (
        <Alert>
          <AlertDescription>
            <strong>View-Only Mode:</strong> You have read-only access to Service Orders. Contact an admin for edit permissions.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Service Orders</h1>
          <p className="text-muted-foreground">
            Auto-generated service documentation with signatures and evidence
          </p>
        </div>
        {soPerms.execute && (
          <div className="flex gap-2">
            <select
              className="px-3 py-2 border rounded-md"
              value={selectedWO}
              onChange={(e) => setSelectedWO(e.target.value)}
              disabled={generating}
            >
              <option value="">Select Work Order...</option>
              {workOrders.map(wo => (
                <option key={wo.id} value={wo.id}>
                  {wo.wo_number} ({wo.status})
                </option>
              ))}
            </select>
            <Button 
              onClick={() => {
                if (!selectedWO) {
                  toast({ title: "Select a work order first", variant: "destructive" });
                  return;
                }
                generateSO(selectedWO);
              }}
              disabled={generating || !selectedWO}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate SO
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SOs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serviceOrders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {serviceOrders.filter(so => so.signed_at).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {serviceOrders.filter(so => 
                new Date(so.created_at).getMonth() === new Date().getMonth()
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Orders</CardTitle>
          <CardDescription>Generated from work order completion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {serviceOrders.map((so) => (
              <div
                key={so.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{so.so_number}</h3>
                    {so.signed_at && (
                      <Badge className="bg-green-100 text-green-800">Signed</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>WO: {so.work_orders?.wo_number || 'N/A'}</span>
                    <span>Cost: ${so.work_orders?.cost_to_customer || 0}</span>
                    <span>Created: {new Date(so.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => previewSO(so)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  {soPerms.view && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast({ title: "PDF Export", description: `Generating PDF for ${so.so_number}...` })}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {serviceOrders.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No service orders yet. Generate one from a completed work order.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Service Order: {selectedSO?.so_number}</DialogTitle>
          </DialogHeader>
          {selectedSO && (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(selectedSO.html_content || '<p>No content</p>', {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'img'],
                  ALLOWED_ATTR: ['class', 'style', 'src', 'alt', 'width', 'height']
                })
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Template Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            • Default template includes: warranty status, parts breakdown, signatures, QR code for photos
          </p>
          <p className="text-muted-foreground">
            • OEMs can upload custom templates (Handlebars/Mustache syntax)
          </p>
          <p className="text-muted-foreground">
            • All SOs include audit trail and are immutable once signed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}