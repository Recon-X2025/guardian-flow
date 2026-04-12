import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Calendar, Mail, Plug, RefreshCw, CheckCircle2, XCircle, Info } from 'lucide-react';
import { format } from 'date-fns';

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
}

interface Connection {
  id: string;
  provider: 'google' | 'microsoft';
  account_email: string | null;
  status: 'active' | 'revoked';
  connected_at: string;
  last_synced_at: string | null;
}

interface Activity {
  id: string;
  activity_type: 'email' | 'meeting';
  source: string;
  subject: string;
  description: string | null;
  start_time: string | null;
  contacts_matched: { id: string; name: string; email: string }[];
  direction?: string;
  synced_at: string;
}

// ── Connect Dialog ─────────────────────────────────────────────────────────────

function ConnectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [provider, setProvider] = useState<'google' | 'microsoft'>('google');
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const qc = useQueryClient();

  const connectMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/crm-calendar/connect', {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ provider, access_token: token, email }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-connections'] });
      toast({ title: 'Connected', description: `${provider} connected successfully` });
      setToken(''); setEmail(''); onClose();
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Connect Calendar / Email</DialogTitle></DialogHeader>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            In production, clicking "Connect Google" would launch the OAuth2 flow. Here, paste an
            access token obtained from your OAuth2 provider to link the account.
          </AlertDescription>
        </Alert>
        <div className="space-y-4 py-2">
          <div>
            <Label>Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as 'google' | 'microsoft')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google (Gmail + Calendar)</SelectItem>
                <SelectItem value="microsoft">Microsoft (Outlook + Exchange)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Account Email</Label>
            <Input placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>OAuth2 Access Token</Label>
            <Input type="password" placeholder="ya29.…" value={token} onChange={e => setToken(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => connectMut.mutate()} disabled={!token || connectMut.isPending}>
            {connectMut.isPending ? 'Connecting…' : 'Connect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Sync Demo Dialog ───────────────────────────────────────────────────────────

function SyncDialog({
  open, onClose, type,
}: { open: boolean; onClose: () => void; type: 'calendar' | 'email' }) {
  const [provider, setProvider] = useState<'google' | 'microsoft'>('google');
  const [payload, setPayload] = useState('');
  const { toast } = useToast();
  const qc = useQueryClient();

  const sampleCalendar = JSON.stringify([{
    id: 'evt_001', summary: 'Product Demo Call', description: 'Quarterly demo with Acme Corp',
    start: { dateTime: new Date(Date.now() + 86400_000).toISOString() },
    end: { dateTime: new Date(Date.now() + 90_000_000).toISOString() },
    attendees: [{ email: 'john@acme.com' }, { email: 'sarah@acme.com' }],
    location: 'Zoom',
  }], null, 2);

  const sampleEmail = JSON.stringify([{
    id: 'msg_001', subject: 'Re: Proposal Review', direction: 'inbound',
    from: 'john@acme.com', to: ['me@company.com'],
    body_snippet: 'Thanks for the proposal. We'd like to move forward…',
    sent_at: new Date().toISOString(),
  }], null, 2);

  const syncMut = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(payload);
      const res = await fetch(`/api/crm-calendar/sync/${type}`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ provider, [type === 'calendar' ? 'events' : 'emails']: parsed }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      return res.json();
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['crm-activities'] });
      toast({ title: 'Sync complete', description: `${d.synced} activities synced` });
      onClose();
    },
    onError: (e: Error) => toast({ title: 'Sync failed', description: e.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{type === 'calendar' ? 'Sync Calendar Events' : 'Sync Email Activity'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as 'google' | 'microsoft')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="microsoft">Microsoft</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>{type === 'calendar' ? 'Events JSON' : 'Emails JSON'}</Label>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPayload(type === 'calendar' ? sampleCalendar : sampleEmail)}>
                Load sample
              </Button>
            </div>
            <textarea
              className="w-full h-40 rounded border bg-muted/30 p-2 text-xs font-mono resize-none"
              placeholder={`Paste ${type === 'calendar' ? 'calendar events' : 'email messages'} JSON array…`}
              value={payload}
              onChange={e => setPayload(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => syncMut.mutate()} disabled={!payload || syncMut.isPending}>
            {syncMut.isPending ? 'Syncing…' : 'Sync'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CalendarSync() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [connectOpen, setConnectOpen] = useState(false);
  const [syncDialog, setSyncDialog] = useState<'calendar' | 'email' | null>(null);

  const { data: connsData } = useQuery({
    queryKey: ['crm-connections'],
    queryFn: async () => {
      const res = await fetch('/api/crm-calendar/connections', { headers: authHeader() });
      if (!res.ok) throw new Error('Failed to load connections');
      return res.json();
    },
  });

  const { data: activitiesData } = useQuery({
    queryKey: ['crm-activities'],
    queryFn: async () => {
      const res = await fetch('/api/crm-calendar/activities?limit=100', { headers: authHeader() });
      if (!res.ok) throw new Error('Failed to load activities');
      return res.json();
    },
  });

  const { data: eventsData } = useQuery({
    queryKey: ['crm-events'],
    queryFn: async () => {
      const res = await fetch('/api/crm-calendar/events?days=14', { headers: authHeader() });
      if (!res.ok) throw new Error('Failed to load events');
      return res.json();
    },
  });

  const revokeMut = useMutation({
    mutationFn: async (provider: string) => {
      const res = await fetch(`/api/crm-calendar/connect/${provider}`, { method: 'DELETE', headers: authHeader() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-connections'] }); toast({ title: 'Disconnected' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const connections: Connection[] = connsData?.connections ?? [];
  const activities: Activity[] = activitiesData?.activities ?? [];
  const events: Activity[] = eventsData?.events ?? [];

  const emailActivities = activities.filter(a => a.activity_type === 'email');
  const meetingActivities = activities.filter(a => a.activity_type === 'meeting');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />CRM Email & Calendar Sync
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect Google or Microsoft accounts to auto-log meetings and emails against CRM contacts.
          </p>
        </div>
        <Button onClick={() => setConnectOpen(true)}>
          <Plug className="h-4 w-4 mr-2" />Connect Account
        </Button>
      </div>

      {/* Connected accounts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts connected. Click "Connect Account" to get started.</p>
          ) : (
            <div className="space-y-2">
              {connections.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded border">
                  <div className="flex items-center gap-3">
                    {c.status === 'active'
                      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                      : <XCircle className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <p className="font-medium text-sm capitalize">{c.provider} — {c.account_email ?? 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        Connected {format(new Date(c.connected_at), 'MMM d, yyyy')}
                        {c.last_synced_at && ` · Last sync ${format(new Date(c.last_synced_at), 'MMM d HH:mm')}`}
                      </p>
                    </div>
                    <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSyncDialog('calendar')}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />Calendar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSyncDialog('email')}>
                      <Mail className="h-3.5 w-3.5 mr-1" />Email
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => revokeMut.mutate(c.provider)}>
                      Disconnect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Meetings Synced</p>
            <p className="text-3xl font-bold">{meetingActivities.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Emails Logged</p>
            <p className="text-3xl font-bold">{emailActivities.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Upcoming Events (14d)</p>
            <p className="text-3xl font-bold">{events.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="activities"><Mail className="h-3.5 w-3.5 mr-1.5" />Activity Log</TabsTrigger>
          <TabsTrigger value="upcoming"><Calendar className="h-3.5 w-3.5 mr-1.5" />Upcoming</TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No synced activities. Connect an account and sync to populate.</TableCell></TableRow>
                  )}
                  {activities.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{a.activity_type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="font-medium text-sm truncate">{a.subject}</p>
                        {a.description && <p className="text-xs text-muted-foreground truncate">{a.description}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(a.contacts_matched ?? []).map(c => (
                            <Badge key={c.id} variant="secondary" className="text-xs">{c.name || c.email}</Badge>
                          ))}
                          {(a.contacts_matched ?? []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">{a.source}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.start_time ? format(new Date(a.start_time), 'MMM d, yyyy') : format(new Date(a.synced_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meeting</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No upcoming events in the next 14 days.</TableCell></TableRow>
                  )}
                  {events.map(e => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{e.subject}</p>
                        {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(e.contacts_matched ?? []).map(c => (
                            <Badge key={c.id} variant="secondary" className="text-xs">{c.name || c.email}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-xs">{e.source}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {e.start_time ? format(new Date(e.start_time), 'MMM d, yyyy HH:mm') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConnectDialog open={connectOpen} onClose={() => setConnectOpen(false)} />
      {syncDialog && <SyncDialog open type={syncDialog} onClose={() => setSyncDialog(null)} />}
    </div>
  );
}
