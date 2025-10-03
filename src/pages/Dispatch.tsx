import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Clock, Package, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Dispatch() {
  const { toast } = useToast();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*, ticket:tickets(*), technician:profiles(full_name)')
        .in('status', ['pending_validation', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkOrders(data || []);
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

  const updateStatus = async (woId: string, newStatus: 'completed' | 'in_progress') => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: newStatus })
        .eq('id', woId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Work order status changed to ${newStatus}`,
      });

      fetchWorkOrders();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const inProgress = workOrders.filter(wo => wo.status === 'in_progress').length;
  const pendingValidation = workOrders.filter(wo => wo.status === 'pending_validation').length;
  const partsReady = workOrders.filter(wo => wo.parts_reserved).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dispatch</h1>
        <p className="text-muted-foreground">
          Real-time dispatch board for field operations
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Validation</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingValidation}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parts Ready</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partsReady}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active WOs</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>In Progress</CardTitle>
            <CardDescription>Work orders currently being worked on</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workOrders.filter(wo => wo.status === 'in_progress').map((wo) => (
                <div
                  key={wo.id}
                  className="p-4 border rounded-lg bg-blue-50 border-blue-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{wo.wo_number || 'Draft'}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {wo.ticket?.symptom || 'No description'}
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                  </div>
                  <div className="space-y-2 mt-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {wo.ticket?.site_address || 'No address'}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Truck className="h-3 w-3" />
                      {wo.technician?.full_name || 'Unassigned'}
                    </div>
                    {wo.parts_reserved && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Package className="h-3 w-3" />
                        Parts Reserved
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus(wo.id, 'completed')}
                    >
                      Mark Complete
                    </Button>
                  </div>
                </div>
              ))}
              {workOrders.filter(wo => wo.status === 'in_progress').length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No work orders in progress
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Validation</CardTitle>
            <CardDescription>Awaiting precheck validation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workOrders.filter(wo => wo.status === 'pending_validation').map((wo) => (
                <div
                  key={wo.id}
                  className="p-4 border rounded-lg bg-orange-50 border-orange-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{wo.wo_number || 'Draft'}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {wo.ticket?.symptom || 'No description'}
                      </p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">Pending</Badge>
                  </div>
                  <div className="space-y-2 mt-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Waiting for validation
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Truck className="h-3 w-3" />
                      {wo.technician?.full_name || 'Unassigned'}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus(wo.id, 'in_progress')}
                    >
                      Release to Field
                    </Button>
                  </div>
                </div>
              ))}
              {workOrders.filter(wo => wo.status === 'pending_validation').length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No pending validations
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}