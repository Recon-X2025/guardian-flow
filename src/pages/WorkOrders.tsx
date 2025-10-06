import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, CheckCircle2, Clock, AlertCircle, Shield, Package, FileText, Sparkles, BookOpen, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GenerateServiceOrderDialog } from '@/components/GenerateServiceOrderDialog';
import { GenerateSaPOSDialog } from '@/components/GenerateSaPOSDialog';
import { KBArticleSuggestions } from '@/components/KBArticleSuggestions';
import { EditWorkOrderDialog } from '@/components/EditWorkOrderDialog';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function WorkOrders() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWO, setSelectedWO] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedWOData, setSelectedWOData] = useState<any>(null);
  const [generateSOOpen, setGenerateSOOpen] = useState(false);
  const [saposDialogOpen, setSaposDialogOpen] = useState(false);
  const [kbDialogOpen, setKbDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      // First get the total count
      const { count } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true });

      console.log('Total work orders in DB:', count);

      // Then fetch the data with increased limit
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          ticket:tickets(*, customer_id),
          technician:profiles(full_name),
          sapos_offers(id, title, price, status, offer_type)
        `)
        .order('created_at', { ascending: false})
        .limit(100);

      if (error) throw error;
      console.log('Fetched work orders:', data?.length, 'Total in DB:', count);
      setWorkOrders(data || []);

      // Auto-generate SaPOS offers for released/in_progress WOs lacking offers (max 3 per load)
      try {
        const targets = (data || [])
          .filter((wo: any) => (wo.status === 'released' || wo.status === 'in_progress') && (!wo.sapos_offers || wo.sapos_offers.length === 0))
          .slice(0, 3);
        targets.forEach(async (wo: any) => {
          const customerId = wo.ticket?.customer_id;
          try {
            console.log('Auto-generating SaPOS for WO:', wo.id);
            await supabase.functions.invoke('generate-sapos-offers', {
              body: { workOrderId: wo.id, customerId }
            });
            // Refresh this WO row to show offers soon after
            fetchWorkOrders();
          } catch (e) {
            console.error('Auto SaPOS generation failed for WO', wo.id, e);
          }
        });
      } catch (e) {
        console.error('Auto SaPOS batch error', e);
      }
    } catch (error: any) {
      toast({
        title: "Error loading work orders",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'in_progress': return Clock;
      case 'pending_validation': return AlertCircle;
      default: return Shield;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending_validation': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPartStatusLabel = (partStatus: string) => {
    const labels: Record<string, string> = {
      'not_required': 'No Parts',
      'reserved': 'Parts Reserved',
      'issued': 'Parts Issued',
      'received': 'Parts Received',
      'consumed': 'Parts Consumed',
      'unutilized': 'Parts Unutilized',
      'buffer_consumption': 'From Buffer Stock',
      'buffer_consumed_replacement_requested': 'Buffer Used - Replacement Requested',
    };
    return labels[partStatus] || partStatus;
  };

  const getPartStatusColor = (partStatus: string) => {
    switch (partStatus) {
      case 'consumed':
      case 'buffer_consumed_replacement_requested':
        return 'bg-green-100 text-green-800';
      case 'issued':
      case 'received':
        return 'bg-blue-100 text-blue-800';
      case 'reserved':
      case 'buffer_consumption':
        return 'bg-yellow-100 text-yellow-800';
      case 'unutilized':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalWO = workOrders.length;
  const pendingValidation = workOrders.filter(wo => wo.status === 'pending_validation').length;
  const inProgress = workOrders.filter(wo => wo.status === 'in_progress').length;
  const completed = workOrders.filter(wo => wo.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Work Orders</h1>
          <p className="text-muted-foreground">
            Manage field service work orders with precheck gating
          </p>
        </div>
        <Button onClick={() => navigate('/tickets')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Work Order
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWO}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Validation</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingValidation}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Work Orders</CardTitle>
          <CardDescription>Work orders with precheck gating enabled</CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search work orders..."
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workOrders.map((wo) => {
              const StatusIcon = getStatusIcon(wo.status);
              const isCompleted = wo.status === 'completed';
              return (
                <div
                  key={wo.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{wo.wo_number || 'Draft'}</h3>
                      <Badge className={getStatusColor(wo.status)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {wo.status?.replace('_', ' ')}
                      </Badge>
                      {wo.warranty_checked && (
                        <Badge variant="outline" className="text-xs">
                          Warranty OK
                        </Badge>
                      )}
                      {wo.part_status && wo.part_status !== 'not_required' && (
                        <Badge className={getPartStatusColor(wo.part_status)} variant="outline">
                          <Package className="h-3 w-3 mr-1" />
                          {getPartStatusLabel(wo.part_status)}
                        </Badge>
                      )}
                      {wo.repair_type && (
                        <Badge variant={wo.repair_type === 'in_warranty' ? 'default' : 'secondary'} className="text-xs">
                          {wo.repair_type === 'in_warranty' ? 'Cost-Free' : 'At-Cost'}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Ticket:</span> {wo.ticket?.symptom || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Technician:</span> {wo.technician?.full_name || 'Unassigned'}
                      </div>
                      <div>
                        <span className="font-medium">Cost:</span> {formatCurrency(Number(wo.cost_to_customer || 0))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(wo.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {wo.part_notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Part Notes:</p>
                        <p className="text-sm">{wo.part_notes}</p>
                      </div>
                    )}

                    {wo.sapos_offers && wo.sapos_offers.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Auto-Generated Offers:</span>
                        </div>
                        <div className="space-y-1">
                          {wo.sapos_offers.slice(0, 3).map((offer: any) => (
                            <div key={offer.id} className="text-xs flex items-center justify-between py-1 px-2 bg-muted/30 rounded">
                              <span className="truncate flex-1">{offer.title}</span>
                              <span className="font-medium ml-2">{formatCurrency(Number(offer.price))}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {offer.offer_type}
                              </Badge>
                            </div>
                          ))}
                          {wo.sapos_offers.length > 3 && (
                            <p className="text-xs text-muted-foreground pl-2">
                              +{wo.sapos_offers.length - 3} more offers
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedWOData(wo);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedWO(wo.id);
                        setSelectedWOData(wo);
                        setKbDialogOpen(true);
                      }}
                    >
                      <BookOpen className="h-4 w-4 mr-1" />
                      KB Guides
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={isCompleted}
                      title={isCompleted ? 'Disabled for completed work orders' : undefined}
                      onClick={() => {
                        console.log('SaPOS button clicked for WO:', wo.id, 'Status:', wo.status);
                        if (wo.status === 'draft' || wo.status === 'pending_validation') {
                          toast({
                            title: 'Work order not ready',
                            description: 'Please release the work order first before generating SaPOS offers',
                            variant: 'destructive',
                          });
                          return;
                        }
                        const customerId = wo.ticket?.customer_id;
                        console.log('Customer ID:', customerId);
                        setSelectedWO(wo.id);
                        setSelectedCustomerId(customerId || null);
                        setSaposDialogOpen(true);
                      }}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      SaPOS
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={isCompleted}
                      title={isCompleted ? 'Disabled for completed work orders' : undefined}
                      onClick={() => {
                        console.log('Generate SO button clicked for WO:', wo.id, 'Status:', wo.status);
                        if (wo.status === 'draft' || wo.status === 'pending_validation') {
                          toast({
                            title: 'Work order not ready',
                            description: 'Please release the work order first before generating Service Order',
                            variant: 'destructive',
                          });
                          return;
                        }
                        setSelectedWO(wo.id);
                        setGenerateSOOpen(true);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Generate SO
                    </Button>
                  </div>
                </div>
              );
            })}

            {workOrders.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-8">
                No work orders found
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedWO && (
        <>
          <GenerateSaPOSDialog
            open={saposDialogOpen}
            onOpenChange={setSaposDialogOpen}
            workOrderId={selectedWO}
            customerId={selectedCustomerId || undefined}
          />
          <GenerateServiceOrderDialog
            open={generateSOOpen}
            onOpenChange={setGenerateSOOpen}
            workOrderId={selectedWO}
            onSuccess={fetchWorkOrders}
          />
          <Dialog open={kbDialogOpen} onOpenChange={setKbDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Knowledge Base Articles</DialogTitle>
                <DialogDescription>
                  Recommended technical guides for this issue
                </DialogDescription>
              </DialogHeader>
              {selectedWOData?.ticket?.symptom && (
                <KBArticleSuggestions symptom={selectedWOData.ticket.symptom} />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}

      {selectedWOData && (
        <EditWorkOrderDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          workOrder={selectedWOData}
          onSuccess={fetchWorkOrders}
        />
      )}
    </div>
  );
}