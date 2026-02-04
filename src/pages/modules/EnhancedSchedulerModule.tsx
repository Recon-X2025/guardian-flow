import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/integrations/api/client";
import { toast } from "sonner";
import { 
  Calendar as CalendarIcon, 
  Users, 
  MapPin, 
  Clock, 
  Zap,
  TrendingUp,
  Route
} from "lucide-react";

type Technician = {
  id: string;
  name: string;
  skills: string[];
  location: { lat: number; lng: number };
  availability: string;
};

type WorkOrder = {
  id: string;
  title: string;
  priority: string;
  location: { lat: number; lng: number };
  estimatedHours: number;
  requiredSkills: string[];
  scheduledDate?: Date;
  assignedTo?: string;
};

type ScheduleOptimization = {
  totalTravelTime: number;
  totalWorkHours: number;
  utilizationRate: number;
  assignments: Array<{
    workOrderId: string;
    technicianId: string;
    scheduledTime: string;
    travelTime: number;
  }>;
};

export default function EnhancedSchedulerModule() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [optimization, setOptimization] = useState<ScheduleOptimization | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    loadScheduleData();
  }, [date]);

  const loadScheduleData = async () => {
    try {
      // Load technicians
      const techResponse = await apiClient
        .from("technicians")
        .select("*")
        .eq("is_active", true);

      if (techResponse.data) {
        interface TechnicianRecord {
          id: string;
          name: string;
          skills?: string[];
          current_location?: { lat: number; lng: number };
          availability_status?: string;
        }
        setTechnicians((techResponse.data as TechnicianRecord[]).map((t) => ({
          id: t.id,
          name: t.name,
          skills: t.skills || [],
          location: t.current_location || { lat: 0, lng: 0 },
          availability: t.availability_status || "available"
        })));
      }

      // Load unscheduled work orders
      const woResponse = await apiClient
        .from("work_orders")
        .select("*")
        .in("status", ["draft", "released"])
        .is("assigned_to", null);

      if (woResponse.data) {
        interface WorkOrderRecord {
          id: string;
          title: string;
          priority: string;
          location?: { lat: number; lng: number };
          estimated_hours?: number;
          required_skills?: string[];
          assigned_to?: string;
        }
        setWorkOrders((woResponse.data as WorkOrderRecord[]).map((wo) => ({
          id: wo.id,
          title: wo.title,
          priority: wo.priority,
          location: wo.location || { lat: 0, lng: 0 },
          estimatedHours: wo.estimated_hours || 2,
          requiredSkills: wo.required_skills || [],
          assignedTo: wo.assigned_to
        })));
      }
    } catch (error) {
      console.error("Error loading schedule data:", error);
    }
  };

  const optimizeSchedule = async () => {
    setIsOptimizing(true);
    try {
      const result = await apiClient.functions.invoke("optimize-schedule", {
        body: {
          date: date?.toISOString(),
          technicians,
          workOrders
        }
      });

      if (result.error) throw result.error;

      const data = result.data as ScheduleOptimization;
      setOptimization(data);
      toast.success("Schedule optimized successfully!");

      // Apply optimized schedule
      await applyOptimizedSchedule(data);
    } catch (error: unknown) {
      console.error("Optimization error:", error);
      toast.error("Failed to optimize schedule");
    } finally {
      setIsOptimizing(false);
    }
  };

  const applyOptimizedSchedule = async (opt: ScheduleOptimization) => {
    try {
      for (const assignment of opt.assignments) {
        await apiClient
          .from("work_orders")
          .update({
            assigned_to: assignment.technicianId,
            scheduled_date: assignment.scheduledTime,
            status: "assigned"
          })
          .eq("id", assignment.workOrderId);
      }

      toast.success("Schedule applied successfully");
      loadScheduleData();
    } catch (error) {
      console.error("Error applying schedule:", error);
      toast.error("Failed to apply schedule");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-8 h-8" />
            AI-Powered Workforce Scheduler
          </h1>
          <p className="text-muted-foreground mt-1">
            Intelligent scheduling with route optimization and skill matching
          </p>
        </div>
        <Button 
          onClick={optimizeSchedule} 
          disabled={isOptimizing || workOrders.length === 0}
          size="lg"
        >
          <Zap className="w-4 h-4 mr-2" />
          {isOptimizing ? "Optimizing..." : "Optimize Schedule"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Available Technicians
            </CardTitle>
            <CardDescription>
              {technicians.filter(t => t.availability === "available").length} ready for assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {technicians.map((tech) => (
              <div key={tech.id} className="flex items-start justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-semibold">{tech.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Skills: {tech.skills.join(", ") || "General"}
                  </p>
                </div>
                <Badge variant={tech.availability === "available" ? "default" : "secondary"}>
                  {tech.availability}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Unscheduled Work Orders
            </CardTitle>
            <CardDescription>
              {workOrders.length} orders awaiting assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workOrders.slice(0, 10).map((wo) => (
              <div key={wo.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-sm">{wo.title}</p>
                  <Badge variant={wo.priority === "critical" ? "destructive" : "secondary"}>
                    {wo.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{wo.estimatedHours}h</span>
                  <MapPin className="w-3 h-3 ml-2" />
                  <span>On-site</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>
      </div>

      {optimization && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Optimization Results
            </CardTitle>
            <CardDescription>
              AI-generated optimal schedule for {date?.toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Route className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{optimization.totalTravelTime.toFixed(1)}h</p>
                <p className="text-sm text-muted-foreground">Total Travel Time</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Clock className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{optimization.totalWorkHours.toFixed(1)}h</p>
                <p className="text-sm text-muted-foreground">Total Work Hours</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                <p className="text-2xl font-bold">{optimization.utilizationRate.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Utilization Rate</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Optimized Assignments</h3>
              <div className="space-y-2">
                {optimization.assignments.map((assignment, idx) => {
                  const wo = workOrders.find(w => w.id === assignment.workOrderId);
                  const tech = technicians.find(t => t.id === assignment.technicianId);
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-semibold text-sm">{wo?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Assigned to: {tech?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {new Date(assignment.scheduledTime).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Travel: {assignment.travelTime.toFixed(0)}min
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
