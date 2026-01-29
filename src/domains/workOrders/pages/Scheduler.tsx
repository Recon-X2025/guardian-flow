import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';

export default function Scheduler() {
  const { toast } = useToast();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [woData, techData] = await Promise.all([
        supabase
          .from('work_orders')
          .select('*, ticket:tickets(*), technician:profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('profiles')
          .select('id, full_name, email, user_roles!user_roles_user_id_fkey!inner(role)')
          .eq('user_roles.role', 'technician')
          .limit(50)
      ]);

      if (woData.error) throw woData.error;
      if (techData.error) throw techData.error;

      setWorkOrders(woData.data || []);
      setTechnicians(techData.data || []);
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

  const assignTechnician = async (workOrderId: string, technicianId: string) => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ technician_id: technicianId })
        .eq('id', workOrderId);

      if (error) throw error;

      toast({
        title: "Technician assigned",
        description: "Work order has been assigned successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error assigning technician",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const unassignedWO = workOrders.filter(wo => !wo.technician_id).length;
  const scheduledWO = workOrders.filter(wo => wo.technician_id && wo.status !== 'completed').length;
  const completedToday = workOrders.filter(wo => 
    wo.status === 'completed' && 
    wo.completed_at && 
    new Date(wo.completed_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Scheduler</h1>
        <p className="text-muted-foreground">
          Schedule and assign technicians to work orders
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unassignedWO}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledWO}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Technicians</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicians.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Unassigned Work Orders</CardTitle>
            <CardDescription>Click to assign technicians</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workOrders.filter(wo => !wo.technician_id).map((wo) => (
                <div
                  key={wo.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{wo.wo_number || 'Draft'}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {wo.ticket?.symptom || 'No description'}
                      </p>
                    </div>
                    <Badge variant="outline">Unassigned</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {wo.ticket?.site_address || 'No address'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(wo.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {technicians.slice(0, 3).map(tech => (
                      <Button
                        key={tech.id}
                        variant="outline"
                        size="sm"
                        onClick={() => assignTechnician(wo.id, tech.id)}
                      >
                        Assign to {tech.full_name || 'Tech'}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
              {workOrders.filter(wo => !wo.technician_id).length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No unassigned work orders
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Technician Schedule</CardTitle>
            <CardDescription>Today's assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {technicians.map((tech) => {
                const assignedWOs = workOrders.filter(wo => wo.technician_id === tech.id);
                return (
                  <div key={tech.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{tech.full_name || 'Technician'}</span>
                      </div>
                      <Badge>{assignedWOs.length} WO{assignedWOs.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    {assignedWOs.length > 0 ? (
                      <div className="space-y-2">
                        {assignedWOs.map(wo => (
                          <div key={wo.id} className="text-sm pl-6 py-1 border-l-2 border-primary/20">
                            <div className="font-medium">{wo.wo_number}</div>
                            <div className="text-muted-foreground text-xs">
                              {wo.ticket?.site_address || 'No address'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground pl-6">No assignments</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}