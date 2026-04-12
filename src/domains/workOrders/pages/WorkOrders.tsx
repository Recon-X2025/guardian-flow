import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, CheckCircle2, Clock, AlertCircle, Shield, Package, FileText, Sparkles, BookOpen, Edit, Mail, CalendarRange } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { useRBAC } from '@/domains/auth/contexts/RBACContext';
import { useActionPermissions } from '@/domains/auth/hooks/useActionPermissions';
import { GenerateServiceOrderDialog } from '@/domains/workOrders/components/GenerateServiceOrderDialog';
import { GenerateOfferDialog } from '@/domains/financial/components/GenerateOfferDialog';
import { KBArticleSuggestions } from '@/domains/knowledge/components/KBArticleSuggestions';
import { EditWorkOrderDialog } from '@/domains/workOrders/components/EditWorkOrderDialog';
import { CreateDemoDataButton } from '@/domains/shared/components/CreateDemoDataButton';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/domains/shared/hooks/useCurrency';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function WorkOrders() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { tenantId, hasRole, loading: rbacLoading } = useRBAC();
  const isSysAdmin = hasRole('sys_admin');
  
  // RBAC permissions for actions
  const woPerms = useActionPermissions('workOrders');
  const soPerms = useActionPermissions('serviceOrders');
  
// Type definitions
interface Ticket {
  id: string;
  symptom?: string;
  customer_id?: string;
}

interface SaposOffer {
  id: string;
  title: string;
  price: number | string;
  status: string;
  offer_type: string;
}

