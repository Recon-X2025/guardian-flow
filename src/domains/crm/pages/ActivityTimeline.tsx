import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, FileText, Calendar, CheckSquare, Plus, Check } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Activity {
  id: string;
  type: 'call' | 'email' | 'note' | 'meeting' | 'task';
  subject: string;
  body?: string;
  deal_id?: string;
  contact_id?: string;
  due_date?: string;
  completed: boolean;
  created_at: string;
}

function typeIcon(type: string) {
  if (type === 'call') return <Phone className="h-4 w-4 text-blue-500" />;
  if (type === 'email') return <Mail className="h-4 w-4 text-purple-500" />;
  if (type === 'note') return <FileText className="h-4 w-4 text-gray-500" />;
  if (type === 'meeting') return <Calendar className="h-4 w-4 text-green-500" />;
  return <CheckSquare className="h-4 w-4 text-orange-500" />;
}

export default function ActivityTimeline({ dealId, contactId }: { dealId?: string; contactId?: string }) {
  const [searchParams] = useSearchParams();
  const effectiveDealId = dealId ?? searchParams.get('deal_id') ?? undefined;
  const effectiveContactId = contactId ?? searchParams.get('contact_id') ?? undefined;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const EMPTY = { type: 'note', subject: '', body: '', deal_id: effectiveDealId ?? '', contact_id: effectiveContactId ?? '', due_date: '' };
  const [form, setForm] = useState(EMPTY);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const params = new URLSearchParams();
  if (effectiveDealId) params.set('deal_id', effectiveDealId);
  if (effectiveContactId) params.set('contact_id', effectiveContactId);

  const { data } = useQuery({
    queryKey: ['crm-activities', effectiveDealId, effectiveContactId],
    queryFn: async () => {
      const res = await fetch(`/api/crm/activities?${params.toString()}`, { headers: authHeader() });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const activities: Activity[] = data?.activities ?? [];

  const createMut = useMutation({
    mutationFn: async (body: typeof EMPTY) => {
      const res = await fetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ ...body, deal_id: body.deal_id || undefined, contact_id: body.contact_id || undefined }),
      });
      if (!res.ok) throw new Error('Failed to create activity');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-activities'] });
      toast({ title: 'Activity created' });
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const completeMut = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await fetch(`/api/crm/activities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-activities'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activity Timeline</h2>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Log Activity</Button>
      </div>

      {activities.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-8">No activities yet.</p>
      )}

      <div className="space-y-3">
        {activities.map(a => (
          <Card key={a.id} className={a.completed ? 'opacity-60' : ''}>
            <CardContent className="p-4 flex gap-3 items-start">
              <div className="mt-0.5">{typeIcon(a.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{a.subject}</span>
                  <Badge variant="outline" className="text-xs capitalize">{a.type}</Badge>
                  {a.completed && <Badge className="bg-green-100 text-green-800 border-0 text-xs">Done</Badge>}
                </div>
                {a.body && <p className="text-xs text-muted-foreground mt-1">{a.body.slice(0, 100)}{a.body.length > 100 ? '…' : ''}</p>}
                <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
              </div>
              {!a.completed && (
                <Button size="sm" variant="ghost" onClick={() => completeMut.mutate({ id: a.id, completed: true })}>
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['call','email','note','meeting','task'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Subject</Label><Input value={form.subject} onChange={e => set('subject', e.target.value)} /></div>
            <div><Label>Body</Label><Textarea value={form.body} onChange={e => set('body', e.target.value)} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Deal ID</Label><Input value={form.deal_id} onChange={e => set('deal_id', e.target.value)} /></div>
              <div><Label>Contact ID</Label><Input value={form.contact_id} onChange={e => set('contact_id', e.target.value)} /></div>
            </div>
            <div><Label>Due Date</Label><Input type="datetime-local" value={form.due_date} onChange={e => set('due_date', e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending}>
              {createMut.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
