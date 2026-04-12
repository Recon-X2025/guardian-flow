import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, MapPin, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';

interface SchedulerWorkOrder {
  id: string;
  wo_number?: string;
  status: string;
  technician_id?: string;
  completed_at?: string;
  created_at: string;
  ticket?: {
    symptom?: string;
    site_address?: string;
  };
  technician?: {
    full_name?: string;
  };
}

interface Technician {
  id: string;
  full_name?: string;
  email?: string;
  user_roles?: { role: string }[];
}

interface ForecastWeek {
  week: string;
  startDate: string;
  endDate: string;
  forecastedWOs: number;
  availableCapacity: number;
  gap: number;
}

export default function Scheduler() {
  const { toast } = useToast();
  const [workOrders, setWorkOrders] = useState<SchedulerWorkOrder[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [forecast, setForecast] = useState<ForecastWeek[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {    try {
      const [woData, techData] = await Promise.all([
        apiClient
          .from('work_orders')
          .select('*, ticket:tickets(*), technician:profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(20),
        apiClient
          .from('profiles')
          .select('id, full_name, email, user_roles!user_roles_user_id_fkey!inner(role)')
          .eq('user_roles.role', 'technician')
          .limit(50)
      ]);

      if (woData.error) throw woData.error;
      if (techData.error) throw techData.error;

      setWorkOrders((woData.data || []) as SchedulerWorkOrder[]);
      setTechnicians((techData.data || []) as Technician[]);
    } catch (error: unknown) {
      toast({
        title: "Error loading data",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignTechnician = async (workOrderId: string, technicianId: string) => {
    try {
      const { error } = await apiClient
        .from('work_orders')
        .update({ technician_id: technicianId })
        .eq('id', workOrderId);

      if (error) throw error;

      toast({
        title: "Technician assigned",
        description: "Work order has been assigned successfully",
      });

      fetchData();
    } catch (error: unknown) {
      toast({
        title: "Error assigning technician",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const fetchForecast = async () => {
    setForecastLoading(true);
    try {
      const res = await fetch('/api/schedule/capacity-forecast?weeks=6');
      if (res.ok) {
        const data = await res.json();
        setForecast(data.forecast || []);
      }
    } catch {
      // non-critical
    } finally {
      setForecastLoading(false);
    }
  };

  const toggleForecast = () => {
    if (!forecastOpen && forecast.length === 0) fetchForecast();
    setForecastOpen(v => !v);
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

      {/* Capacity Forecast Panel */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={toggleForecast}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Capacity Forecast</CardTitle>
            </div>
            {forecastOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
          <CardDescription>Forecasted demand vs available technician capacity (next 6 weeks)</CardDescription>
        </CardHeader>

        {forecastOpen && (
          <CardContent>
            {forecastLoading && (
              <p className="text-center text-muted-foreground py-4">Loading forecast…</p>
            )}
            {!forecastLoading && forecast.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No forecast data available.</p>
            )}
            {!forecastLoading && forecast.length > 0 && (() => {
              const maxVal = Math.max(...forecast.map(f => Math.max(f.forecastedWOs, f.availableCapacity)), 1);
              return (
                <div className="space-y-4">
                  <div className="flex items-end gap-2 h-40 pt-2">
                    {forecast.map(f => {
                      const woBh   = Math.round((f.forecastedWOs   / maxVal) * 128);
                      const capBh  = Math.round((f.availableCapacity / maxVal) * 128);
                      const isGap  = f.gap > 0;
                      return (
                        <div key={f.week} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                          <div className="w-full flex items-end gap-0.5 h-32">
                            <div
                              className={`flex-1 rounded-t-sm transition-all ${isGap ? 'bg-red-400' : 'bg-blue-400'}`}
                              style={{ height: `${woBh}px` }}
                              title={`Forecasted: ${f.forecastedWOs} WOs`}
                            />
                            <div
                              className="flex-1 rounded-t-sm bg-green-400 opacity-70 transition-all"
                              style={{ height: `${capBh}px` }}
                              title={`Capacity: ${f.availableCapacity}h`}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                            {f.week.split('-W')[1] ? `W${f.week.split('-W')[1]}` : f.week}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" />Forecasted WOs</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-400 opacity-70 inline-block" />Available Capacity (h)</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />Gap week</div>
                  </div>
                  {forecast.filter(f => f.gap > 0).length > 0 && (
                    <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                      <strong>⚠ Under-resourced weeks:</strong>{' '}
                      {forecast.filter(f => f.gap > 0).map(f => f.week).join(', ')}
                      {' — consider activating crowd partners.'}
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        )}
      </Card>
    </div>
  );
}