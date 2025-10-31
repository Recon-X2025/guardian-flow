import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, FileText, Calendar } from 'lucide-react';
import { ServiceBookingDialog } from '@/components/ServiceBookingDialog';

export default function CustomerPortal() {
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  const { data: serviceRequests } = useQuery({
    queryKey: ['customer-service-requests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get customer_id from portal access
      const { data: portalAccess } = await supabase
        .from('customer_portal_access')
        .select('customer_id')
        .eq('user_id', user.id)
        .single();

      if (!portalAccess) return [];

      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('customer_id', portalAccess.customer_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const { data: equipment } = useQuery({
    queryKey: ['customer-equipment'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: portalAccess } = await supabase
        .from('customer_portal_access')
        .select('customer_id')
        .eq('user_id', user.id)
        .single();

      if (!portalAccess) return [];

      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('customer_id', portalAccess.customer_id);

      if (error) throw error;
      return data;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-primary';
      case 'scheduled': return 'bg-warning';
      case 'in_progress': return 'bg-info';
      case 'completed': return 'bg-success';
      case 'cancelled': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Portal</h1>
          <p className="text-muted-foreground mt-1">
            Manage your service requests and equipment
          </p>
        </div>
        <Button onClick={() => setBookingDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Book Service
        </Button>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Service Requests</TabsTrigger>
          <TabsTrigger value="equipment">My Equipment</TabsTrigger>
          <TabsTrigger value="history">Service History</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {serviceRequests && serviceRequests.length > 0 ? (
            serviceRequests.map((request: any) => (
              <Card key={request.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{request.title}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                      <Badge variant="outline">{request.priority}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Request # {request.request_number}
                    </p>
                    <p className="text-sm">{request.description}</p>
                    {request.preferred_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Preferred: {new Date(request.preferred_date).toLocaleDateString()}
                        {request.preferred_time_slot && ` - ${request.preferred_time_slot}`}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">
                No service requests yet. Click "Book Service" to get started.
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          {equipment && equipment.length > 0 ? (
            equipment.map((eq: any) => (
              <Card key={eq.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{eq.name}</h3>
                    <div className="flex gap-2">
                      <Badge variant="outline">{eq.category}</Badge>
                      <Badge>{eq.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Serial #: {eq.serial_number}</div>
                      <div>Model: {eq.manufacturer} {eq.model}</div>
                      {eq.warranty_expiry && (
                        <div>
                          Warranty: {new Date(eq.warranty_expiry) > new Date() ? 'Active' : 'Expired'} 
                          ({new Date(eq.warranty_expiry).toLocaleDateString()})
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Request Service
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">
                No equipment registered yet.
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              Service history will appear here.
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      <ServiceBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
      />
    </div>
  );
}