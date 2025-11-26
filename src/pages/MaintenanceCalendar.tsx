import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Calendar as CalendarIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function MaintenanceCalendar() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const { data: schedules } = useQuery({
    queryKey: ['maintenance-schedules'],
    queryFn: async () => {
      const result = await apiClient.functions.invoke('asset-maintenance-scheduler', {
        body: { action: 'list_schedules' },
      });
      if (result.error) throw result.error;
      return result.data?.schedules || [];
    },
  });

  const { data: events } = useQuery({
    queryKey: ['maintenance-events', selectedDate],
    queryFn: async () => {
      const startDate = new Date(selectedDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 90);

      const result = await apiClient.functions.invoke('asset-maintenance-scheduler', {
        body: {
          action: 'list_events',
          data: {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
          },
        },
      });
      if (result.error) throw result.error;
      return result.data?.events || [];
    },
  });

  const { data: assets } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('id, name, model, serial_number')
        .order('name');
      if (result.error) throw result.error;
      return result.data;
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (scheduleData: any) => {
      const result = await apiClient.functions.invoke('asset-maintenance-scheduler', {
        body: { action: 'create_schedule', data: scheduleData },
      });
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-events'] });
      toast.success('Maintenance schedule created successfully');
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create schedule');
    },
  });

  const completeEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const result = await apiClient.functions.invoke('asset-maintenance-scheduler', {
        body: { action: 'complete_event', event_id: eventId },
      });
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-events'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
      toast.success('Maintenance completed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to complete maintenance');
    },
  });

  const handleCreateSchedule = (formData: any) => {
    createScheduleMutation.mutate({
      asset_id: formData.get('asset_id'),
      schedule_name: formData.get('schedule_name'),
      maintenance_type: formData.get('maintenance_type'),
      frequency: formData.get('frequency'),
      frequency_value: parseInt(formData.get('frequency_value') || '1'),
      start_date: formData.get('start_date'),
      estimated_duration_hours: parseFloat(formData.get('estimated_duration_hours') || '2'),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'scheduled': return 'bg-blue-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Calendar</h1>
          <p className="text-muted-foreground">Automated asset maintenance scheduling</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Maintenance Schedule</DialogTitle>
              <DialogDescription>
                Set up recurring maintenance for an asset
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreateSchedule(new FormData(e.currentTarget));
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="asset_id">Asset</Label>
                <Select name="asset_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets?.map((asset: any) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name} - {asset.serial_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule_name">Schedule Name</Label>
                <Input id="schedule_name" name="schedule_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance_type">Maintenance Type</Label>
                <Select name="maintenance_type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="predictive">Predictive</SelectItem>
                    <SelectItem value="corrective">Corrective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select name="frequency" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency_value">Every</Label>
                  <Input
                    id="frequency_value"
                    name="frequency_value"
                    type="number"
                    min="1"
                    defaultValue="1"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input id="start_date" name="start_date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_duration_hours">Estimated Duration (hours)</Label>
                <Input
                  id="estimated_duration_hours"
                  name="estimated_duration_hours"
                  type="number"
                  step="0.5"
                  defaultValue="2"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Schedule</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Schedules</CardTitle>
            <CardDescription>Recurring maintenance schedules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {schedules?.map((schedule: any) => (
              <div key={schedule.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{schedule.schedule_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {schedule.equipment?.name} - {schedule.equipment?.serial_number}
                    </p>
                  </div>
                  <Badge variant="outline">{schedule.maintenance_type}</Badge>
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Every {schedule.frequency_value} {schedule.frequency}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>Next due: {new Date(schedule.next_due_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
            {(!schedules || schedules.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No schedules yet. Create your first maintenance schedule!
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Maintenance</CardTitle>
            <CardDescription>Next 90 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-auto">
            {events?.map((event: any) => (
              <div key={event.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{event.maintenance_schedules?.schedule_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {event.equipment?.name} - {event.equipment?.serial_number}
                    </p>
                  </div>
                  <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{new Date(event.scheduled_date).toLocaleDateString()}</span>
                  </div>
                </div>
                {event.status === 'scheduled' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => completeEventMutation.mutate(event.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
              </div>
            ))}
            {(!events || events.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming maintenance events
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
