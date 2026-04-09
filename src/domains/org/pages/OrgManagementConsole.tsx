import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { useAuth } from '@/domains/auth/contexts/AuthContext';
import { useRBAC } from '@/domains/auth/contexts/RBACContext';
import { apiClient } from '@/integrations/api/client';
import {
  Building2, Users, Settings, Shield, CreditCard, Plus,
  Pencil, Trash2, UserPlus, RefreshCw, Save, Globe, Phone,
  Mail, MapPin, Clock, ChevronRight, CheckCircle, AlertCircle,
  Crown, Search,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Org {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: Record<string, string>;
  timezone: string;
  locale: string;
  plan: string;
  logo_url: string | null;
  active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  active: boolean;
  joined_at: string;
  roles: string[];
}

const INDUSTRIES = [
  'Manufacturing', 'Telecommunications', 'Energy & Utilities', 'Retail',
  'Logistics & Transportation', 'Facility Management', 'Construction', 'Healthcare', 'Other',
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney',
];

const MEMBER_ROLES = [
  { value: 'tenant_admin',      label: 'Org Admin' },
  { value: 'ops_manager',       label: 'Operations Manager' },
  { value: 'finance_manager',   label: 'Finance Manager' },
  { value: 'dispatcher',        label: 'Dispatcher' },
  { value: 'technician',        label: 'Technician' },
  { value: 'support_agent',     label: 'Support Agent' },
  { value: 'fraud_investigator',label: 'Fraud Investigator' },
  { value: 'auditor',           label: 'Auditor' },
  { value: 'billing_agent',     label: 'Billing Agent' },
  { value: 'customer',          label: 'Customer (Read-only)' },
];

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  starter:    { label: 'Starter',    color: 'secondary' },
  growth:     { label: 'Growth',     color: 'default' },
  enterprise: { label: 'Enterprise', color: 'default' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const roleLabel = (role: string) => MEMBER_ROLES.find(r => r.value === role)?.label ?? role;
const planInfo  = (plan: string) => PLAN_LABELS[plan] ?? { label: plan, color: 'secondary' };

// ---------------------------------------------------------------------------
// Create Org Dialog (sys_admin only)
// ---------------------------------------------------------------------------
interface CreateOrgDialogProps {
  onCreated: () => void;
}

function CreateOrgDialog({ onCreated }: CreateOrgDialogProps) {
  const { toast } = useToast();
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ name: '', slug: '', industry: '', email: '', plan: 'starter' });

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSubmit = async () => {
    if (!form.name || !form.slug) {
      toast({ title: 'Name and slug are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${(import.meta.env.VITE_API_URL as string) || 'http://localhost:3001'}/api/org`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiClient.getToken()}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { org?: Org; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to create organisation');
      toast({ title: `Organisation "${data.org!.name}" created` });
      setOpen(false);
      setForm({ name: '', slug: '', industry: '', email: '', plan: 'starter' });
      onCreated();
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Organisation</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Organisation</DialogTitle>
          <DialogDescription>Onboard a new organisation to the platform.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Organisation Name *</Label>
            <Input
              placeholder="Acme Corp"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Slug * <span className="text-xs text-muted-foreground">(URL-safe identifier)</span></Label>
            <Input
              placeholder="acme-corp"
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Industry</Label>
            <Select value={form.industry} onValueChange={v => setForm(f => ({ ...f, industry: v }))}>
              <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
              <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Billing Email</Label>
            <Input type="email" placeholder="billing@acme.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Plan</Label>
            <Select value={form.plan} onValueChange={v => setForm(f => ({ ...f, plan: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Invite Member Dialog
// ---------------------------------------------------------------------------
interface InviteMemberDialogProps {
  orgId: string;
  onInvited: () => void;
}

function InviteMemberDialog({ orgId, onInvited }: InviteMemberDialogProps) {
  const { toast }               = useToast();
  const [open, setOpen]         = useState(false);
  const [saving, setSaving]     = useState(false);
  const [email, setEmail]       = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole]         = useState('technician');

  const handleSubmit = async () => {
    if (!email) { toast({ title: 'Email required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const res = await fetch(
        `${(import.meta.env.VITE_API_URL as string) || 'http://localhost:3001'}/api/org/${orgId}/members/invite`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiClient.getToken()}` },
          body: JSON.stringify({ email, full_name: fullName, role }),
        },
      );
      const data = await res.json() as { invite?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Invite failed');
      toast({ title: `Invite sent to ${email}` });
      setOpen(false);
      setEmail(''); setFullName(''); setRole('technician');
      onInvited();
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><UserPlus className="h-4 w-4 mr-2" />Invite Member</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>Send an invitation to join your organisation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Email Address *</Label>
            <Input type="email" placeholder="jane@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Full Name <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input placeholder="Jane Smith" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEMBER_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Send Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main MAC page
// ---------------------------------------------------------------------------
export default function OrgManagementConsole() {
  const { toast }             = useToast();
  const { user }              = useAuth();
  const rbac                  = useRBAC();
  const isSysAdmin            = rbac.hasRole('sys_admin');
  const isTenantAdmin         = rbac.isTenantAdmin;

  const [orgs, setOrgs]           = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [members, setMembers]     = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');

  // Editable org profile fields
  const [profile, setProfile] = useState({
    name: '', email: '', phone: '', website: '', industry: '',
    timezone: 'UTC', locale: 'en',
    address_street: '', address_city: '', address_state: '', address_country: '',
    logo_url: '',
  });

  const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';
  const authHeader = { Authorization: `Bearer ${apiClient.getToken()}` };

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  const loadOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/org?search=${encodeURIComponent(search)}`, { headers: authHeader });
      const data = await res.json() as { orgs?: Org[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load organisations');
      setOrgs(data.orgs ?? []);
      if (data.orgs?.length && !selectedOrg) setSelectedOrg(data.orgs[0]);
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const loadMembers = useCallback(async (orgId: string) => {
    try {
      const res  = await fetch(`${API}/api/org/${orgId}/members`, { headers: authHeader });
      const data = await res.json() as { members?: Member[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load members');
      setMembers(data.members ?? []);
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'destructive' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  useEffect(() => {
    if (!selectedOrg) return;
    setProfile({
      name:             selectedOrg.name,
      email:            selectedOrg.email            ?? '',
      phone:            selectedOrg.phone            ?? '',
      website:          selectedOrg.website          ?? '',
      industry:         selectedOrg.industry         ?? '',
      timezone:         selectedOrg.timezone         ?? 'UTC',
      locale:           selectedOrg.locale           ?? 'en',
      address_street:   selectedOrg.address?.street  ?? '',
      address_city:     selectedOrg.address?.city    ?? '',
      address_state:    selectedOrg.address?.state   ?? '',
      address_country:  selectedOrg.address?.country ?? '',
      logo_url:         selectedOrg.logo_url         ?? '',
    });
    loadMembers(selectedOrg.id);
  }, [selectedOrg, loadMembers]);

  // ---------------------------------------------------------------------------
  // Save profile
  // ---------------------------------------------------------------------------
  const saveProfile = async () => {
    if (!selectedOrg) return;
    setSaving(true);
    try {
      const body = {
        name:       profile.name,
        email:      profile.email      || null,
        phone:      profile.phone      || null,
        website:    profile.website    || null,
        industry:   profile.industry   || null,
        timezone:   profile.timezone,
        locale:     profile.locale,
        logo_url:   profile.logo_url   || null,
        address: {
          street:  profile.address_street,
          city:    profile.address_city,
          state:   profile.address_state,
          country: profile.address_country,
        },
      };
      const res  = await fetch(`${API}/api/org/${selectedOrg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { org?: Org; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setSelectedOrg(data.org!);
      setOrgs(orgs.map(o => o.id === data.org!.id ? data.org! : o));
      toast({ title: 'Organisation profile saved' });
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Member actions
  // ---------------------------------------------------------------------------
  const removeMember = async (uid: string, name: string | null) => {
    if (!selectedOrg) return;
    if (!window.confirm(`Remove ${name ?? uid} from this organisation?`)) return;
    try {
      const res  = await fetch(`${API}/api/org/${selectedOrg.id}/members/${uid}`, {
        method: 'DELETE', headers: authHeader,
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Remove failed');
      toast({ title: `${name ?? uid} removed` });
      loadMembers(selectedOrg.id);
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'destructive' });
    }
  };

  const changeMemberRole = async (uid: string, newRole: string) => {
    if (!selectedOrg) return;
    try {
      const res  = await fetch(`${API}/api/org/${selectedOrg.id}/members/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Role update failed');
      toast({ title: 'Role updated' });
      loadMembers(selectedOrg.id);
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'destructive' });
    }
  };

  const toggleMemberActive = async (uid: string, current: boolean) => {
    if (!selectedOrg) return;
    try {
      const res  = await fetch(`${API}/api/org/${selectedOrg.id}/members/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ active: !current }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Status update failed');
      toast({ title: `Member ${!current ? 'activated' : 'deactivated'}` });
      loadMembers(selectedOrg.id);
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'destructive' });
    }
  };

  // ---------------------------------------------------------------------------
  // Access guard
  // ---------------------------------------------------------------------------
  if (!isSysAdmin && !isTenantAdmin) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center space-y-2">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium">Access Restricted</p>
            <p className="text-sm text-muted-foreground">Organisation Management Console requires Org Admin access.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Organisation Console
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isSysAdmin ? 'Manage all organisations on the platform' : 'Manage your organisation'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadOrgs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
          {isSysAdmin && <CreateOrgDialog onCreated={loadOrgs} />}
        </div>
      </div>

      {/* Org picker (sys_admin only) */}
      {isSysAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search organisations…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadOrgs()}
                />
              </div>
              <Button variant="outline" size="sm" onClick={loadOrgs}>Search</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading organisations…</p>
            ) : orgs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No organisations found.</p>
            ) : (
              <div className="divide-y">
                {orgs.map(org => (
                  <button
                    key={org.id}
                    className={`w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors rounded ${selectedOrg?.id === org.id ? 'bg-muted' : ''}`}
                    onClick={() => setSelectedOrg(org)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{org.name}</p>
                        <p className="text-xs text-muted-foreground">{org.slug} · {org.industry ?? 'No industry'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={org.active ? 'default' : 'destructive'} className="text-xs">
                        {org.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs capitalize">{planInfo(org.plan).label}</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail panel */}
      {selectedOrg && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {selectedOrg.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold">{selectedOrg.name}</h2>
              <p className="text-xs text-muted-foreground">{selectedOrg.slug}</p>
            </div>
            <Badge variant={selectedOrg.active ? 'default' : 'destructive'} className="ml-auto">
              {selectedOrg.active ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* ---- OVERVIEW ---- */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Users className="h-4 w-4" />Members</div>
                  <p className="text-2xl font-bold">{members.length}</p>
                  <p className="text-xs text-muted-foreground">{members.filter(m => m.active).length} active</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Crown className="h-4 w-4" />Plan</div>
                  <p className="text-2xl font-bold capitalize">{selectedOrg.plan}</p>
                  <p className="text-xs text-muted-foreground">Current billing plan</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Globe className="h-4 w-4" />Industry</div>
                  <p className="text-lg font-semibold">{selectedOrg.industry ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">Sector</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Clock className="h-4 w-4" />Timezone</div>
                  <p className="text-sm font-semibold">{selectedOrg.timezone}</p>
                  <p className="text-xs text-muted-foreground">Org timezone</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Contact</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {selectedOrg.email   && <div className="flex gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{selectedOrg.email}</div>}
                  {selectedOrg.phone   && <div className="flex gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{selectedOrg.phone}</div>}
                  {selectedOrg.website && <div className="flex gap-2"><Globe className="h-4 w-4 text-muted-foreground" />{selectedOrg.website}</div>}
                  {selectedOrg.address?.city && (
                    <div className="flex gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />
                      {[selectedOrg.address.street, selectedOrg.address.city, selectedOrg.address.state, selectedOrg.address.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {!selectedOrg.email && !selectedOrg.phone && <p className="text-muted-foreground">No contact details set.</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" variant="outline" size="sm" onClick={() => setActiveTab('profile')}>
                    <Pencil className="h-4 w-4 mr-2" />Edit Organisation Profile
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="sm" onClick={() => setActiveTab('members')}>
                    <UserPlus className="h-4 w-4 mr-2" />Invite Team Member
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="sm" onClick={() => setActiveTab('billing')}>
                    <CreditCard className="h-4 w-4 mr-2" />View Billing
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ---- PROFILE ---- */}
          <TabsContent value="profile" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Organisation Profile</CardTitle>
                <CardDescription>Update your organisation's details and contact information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Basic info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Organisation Name *</Label>
                    <Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Industry</Label>
                    <Select value={profile.industry} onValueChange={v => setProfile(p => ({ ...p, industry: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Contact */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Billing Email</Label>
                    <Input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Website</Label>
                  <Input type="url" placeholder="https://example.com" value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} />
                </div>
                {/* Address */}
                <div className="space-y-1">
                  <Label>Street Address</Label>
                  <Input value={profile.address_street} onChange={e => setProfile(p => ({ ...p, address_street: e.target.value }))} />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>City</Label>
                    <Input value={profile.address_city} onChange={e => setProfile(p => ({ ...p, address_city: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>State / Region</Label>
                    <Input value={profile.address_state} onChange={e => setProfile(p => ({ ...p, address_state: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Country</Label>
                    <Input value={profile.address_country} onChange={e => setProfile(p => ({ ...p, address_country: e.target.value }))} />
                  </div>
                </div>
                {/* Locale */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Timezone</Label>
                    <Select value={profile.timezone} onValueChange={v => setProfile(p => ({ ...p, timezone: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Logo URL</Label>
                    <Input placeholder="https://…/logo.png" value={profile.logo_url} onChange={e => setProfile(p => ({ ...p, logo_url: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={saveProfile} disabled={saving}>
                    {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- MEMBERS ---- */}
          <TabsContent value="members" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''}</p>
              <InviteMemberDialog orgId={selectedOrg.id} onInvited={() => loadMembers(selectedOrg.id)} />
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">No members found.</TableCell>
                      </TableRow>
                    ) : members.map(m => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                              {(m.full_name ?? m.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{m.full_name ?? '—'}</p>
                              <p className="text-xs text-muted-foreground">{m.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={m.roles[0] ?? 'customer'}
                            onValueChange={role => changeMemberRole(m.id, role)}
                            disabled={m.id === user?.id}
                          >
                            <SelectTrigger className="h-7 text-xs w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {MEMBER_ROLES.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {m.active
                              ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              : <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span className="text-xs">{m.active ? 'Active' : 'Inactive'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              disabled={m.id === user?.id}
                              title={m.active ? 'Deactivate' : 'Activate'}
                              onClick={() => toggleMemberActive(m.id, m.active)}
                            >
                              <Switch checked={m.active} className="scale-75 pointer-events-none" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                              disabled={m.id === user?.id}
                              title="Remove member"
                              onClick={() => removeMember(m.id, m.full_name)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- BILLING ---- */}
          <TabsContent value="billing" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Plan</CardTitle>
                <CardDescription>Your organisation's billing plan and usage overview.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Crown className="h-8 w-8 text-primary" />
                  <div className="flex-1">
                    <p className="font-semibold capitalize">{selectedOrg.plan} Plan</p>
                    <p className="text-sm text-muted-foreground">Active subscription</p>
                  </div>
                  <Badge className="capitalize">{planInfo(selectedOrg.plan).label}</Badge>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    { label: 'Users',       used: members.length, limit: selectedOrg.plan === 'starter' ? 10 : selectedOrg.plan === 'growth' ? 50 : 999 },
                    { label: 'Work Orders', used: '—',            limit: '—' },
                    { label: 'Storage',     used: '—',            limit: '—' },
                  ].map(item => (
                    <Card key={item.label} className="bg-muted/30">
                      <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-xl font-bold">{item.used}</p>
                        <p className="text-xs text-muted-foreground">of {item.limit === 999 ? 'Unlimited' : item.limit}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {isSysAdmin && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label>Change Plan (sys_admin)</Label>
                    <div className="flex gap-2">
                      <Select
                        value={selectedOrg.plan}
                        onValueChange={async plan => {
                          try {
                            const res = await fetch(`${API}/api/org/${selectedOrg.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', ...authHeader },
                              body: JSON.stringify({ plan }),
                            });
                            const data = await res.json() as { org?: Org; error?: string };
                            if (!res.ok) throw new Error(data.error ?? 'Update failed');
                            setSelectedOrg(data.org!);
                            toast({ title: 'Plan updated' });
                          } catch (err) {
                            toast({ title: (err as Error).message, variant: 'destructive' });
                          }
                        }}
                      >
                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="growth">Growth</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- SECURITY ---- */}
          <TabsContent value="security" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Security Settings</CardTitle>
                <CardDescription>Configure authentication and access controls for your organisation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  { key: 'require_mfa',         label: 'Require MFA',              desc: 'All members must enrol in multi-factor authentication.' },
                  { key: 'sso_enabled',          label: 'SSO Enabled',              desc: 'Allow members to sign in via your identity provider.' },
                  { key: 'enforce_ip_allowlist', label: 'Enforce IP Allowlist',     desc: 'Restrict logins to specific IP addresses.' },
                  { key: 'audit_logging',        label: 'Audit Logging',            desc: 'Log all admin actions to the compliance audit trail.' },
                ].map(item => {
                  const current = !!(selectedOrg.settings as Record<string, unknown>)?.[item.key];
                  return (
                    <div key={item.key} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={current}
                        onCheckedChange={async val => {
                          try {
                            const res = await fetch(`${API}/api/org/${selectedOrg.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', ...authHeader },
                              body: JSON.stringify({ settings: { ...selectedOrg.settings as object, [item.key]: val } }),
                            });
                            const data = await res.json() as { org?: Org; error?: string };
                            if (!res.ok) throw new Error(data.error ?? 'Update failed');
                            setSelectedOrg(data.org!);
                            toast({ title: `${item.label} ${val ? 'enabled' : 'disabled'}` });
                          } catch (err) {
                            toast({ title: (err as Error).message, variant: 'destructive' });
                          }
                        }}
                      />
                    </div>
                  );
                })}
                {((selectedOrg.settings as Record<string, unknown>)?.enforce_ip_allowlist) && (
                  <div className="space-y-1">
                    <Label>Allowed IP Ranges</Label>
                    <Textarea
                      placeholder="One CIDR per line, e.g. 192.168.1.0/24"
                      rows={4}
                      value={((selectedOrg.settings as Record<string, unknown>)?.ip_allowlist as string) ?? ''}
                      onChange={async e => {
                        const newSettings = { ...selectedOrg.settings as object, ip_allowlist: e.target.value };
                        setSelectedOrg({ ...selectedOrg, settings: newSettings });
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await fetch(`${API}/api/org/${selectedOrg.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', ...authHeader },
                            body: JSON.stringify({ settings: selectedOrg.settings }),
                          });
                          const data = await res.json() as { org?: Org; error?: string };
                          if (!res.ok) throw new Error(data.error ?? 'Save failed');
                          setSelectedOrg(data.org!);
                          toast({ title: 'IP allowlist saved' });
                        } catch (err) {
                          toast({ title: (err as Error).message, variant: 'destructive' });
                        }
                      }}
                    >
                      <Save className="h-3.5 w-3.5 mr-1" />Save Allowlist
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {isSysAdmin && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions — proceed with caution.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-destructive/30 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Deactivate Organisation</p>
                      <p className="text-xs text-muted-foreground">Suspends all access for this organisation's members.</p>
                    </div>
                    <Button
                      variant="destructive" size="sm"
                      onClick={async () => {
                        if (!window.confirm(`Deactivate "${selectedOrg.name}"? All members will lose access.`)) return;
                        try {
                          const res = await fetch(`${API}/api/org/${selectedOrg.id}`, {
                            method: 'DELETE', headers: authHeader,
                          });
                          const data = await res.json() as { message?: string; error?: string };
                          if (!res.ok) throw new Error(data.error ?? 'Failed');
                          toast({ title: `${selectedOrg.name} deactivated` });
                          loadOrgs();
                        } catch (err) {
                          toast({ title: (err as Error).message, variant: 'destructive' });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />Deactivate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {!loading && orgs.length === 0 && (
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center space-y-3">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium">No organisations yet</p>
            <p className="text-sm text-muted-foreground">
              {isSysAdmin ? 'Create the first organisation using the button above.' : 'Your account is not linked to an organisation.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
