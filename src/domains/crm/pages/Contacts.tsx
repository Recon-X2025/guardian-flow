import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Search, UserRound, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Account { id: string; company_name: string; }

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  title?: string;
  account_id?: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
}

type ContactForm = Omit<Contact, 'id' | 'created_at'>;

const EMPTY_FORM: ContactForm = {
  first_name: '', last_name: '', email: '', phone: '',
  title: '', account_id: '', is_primary: false, notes: '',
};

// ── API helpers ───────────────────────────────────────────────────────────────

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchContacts(accountId?: string): Promise<Contact[]> {
  const url = accountId ? `/api/crm/contacts?account_id=${accountId}` : '/api/crm/contacts';
  const res = await fetch(url, { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch contacts');
  return (await res.json()).contacts ?? [];
}

async function fetchAccounts(): Promise<Account[]> {
  const res = await fetch('/api/crm/accounts', { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch accounts');
  return (await res.json()).accounts ?? [];
}

async function createContact(form: ContactForm): Promise<Contact> {
  const body = { ...form, account_id: form.account_id || undefined };
  const res  = await fetch('/api/crm/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to create contact');
  return (await res.json()).contact;
}

async function updateContact(id: string, form: Partial<ContactForm>): Promise<Contact> {
  const res = await fetch(`/api/crm/contacts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(form),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to update contact');
  return (await res.json()).contact;
}

async function deleteContact(id: string): Promise<void> {
  const res = await fetch(`/api/crm/contacts/${id}`, { method: 'DELETE', headers: authHeader() });
  if (!res.ok) throw new Error('Failed to delete contact');
}

// ── ContactDialog ─────────────────────────────────────────────────────────────

function ContactDialog({
  open, onClose, existing, accounts,
}: {
  open: boolean; onClose: () => void; existing?: Contact | null; accounts: Account[];
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<ContactForm>(
    existing
      ? {
          first_name: existing.first_name, last_name: existing.last_name,
          email: existing.email ?? '', phone: existing.phone ?? '',
          title: existing.title ?? '', account_id: existing.account_id ?? '',
          is_primary: existing.is_primary, notes: existing.notes ?? '',
        }
      : EMPTY_FORM,
  );

  const set = (k: keyof ContactForm, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const createMut = useMutation({
    mutationFn: createContact,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-contacts'] }); toast({ title: 'Contact created' }); onClose(); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<ContactForm> }) => updateContact(id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-contacts'] }); toast({ title: 'Contact updated' }); onClose(); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  function handleSubmit() {
    if (!form.first_name.trim() || !form.last_name.trim())
      return toast({ title: 'first_name and last_name are required', variant: 'destructive' });
    if (existing) updateMut.mutate({ id: existing.id, form });
    else createMut.mutate(form);
  }
  const busy = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{existing ? 'Edit Contact' : 'New Contact'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label>First Name *</Label>
            <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} />
          </div>
          <div>
            <Label>Last Name *</Label>
            <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. CEO" />
          </div>
          <div>
            <Label>Account</Label>
            <Select value={form.account_id || '__none__'} onValueChange={v => set('account_id', v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="is_primary"
              checked={form.is_primary}
              onChange={e => set('is_primary', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="is_primary">Primary contact for account</Label>
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy}>{busy ? 'Saving…' : existing ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Contacts page ─────────────────────────────────────────────────────────────

export default function Contacts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch]     = useState('');
  const [dialogOpen, setDialog] = useState(false);
  const [editing, setEditing]   = useState<Contact | null>(null);

  const { data: contacts = [], isLoading } = useQuery({ queryKey: ['crm-contacts'], queryFn: () => fetchContacts() });
  const { data: accounts = [] }            = useQuery({ queryKey: ['crm-accounts'], queryFn: fetchAccounts });

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.company_name]));

  const deleteMut = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-contacts'] }); toast({ title: 'Contact deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const filtered = contacts.filter(c =>
    !search ||
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserRound className="h-6 w-6" /> Contacts</h1>
          <p className="text-muted-foreground text-sm">People linked to accounts and deals</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Contact
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <span className="ml-auto text-sm text-muted-foreground">{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No contacts found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.first_name} {c.last_name}
                      {c.is_primary && <Badge variant="secondary" className="ml-2 text-xs">Primary</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{c.title ?? '—'}</TableCell>
                    <TableCell className="text-sm">{c.account_id ? accountMap[c.account_id] ?? c.account_id : '—'}</TableCell>
                    <TableCell className="text-sm">{c.email ?? '—'}</TableCell>
                    <TableCell className="text-sm">{c.phone ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setDialog(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteMut.mutate(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ContactDialog
        open={dialogOpen}
        onClose={() => setDialog(false)}
        existing={editing}
        accounts={accounts}
      />
    </div>
  );
}
