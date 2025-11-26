import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Zap, Users, Clock, MapPin, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ScheduleOptimizer() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [optimizing, setOptimizing] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);

  const { data: optimizationRuns, refetch: refetchRuns } = useQuery({
    queryKey: ['optimization-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_optimization_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (result.error) throw result.error;
      return result.data;
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ['optimized-assignments', currentRunId],
    enabled: !!currentRunId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('optimized_schedule_assignments')
        .select(`
          *,
          work_orders (wo_number, title, priority),
          technicians (name, email)
        `)
        .eq('optimization_run_id', currentRunId!)
        .order('scheduled_start', { ascending: true });
      if (result.error) throw result.error;
      return result.data;
    },
  });

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const { user } = useAuth();
      if (!user) throw new Error('Not authenticated');

      const dateStr = selectedDate.toISOString().split('T')[0];

      const result = await apiClient.functions.invoke('schedule-optimizer', {
        body: {
          tenantId: user.user_metadata.tenant_id,
          date: dateStr,
          constraints: {
            maxWorkloadHours: 8,
            allowOvertime: false,
            prioritizeSkillMatch: true,
          }
        }
      });

      if (result.error) throw result.error;

      setCurrentRunId(data.runId);
      refetchRuns();

      toast({
        title: "Schedule Optimized",
        description: `Generated ${data.assignmentsCount} optimized assignments`,
      });
    } catch (error) {
      console.error('Optimization error:', error);
      toast({
        title: "Optimization Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setOptimizing(false);
    }
  };

  const handleApplySchedule = async () => {
    if (!currentRunId || !assignments) return;

    try {
      // Apply optimized assignments to work orders
      for (const assignment of assignments) {
        await supabase
          .from('work_orders')
          .update({
            assigned_to: assignment.technician_id,
            scheduled_start: assignment.scheduled_start,
            scheduled_end: assignment.scheduled_end,
            status: 'assigned',
          })
          .eq('id', assignment.work_order_id);
      }

      // Mark assignments as applied
      await supabase
        .from('optimized_schedule_assignments')
        .update({
          applied: true,
          applied_at: new Date().toISOString(),
        })
        .eq('optimization_run_id', currentRunId);

      toast({
        title: "Schedule Applied",
        description: `${assignments.length} work orders scheduled`,
      });
    } catch (error) {
      toast({
        title: "Apply Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="w-8 h-8 text-primary" />
            AI Schedule Optimizer
          </h1>
          <p className="text-muted-foreground">Constraint-based intelligent scheduling</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>Choose date to optimize</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
            <Button 
              className="w-full mt-4" 
              onClick={handleOptimize}
              disabled={optimizing}
            >
              {optimizing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Optimizing...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> Run Optimization</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Optimization Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {optimizationRuns?.map((run) => (
                <div 
                  key={run.id}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                    currentRunId === run.id ? 'border-primary bg-accent' : ''
                  }`}
                  onClick={() => setCurrentRunId(run.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{new Date(run.run_date).toLocaleDateString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(run.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Badge variant={
                      run.status === 'completed' ? 'default' :
                      run.status === 'failed' ? 'destructive' :
                      'secondary'
                    }>
                      {run.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {assignments && assignments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Optimized Schedule</CardTitle>
              <Button onClick={handleApplySchedule}>
                Apply to Work Orders
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Order</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Scores</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment: any) => {
                  const duration = Math.round(
                    (new Date(assignment.scheduled_end).getTime() - 
                     new Date(assignment.scheduled_start).getTime()) / 60000
                  );
                  
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.work_orders?.wo_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {assignment.work_orders?.title}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.technicians?.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {assignment.technicians?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(assignment.scheduled_start).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {duration}min
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            P: {assignment.priority_score}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            S: {assignment.skill_match_score}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignment.applied ? (
                          <Badge variant="default">Applied</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
