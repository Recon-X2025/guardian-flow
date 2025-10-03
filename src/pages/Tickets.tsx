import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Tickets() {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
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

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('tickets')
        .insert({
          unit_serial: formData.unitSerial,
          customer_name: formData.customer,
          site_address: formData.siteAddress,
          symptom: formData.symptom,
          status: 'open',
        });

      if (error) throw error;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tickets</h1>
          <p className="text-muted-foreground">Manage service requests and work orders</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Ticket
        </Button>
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
                    placeholder="e.g., HVAC-12345-XYZ" 
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
              <CardDescription>All service requests in the system</CardDescription>
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
              {tickets.map((ticket) => (
                <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">TKT-{ticket.id.slice(0, 8)}</span>
                        <Badge variant="outline" className={getStatusColor(ticket.status)}>
                          {getStatusIcon(ticket.status)}
                          <span className="ml-1">{ticket.status}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground">{ticket.symptom}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Unit: {ticket.unit_serial}</span>
                        <span>•</span>
                        <span>{ticket.customer_name || 'N/A'}</span>
                        <span>•</span>
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>

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