interface WorkOrder {
  id: string;
  wo_number?: string;
  status: string;
  warranty_checked?: boolean;
  part_status?: string;
  repair_type?: string;
  cost_to_customer?: number | string;
  part_notes?: string;
  created_at: string;
  ticket_id?: string;
  technician_id?: string;
  tenant_id?: string;
  multi_day?: boolean;
  ticket?: Ticket | null;
  technician?: { full_name: string } | null;
  sapos_offers?: SaposOffer[];
}

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWO, setSelectedWO] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedWOData, setSelectedWOData] = useState<WorkOrder | null>(null);
  const [generateSOOpen, setGenerateSOOpen] = useState(false);
  const [saposDialogOpen, setSaposDialogOpen] = useState(false);
  const [kbDialogOpen, setKbDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Email Import state
  const [emailImportOpen, setEmailImportOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '', senderEmail: '' });
  const [emailParsing, setEmailParsing] = useState(false);
  const [emailExtracted, setEmailExtracted] = useState<{
    title: string; description: string; priority: string;
    customerRef: string | null; siteAddress: string | null;
    requiredSkills: string[];
  } | null>(null);
  const [emailConfidence, setEmailConfidence] = useState<number | null>(null);
  const [emailWoId, setEmailWoId] = useState<string | null>(null);
  
  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const pageSize = 20;

  useEffect(() => {
    if (!rbacLoading) {
      fetchWorkOrders();
    }
  }, [currentPage, statusFilter, tenantId, isSysAdmin, rbacLoading]);

  const fetchWorkOrders = async () => {
    if (rbacLoading || (!isSysAdmin && !tenantId)) {
      console.log('Waiting for RBAC context...');
      return;
    }

    try {
      setLoading(true);
      
      // Build query with status filter and tenant isolation - only sys_admin sees ALL data
      let countQuery = apiClient.from('work_orders').select('*');
      let dataQuery = apiClient.from('work_orders').select('*').order('created_at', { ascending: false });

      // Apply tenant filter for everyone except sys_admin
      if (!isSysAdmin && tenantId) {
        countQuery = countQuery.eq('tenant_id', tenantId);
        dataQuery = dataQuery.eq('tenant_id', tenantId);
      }

      // Apply status filter if selected
      if (statusFilter) {
        countQuery = countQuery.eq('status', statusFilter);
        dataQuery = dataQuery.eq('status', statusFilter);
      }

      // Get total count
      const countResult = await countQuery;
      const count = countResult.data?.length || 0;
      if (countResult.error) throw countResult.error;
      
      setTotalCount(count);
      console.log('Total work orders:', count, 'Filter:', statusFilter || 'none');

      // Fetch paginated data
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize;
      
      const result = await dataQuery.range(from, to);

      if (result.error) throw result.error;
      const data = (result.data || []) as WorkOrder[];

      // Fetch related data separately (apiClient doesn't support joins)
      const enrichedData: WorkOrder[] = await Promise.all(data.map(async (wo) => {
        // Fetch ticket
        const ticketResult = await apiClient.from('tickets')
          .select('*, customer_id')
          .eq('id', wo.ticket_id)
          .single()
          .catch(() => ({ data: null }));

        // Fetch technician
        const techResult = await apiClient.from('profiles')
          .select('full_name')
          .eq('id', wo.technician_id)
          .single()
          .catch(() => ({ data: null }));

        // Fetch offers
        const offersResult = await apiClient.from('sapos_offers')
          .select('id, title, price, status, offer_type')
          .eq('work_order_id', wo.id)
          .catch(() => ({ data: [] }));

        const ticketData = ticketResult.data as Ticket | null;
        const techData = techResult.data as { full_name?: string } | null;

        return {
          ...wo,
          ticket: ticketData,
          technician: techData?.full_name ? { full_name: techData.full_name } : null,
          sapos_offers: (offersResult.data || []) as SaposOffer[]
        };
      }));

      console.log(`Page ${currentPage}: Fetched ${enrichedData.length} of ${count} total`);
      setWorkOrders(enrichedData);

      // Auto-generate Offer AI offers for released/in_progress WOs lacking offers (max 3 per load)
      try {
        const targets = enrichedData
          .filter((wo) => (wo.status === 'released' || wo.status === 'in_progress') && (!wo.sapos_offers || wo.sapos_offers.length === 0))
          .slice(0, 3);
        targets.forEach(async (wo) => {
          const customerId = wo.ticket?.customer_id;
          try {
            console.log('Auto-generating Offer AI for WO:', wo.id);
            await apiClient.functions.invoke('generate-offers', {
              body: { workOrderId: wo.id, customerId }
            });
            // Refresh this WO row to show offers soon after
            fetchWorkOrders();
          } catch (e) {
            console.error('Auto Offer AI generation failed for WO', wo.id, e);
          }
        });
      } catch (e) {
        console.error('Auto Offer AI batch error', e);
      }
    } catch (error: unknown) {
      toast({
        title: "Error loading work orders",
        description: error instanceof Error ? error.message : 'Unknown error',
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

  // Calculate stats from current page
  const pendingValidation = workOrders.filter(wo => wo.status === 'pending_validation').length;
  const inProgress = workOrders.filter(wo => wo.status === 'in_progress').length;
  const completed = workOrders.filter(wo => wo.status === 'completed').length;
  
  const totalPages = Math.ceil(totalCount / pageSize);
  
  const handleStatusFilter = (status: string | null) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleEmailParseAndImport = async () => {
    setEmailParsing(true);
    setEmailExtracted(null);
    setEmailWoId(null);
    try {
      const res = await fetch('/api/work-orders/from-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setEmailExtracted(data.extracted);
      setEmailConfidence(data.confidence);
      setEmailWoId(data.workOrderId);
    } catch (err) {
      toast({ title: 'Parse error', description: String(err), variant: 'destructive' });
    } finally {
      setEmailParsing(false);
    }
  };

  const handleEmailConfirm = () => {
    toast({ title: 'Work order created', description: `WO imported from email${emailWoId ? ` (${emailWoId.slice(0, 8)})` : ''}.` });
    setEmailImportOpen(false);
    setEmailForm({ subject: '', body: '', senderEmail: '' });
    setEmailExtracted(null);
    setEmailConfidence(null);
    setEmailWoId(null);
    fetchWorkOrders();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Work Orders</h1>
          <p className="text-muted-foreground">
            Manage field service work orders with precheck gating
          </p>
        </div>
        <div className="flex gap-2">
          <CreateDemoDataButton onSuccess={fetchWorkOrders} />
          <Button variant="outline" onClick={() => setEmailImportOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Import from Email
          </Button>
          <Button onClick={() => navigate('/tickets')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Work Order
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {statusFilter ? `Filtered by: ${statusFilter}` : 'All work orders'}
            </p>
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>Active Work Orders</CardTitle>
              <CardDescription>
                Showing {workOrders.length} of {totalCount.toLocaleString()} work orders 
                (Page {currentPage} of {totalPages})
              </CardDescription>
            </div>
          </div>
          
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant={statusFilter === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter(null)}
            >
              All ({totalCount.toLocaleString()})
            </Button>
            <Button
              variant={statusFilter === 'draft' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('draft')}
            >
              Draft
            </Button>
            <Button
              variant={statusFilter === 'pending_validation' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('pending_validation')}
            >
              Pending Validation
            </Button>
            <Button
              variant={statusFilter === 'released' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('released')}
            >
              Released
            </Button>
            <Button
              variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('in_progress')}
            >
              In Progress
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('completed')}
            >
              Completed
            </Button>
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
                      {wo.multi_day && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          <CalendarRange className="h-3 w-3 mr-1" />Multi-day
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
                          {wo.sapos_offers.slice(0, 3).map((offer) => (
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
                    {woPerms.edit && (
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
                    )}
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
                    {woPerms.execute && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={isCompleted}
                        title={isCompleted ? 'Disabled for completed work orders' : undefined}
                        onClick={() => {
                          console.log('Offer AI button clicked for WO:', wo.id, 'Status:', wo.status);
                          if (wo.status === 'draft' || wo.status === 'pending_validation') {
                            toast({
                              title: 'Work order not ready',
                              description: 'Please release the work order first before generating offers',
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
                        Offer AI
                      </Button>
                    )}
                    {/* Only users with execute permission on serviceOrders can generate SO */}
                    {soPerms.execute ? (
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
                    ) : soPerms.view ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled
                        title="View-only access to Service Orders"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View SO
                      </Button>
                    ) : null}
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
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount.toLocaleString()} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-2">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedWO && (
        <>
          <GenerateOfferDialog
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

      {/* Email Import Modal */}
      <Dialog open={emailImportOpen} onOpenChange={(open) => {
        if (!open) {
          setEmailExtracted(null);
          setEmailConfidence(null);
          setEmailWoId(null);
        }
        setEmailImportOpen(open);
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />Import Work Order from Email
            </DialogTitle>
            <DialogDescription>
              Paste the email content and AI will extract work order details.
            </DialogDescription>
          </DialogHeader>

          {!emailExtracted ? (
            <div className="space-y-4">
              <div>
                <Label>Subject</Label>
                <Input
                  value={emailForm.subject}
                  onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Urgent HVAC failure at site B"
                />
              </div>
              <div>
                <Label>Sender Email</Label>
                <Input
                  type="email"
                  value={emailForm.senderEmail}
                  onChange={e => setEmailForm(f => ({ ...f, senderEmail: e.target.value }))}
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <Label>Email Body</Label>
                <Textarea
                  rows={6}
                  value={emailForm.body}
                  onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Paste the email body here..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEmailImportOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleEmailParseAndImport}
                  disabled={emailParsing || (!emailForm.subject && !emailForm.body)}
                >
                  {emailParsing ? 'Parsing…' : 'Parse & Import'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={emailConfidence !== null && emailConfidence >= 0.6 ? 'default' : 'destructive'}>
                  Confidence: {emailConfidence !== null ? `${Math.round(emailConfidence * 100)}%` : 'N/A'}
                </Badge>
                {emailConfidence !== null && emailConfidence < 0.6 && (
                  <span className="text-xs text-orange-600">Will be created as Pending Review</span>
                )}
              </div>
              <div className="rounded-md border p-4 space-y-2 text-sm">
                <div><span className="font-medium">Title: </span>{emailExtracted.title}</div>
                <div><span className="font-medium">Priority: </span>
                  <Badge variant="outline" className="ml-1">{emailExtracted.priority}</Badge>
                </div>
                {emailExtracted.siteAddress && (
                  <div><span className="font-medium">Site: </span>{emailExtracted.siteAddress}</div>
                )}
                {emailExtracted.customerRef && (
                  <div><span className="font-medium">Customer Ref: </span>{emailExtracted.customerRef}</div>
                )}
                {emailExtracted.requiredSkills.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-medium">Skills: </span>
                    {emailExtracted.requiredSkills.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                  </div>
                )}
                <div className="pt-1 border-t text-muted-foreground text-xs">
                  {emailExtracted.description.slice(0, 200)}{emailExtracted.description.length > 200 ? '…' : ''}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setEmailExtracted(null); setEmailWoId(null); }}>
                  Back
                </Button>
                <Button onClick={handleEmailConfirm}>
                  Confirm & Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}