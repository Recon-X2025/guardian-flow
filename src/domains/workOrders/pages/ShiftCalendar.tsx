import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Shift {
  id: string;
  technician_id: string;
  date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

export default function ShiftCalendar() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const EMPTY = { technician_id: '', date: '', start_time: '', end_time: '', shift_type: 'day' };
  const [form, setForm] = useState(EMPTY);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const weekDates = getWeekDates();

  const { data } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const res = await fetch('/api/shifts', { headers: authHeader() });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const shifts: Shift[] = data?.shifts ?? [];

  const createMut = useMutation({
    mutationFn: async (body: typeof EMPTY) => {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create shift');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      toast({ title: 'Shift created' });
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const shiftsByDate = (date: string) => shifts.filter(s => s.date === date);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shift Calendar</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Create Shift</Button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((day, i) => (
          <Card key={day}>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm font-semibold">{day}</CardTitle>
              <p className="text-xs text-muted-foreground">{weekDates[i]}</p>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-1 min-h-[80px]">
              {shiftsByDate(weekDates[i]).map(s => (
                <div key={s.id} className="text-xs p-1.5 rounded bg-primary/10 border border-primary/20">
                  <p className="font-medium truncate">{s.technician_id}</p>
                  <p className="text-muted-foreground">{s.start_time}–{s.end_time}</p>
                  <Badge variant="outline" className="text-[10px] px-1 mt-0.5">{s.shift_type}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Shift</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Technician ID</Label><Input value={form.technician_id} onChange={e => set('technician_id', e.target.value)} /></div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} /></div>
              <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} /></div>
            </div>
            <div><Label>Shift Type</Label><Input value={form.shift_type} onChange={e => set('shift_type', e.target.value)} placeholder="day / night / on-call" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending}>
              {createMut.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
