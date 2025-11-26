import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Search, Clock, CheckCircle2, AlertCircle, Briefcase, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { CreateWorkOrderDialog } from "@/components/CreateWorkOrderDialog";
import { TicketDetailsDialog } from "@/components/TicketDetailsDialog";
import { useActionPermissions } from "@/hooks/useActionPermissions";
import { differenceInDays } from "date-fns";

export default function Tickets() {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [woDialogOpen, setWoDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedTicketForDetails, setSelectedTicketForDetails] = useState<any>(null);
  const ticketPerms = useActionPermissions('tickets');
  const isViewOnly = !ticketPerms.create && !ticketPerms.edit;
  const [formData, setFormData] = useState({
    unitSerial: '',
    customer: '',
    siteAddress: '',
    symptom: '',
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      // Fetch tickets
      const ticketsResult = await apiClient.from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsResult.error) throw ticketsResult.error;
      const ticketsData = ticketsResult.data || [];

      // Fetch related work orders for each ticket
      const enrichedTickets = await Promise.all(ticketsData.map(async (ticket: any) => {
        const woResult = await apiClient.from('work_orders')
          .select('id, wo_number, status, part_status, completed_at')
          .eq('ticket_id', ticket.id)
          .catch(() => ({ data: [] }));
        
        return {
          ...ticket,
          work_orders: woResult.data || []
        };
      }));

      setTickets(enrichedTickets);
    } catch (error: any) {
      toast({
        title: 'Error loading tickets',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isTicketOverdue = (ticket: any) => {
    if (!ticket.work_orders || ticket.work_orders.length === 0) return false;
    const workOrder = ticket.work_orders[0];
    if (workOrder.status !== 'completed' || !workOrder.completed_at || ticket.status === 'completed') {
      return false;
    }
    const daysSinceCompletion = differenceInDays(new Date(), new Date(workOrder.completed_at));
    return daysSinceCompletion >= 7;
  };

  const getDaysOverdue = (ticket: any) => {
    if (!ticket.work_orders || ticket.work_orders.length === 0) return 0;
    const workOrder = ticket.work_orders[0];
    if (!workOrder.completed_at || ticket.status === 'completed') return 0;
    return differenceInDays(new Date(), new Date(workOrder.completed_at));
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const insertResult = apiClient.from('tickets').insert({
        unit_serial: formData.unitSerial,
        customer_name: formData.customer,
        site_address: formData.siteAddress,
        symptom: formData.symptom,
        status: 'open',
      });
      
      const result = await insertResult;
      if (result.error) throw result.error;

      toast({
        title: "Ticket created",
        description: "A new work order will be generated after pre-check validation",
      });

      setShowCreateForm(false);
      setFormData({ unitSerial: '', customer: '', siteAddress: '', symptom: '' });
      fetchTickets();
    } catch (error: any) {
      toast({
        title: 'Error creating ticket',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Clock className="h-4 w-4" />;
      case "assigned":
        return <AlertCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-warning/10 text-warning border-warning/20";
      case "assigned":
        return "bg-primary/10 text-primary border-primary/20";
      case "completed":
        return "bg-success/10 text-success border-success/20";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {isViewOnly && (
        <Alert>
          <AlertDescription>
            <strong>View-Only Mode:</strong> You have read-only access to Tickets.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tickets</h1>
          <p className="text-muted-foreground">Manage service requests and work orders</p>
        </div>
        {ticketPerms.create && (
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Ticket
          </Button>
        )}
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Ticket</CardTitle>
            <CardDescription>Enter service request details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitSerial">Unit Serial Number *</Label>
                  <Input 
                    id="unitSerial" 
                    placeholder="e.g., PC-2024-12345 or PR-MFP-67890" 
                    value={formData.unitSerial}
                    onChange={(e) => setFormData({ ...formData, unitSerial: e.target.value })}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Input 
                    id="customer" 
                    placeholder="Company name" 
                    value={formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteAddress">Site Address</Label>
                <Input 
                  id="siteAddress" 
                  placeholder="Installation location" 
                  value={formData.siteAddress}
                  onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symptom">Symptom Description *</Label>
                <Textarea
                  id="symptom"
                  placeholder="Describe the issue..."
                  rows={3}
                  value={formData.symptom}
                  onChange={(e) => setFormData({ ...formData, symptom: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create Ticket</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
          <div>
            <CardTitle>Active Tickets</CardTitle>
            <CardDescription>Tickets with work orders or under parts validation</CardDescription>
          </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tickets..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No tickets found</div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const workOrder = ticket.work_orders?.[0];
                const isOverdue = isTicketOverdue(ticket);
                const daysOverdue = getDaysOverdue(ticket);
                
                return (
                  <div
                    key={ticket.id}
                    className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                      isOverdue ? 'border-destructive bg-destructive/5' : ''
                    }`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">TKT-{ticket.id.slice(0, 8)}</span>
                        <Badge variant="outline" className={getStatusColor(ticket.status)}>
                          {getStatusIcon(ticket.status)}
                          <span className="ml-1">{ticket.status}</span>
                        </Badge>
                        {workOrder && (
                          <Badge variant="outline" className="bg-muted">
                            WO: {workOrder.wo_number}
                          </Badge>
                        )}
                        {isOverdue && (
                          <Badge variant="destructive" className="animate-pulse">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Overdue {daysOverdue} Days
                          </Badge>
                        )}
                        {workOrder?.completed_at && ticket.status !== 'completed' && !isOverdue && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                            <Timer className="h-3 w-3 mr-1" />
                            {daysOverdue} of 7 days
                          </Badge>
                        )}
                        {workOrder?.part_status === 'reserved' && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                            Parts Validation
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{ticket.symptom}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Unit: {ticket.unit_serial}</span>
                        <span>•</span>
                        <span>{ticket.customer_name || 'N/A'}</span>
                        <span>•</span>
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                        {workOrder && (
                          <>
                            <span>•</span>
                            <span className="font-medium">WO Status: {workOrder.status}</span>
                            {workOrder.completed_at && (
                              <>
                                <span>•</span>
                                <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                                  WO Closed: {new Date(workOrder.completed_at).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedTicketForDetails(ticket);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
        </CardContent>
      </Card>

      {selectedTicket && (
        <CreateWorkOrderDialog
          open={woDialogOpen}
          onOpenChange={setWoDialogOpen}
          ticketId={selectedTicket}
          onSuccess={fetchTickets}
        />
      )}

      <TicketDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        ticket={selectedTicketForDetails}
      />

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Pre-Work Order Validation</CardTitle>
          <CardDescription>Automated checks before work order release</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Inventory availability cascade (hub → OEM → partner → engineer buffer)</p>
            <p>• Warranty coverage verification for non-consumable parts</p>
            <p>• Technician certification and skill matching</p>
            <p>• RBAC override logged when validation bypassed</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
