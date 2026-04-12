import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Search, Building2, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  company_name: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  billing_address?: string;
  shipping_address?: string;
  assigned_rep_id?: string;
  notes?: string;
  created_at: string;
}

type AccountForm = Omit<Account, 'id' | 'created_at'>;

const EMPTY_FORM: AccountForm = {
  company_name: '',
  industry: '',
  website: '',
  email: '',
  phone: '',
  billing_address: '',
  shipping_address: '',
  notes: '',
};

// ── API helpers ───────────────────────────────────────────────────────────────

function authHeader() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchAccounts(): Promise<Account[]> {
  const res = await fetch('/api/crm/accounts', { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch accounts');
  const data = await res.json();
  return data.accounts ?? [];
}

async function createAccount(form: AccountForm): Promise<Account> {
  const res = await fetch('/api/crm/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(form),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to create account');
  }
  const data = await res.json();
  return data.account;
}

async function updateAccount(id: string, form: Partial<AccountForm>): Promise<Account> {
  const res = await fetch(`/api/crm/accounts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(form),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to update account');
  }
  const data = await res.json();
  return data.account;
}

async function deleteAccount(id: string): Promise<void> {
  const res = await fetch(`/api/crm/accounts/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete account');
}

// ── AccountDialog ─────────────────────────────────────────────────────────────

function AccountDialog({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: Account | null;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<AccountForm>(existing
    ? {
        company_name:     existing.company_name,
        industry:         existing.industry ?? '',
        website:          existing.website ?? '',
        email:            existing.email ?? '',
        phone:            existing.phone ?? '',
        billing_address:  existing.billing_address ?? '',
        shipping_address: existing.shipping_address ?? '',
        notes:            existing.notes ?? '',
      }
    : EMPTY_FORM,
  );

  const set = (k: keyof AccountForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  const createMut = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-accounts'] });
      toast({ title: 'Account created' });
      onClose();
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<AccountForm> }) => updateAccount(id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-accounts'] });
      toast({ title: 'Account updated' });
      onClose();
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  function handleSubmit() {
    if (!form.company_name.trim()) return toast({ title: 'company_name is required', variant: 'destructive' });
    if (existing) updateMut.mutate({ id: existing.id, form });
    else createMut.mutate(form);
  }

  const busy = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Account' : 'New Account'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label>Company Name *</Label>
            <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} />
          </div>
          <div>
            <Label>Industry</Label>
            <Input value={form.industry} onChange={e => set('industry', e.target.value)} />
          </div>
          <div>
            <Label>Website</Label>
            <Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Billing Address</Label>
            <Input value={form.billing_address} onChange={e => set('billing_address', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Shipping Address</Label>
            <Input value={form.shipping_address} onChange={e => set('shipping_address', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? 'Saving…' : existing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Accounts page ─────────────────────────────────────────────────────────────

export default function Accounts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch]     = useState('');
  const [dialogOpen, setDialog] = useState(false);
  const [editing, setEditing]   = useState<Account | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['crm-accounts'],
    queryFn: fetchAccounts,
  });

  const deleteMut = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-accounts'] });
      toast({ title: 'Account deleted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const filtered = accounts.filter(a =>
    !search || a.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (a.industry ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  function openNew() { setEditing(null); setDialog(true); }
  function openEdit(a: Account) { setEditing(a); setDialog(true); }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" /> Accounts</h1>
          <p className="text-muted-foreground text-sm">Company records linked to contacts and deals</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Account</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or industry…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <span className="ml-auto text-sm text-muted-foreground">{filtered.length} account{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No accounts found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.company_name}</TableCell>
                    <TableCell>
                      {a.industry ? <Badge variant="secondary">{a.industry}</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">{a.email ?? '—'}</TableCell>
                    <TableCell className="text-sm">{a.phone ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(a)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMut.mutate(a.id)}
                        >
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

      <AccountDialog
        open={dialogOpen}
        onClose={() => setDialog(false)}
        existing={editing}
      />
    </div>
  );
}
