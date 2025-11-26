import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Route, Navigation, MapPin, Clock, TrendingDown, Zap, User } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WorkOrderWithLocation {
  id: string;
  wo_number: string;
  status: string;
  ticket: {
    site_address: string;
    symptom: string;
  };
  technician_id: string;
  technician: {
    full_name: string;
  };
  check_in_latitude?: number;
  check_in_longitude?: number;
}

interface OptimizedRoute {
  technician_id: string;
  technician_name: string;
  work_orders: WorkOrderWithLocation[];
  total_distance_km: number;
  estimated_duration_hours: number;
}

export default function RouteOptimization() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrderWithLocation[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>('all');
  const [optimizedRoutes, setOptimizedRoutes] = useState<OptimizedRoute[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load work orders that are released or in progress
      const { data: wos, error: woError } = await supabase
        .from('work_orders')
        .select(`
          *,
          ticket:tickets(site_address, symptom),
          technician:profiles(full_name)
        `)
        .in('status', ['released', 'in_progress'])
        .not('technician_id', 'is', null)
        .order('created_at', { ascending: true });

      if (woError) throw woError;

      // Load technicians with active work orders
      const { data: techs, error: techError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', [...new Set((wos || []).map((wo: any) => wo.technician_id).filter(Boolean))]);

      if (techError) throw techError;

      setWorkOrders(wos || []);
      setTechnicians(techs || []);
    } catch (err: any) {
      toast({
        title: 'Error loading data',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const optimizeRoutes = async () => {
    setOptimizing(true);
    
    try {
      // Simple optimization: group by technician and order by creation time
      // In a real implementation, this would use a routing API (Google Maps, Mapbox, etc.)
      const techIds = selectedTechId === 'all' 
        ? [...new Set(workOrders.map(wo => wo.technician_id).filter(Boolean))]
        : [selectedTechId];

      const routes: OptimizedRoute[] = techIds.map(techId => {
        const techWOs = workOrders.filter(wo => wo.technician_id === techId);
        const tech = technicians.find(t => t.id === techId);

        // Simulate distance calculation (in a real app, use routing API)
        const estimatedDistance = techWOs.length * 15; // Assume 15km between each stop
        const estimatedDuration = techWOs.length * 2; // Assume 2 hours per stop

        return {
          technician_id: techId,
          technician_name: tech?.full_name || 'Unknown',
          work_orders: techWOs,
          total_distance_km: estimatedDistance,
          estimated_duration_hours: estimatedDuration,
        };
      });

      setOptimizedRoutes(routes);

      toast({
        title: 'Routes Optimized',
        description: `Generated ${routes.length} optimized route(s)`,
      });
    } catch (err: any) {
      toast({
        title: 'Error optimizing routes',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setOptimizing(false);
    }
  };

  const totalWOs = workOrders.length;
  const totalTechs = technicians.length;
  const avgWOsPerTech = totalTechs > 0 ? (totalWOs / totalTechs).toFixed(1) : '0';
  const totalEstimatedKm = optimizedRoutes.reduce((sum, r) => sum + r.total_distance_km, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Route className="h-8 w-8" />
          Smart Route Optimization
        </h1>
        <p className="text-muted-foreground mt-2">
          Plan the fastest, most efficient routes for your field engineers
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Work Orders</CardTitle>
            <MapPin className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWOs}</div>
            <p className="text-xs text-muted-foreground">Ready for routing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Field Engineers</CardTitle>
            <User className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTechs}</div>
            <p className="text-xs text-muted-foreground">{avgWOsPerTech} WOs/engineer avg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEstimatedKm.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Estimated kilometers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Optimization</CardTitle>
            <Zap className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{optimizedRoutes.length}</div>
            <p className="text-xs text-muted-foreground">Routes generated</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Optimized Routes</CardTitle>
          <CardDescription>
            Select a technician or optimize routes for all engineers at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedTechId} onValueChange={setSelectedTechId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {technicians.map(tech => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={optimizeRoutes}
              disabled={loading || optimizing || totalWOs === 0}
            >
              <Navigation className="mr-2 h-4 w-4" />
              {optimizing ? 'Optimizing...' : 'Optimize Routes'}
            </Button>
          </div>

          {optimizedRoutes.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              <Route className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Click "Optimize Routes" to generate efficient routes for your engineers</p>
            </div>
          )}
        </CardContent>
      </Card>

      {optimizedRoutes.length > 0 && (
        <div className="space-y-4">
          {optimizedRoutes.map((route, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {route.technician_name}
                    </CardTitle>
                    <CardDescription>
                      {route.work_orders.length} stops • {route.total_distance_km.toFixed(0)} km • ~{route.estimated_duration_hours.toFixed(1)} hours
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Optimized Route
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {route.work_orders.map((wo, woIdx) => (
                    <div
                      key={wo.id}
                      className="flex items-start gap-4 p-3 border rounded-lg hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                          {woIdx + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{wo.wo_number}</span>
                          <Badge variant="secondary">{wo.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {wo.ticket?.symptom || 'No description'}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{wo.ticket?.site_address || 'No address'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {woIdx < route.work_orders.length - 1 && (
                          <div className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            ~15 km
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
