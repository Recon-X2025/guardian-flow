import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, UserPlus, Search, Trash2, Globe, User, ShieldCheck, ShieldOff, Lock } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { useAuth } from '@/domains/auth/contexts/AuthContext';
import { AppRole, useRBAC } from '@/domains/auth/contexts/RBACContext';
import { useCurrency } from '@/domains/shared/hooks/useCurrency';

const COUNTRIES = [
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'EU', name: 'European Union', currency: 'EUR' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'CN', name: 'China', currency: 'CNY' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'MX', name: 'Mexico', currency: 'MXN' },
];

interface UserRole {
  id: string;
  user_id: string;
  role: string;
}

interface UserProfile {
  id: string;
  full_name?: string;
  email?: string;
  roles: UserRole[];
}

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const rbac = useRBAC();
  const { currencyInfo, updateCurrency, exchangeRates, ratesLoading, refreshRates } = useCurrency();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('customer');
  const [selectedCountry, setSelectedCountry] = useState<string>(currencyInfo.country);

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [disablingMfa, setDisablingMfa] = useState(false);

  const fetchMfaStatus = useCallback(async () => {
    setMfaLoading(true);
    try {
      const res = await apiClient.request<{ mfa_enabled: boolean }>('/api/auth/mfa/status', { method: 'GET' });
      if (!res.error && res.data) {
        setMfaEnabled(res.data.mfa_enabled);
      }
    } catch {
      // silently ignore — MFA status is optional
    } finally {
      setMfaLoading(false);
    }
  }, []);

  const disableMfa = async () => {
    setDisablingMfa(true);
    try {
      const res = await apiClient.request('/api/auth/mfa/disable', { method: 'POST' });
      if (res.error) throw new Error(res.error.message);
      setMfaEnabled(false);
      toast({ title: 'MFA disabled', description: 'Two-factor authentication has been turned off.' });
    } catch (err: unknown) {
      toast({
        title: 'Failed to disable MFA',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDisablingMfa(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchMfaStatus();
  }, [fetchMfaStatus]);

  const fetchProfiles = async () => {
    try {
      const profilesResult = await apiClient.from('profiles')
        .select('*')
        .order('full_name');

      if (profilesResult.error) throw profilesResult.error;
      const profilesData = profilesResult.data || [];

      // Fetch roles for each profile
      const rolesResult = await apiClient.from('user_roles')
        .select('*');

      if (rolesResult.error) throw rolesResult.error;
      const rolesData = rolesResult.data || [];

      const profilesWithRoles: UserProfile[] = profilesData.map(profile => ({
        ...profile,
        roles: (rolesData as UserRole[]).filter(r => r.user_id === profile.id)
      })) || [];

      setProfiles(profilesWithRoles);
    } catch (error: unknown) {
      toast({
        title: 'Error loading profiles',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async () => {
    if (!selectedProfile || !selectedRole) {
      toast({
        title: 'Missing information',
        description: 'Please select a user and role',
        variant: 'destructive',
      });
      return;
    }

    try {
      const insertResult = apiClient.from('user_roles').insert([{
        user_id: selectedProfile,
        role: selectedRole,
      }]);
      const result = await insertResult;
      const error = result.error;

      if (error) throw error;

      toast({
        title: 'Role assigned',
        description: 'User role has been updated successfully',
      });

      fetchProfiles();
      setSelectedProfile('');
      setSelectedRole('customer');
    } catch (error: unknown) {
      toast({
        title: 'Error assigning role',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const removeRole = async (userId: string, roleId: string) => {
    try {
      const deleteResult = apiClient.from('user_roles')
        .delete()
        .eq('id', roleId);
      const result = await deleteResult;
      const error = result.error;

      if (error) throw error;

      toast({
        title: 'Role removed',
        description: 'User role has been removed successfully',
      });

      fetchProfiles();
    } catch (error: unknown) {
      toast({
        title: 'Error removing role',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'sys_admin':
      case 'tenant_admin':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'ops_manager':
      case 'finance_manager':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'technician':
      case 'dispatcher':
        return 'bg-success/10 text-success border-success/20';
      case 'fraud_investigator':
      case 'auditor':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'customer':
      case 'guest':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-accent/10 text-accent border-accent/20';
    }
  };

  const handleCountryChange = async () => {
    const result = await updateCurrency(selectedCountry);
    if (result?.success) {
      toast({
        title: 'Preferences updated',
        description: `Currency set to ${COUNTRIES.find(c => c.code === selectedCountry)?.currency}`,
      });
    } else {
      toast({
        title: 'Update failed',
        description: result?.error || 'Failed to update preferences',
        variant: 'destructive',
      });
    }
  };

  const personalSettingsSection = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Personal Preferences
        </CardTitle>
        <CardDescription>Configure your regional and currency settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="country">Country / Region</Label>
          <div className="flex gap-2">
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger id="country" className="flex-1">
                <SelectValue placeholder="Select country..." />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map(country => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name} ({country.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleCountryChange}>
              Save
            </Button>
          </div>
        </div>
        <div className="pt-3 border-t space-y-3">
          <div className="text-sm text-muted-foreground">
            <p><strong>Current Settings:</strong></p>
            <p>Country: {COUNTRIES.find(c => c.code === currencyInfo.country)?.name || currencyInfo.country}</p>
            <p>Currency: {currencyInfo.code} ({currencyInfo.symbol})</p>
          </div>
          {currencyInfo.code !== 'USD' && exchangeRates[currencyInfo.code] && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-semibold">Live Exchange Rate</p>
                  <p className="text-muted-foreground">
                    1 USD = {exchangeRates[currencyInfo.code]?.toFixed(4)} {currencyInfo.code}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All amounts are stored in USD and converted in real-time
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={refreshRates}
                  disabled={ratesLoading}
                >
                  {ratesLoading ? 'Refreshing...' : 'Refresh Rate'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const securitySection = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Security
        </CardTitle>
        <CardDescription>Manage two-factor authentication and account security</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Two-Factor Authentication (MFA)</div>
            <div className="text-xs text-muted-foreground">
              Add an extra layer of security to your account using an authenticator app.
            </div>
          </div>
          {mfaLoading ? (
            <Badge variant="outline">Checking…</Badge>
          ) : mfaEnabled === true ? (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Enabled
            </Badge>
          ) : mfaEnabled === false ? (
            <Badge variant="outline" className="text-muted-foreground">
              <ShieldOff className="h-3 w-3 mr-1" />
              Disabled
            </Badge>
          ) : (
            <Badge variant="outline">Unknown</Badge>
          )}
        </div>

        <div className="flex gap-2">
          {mfaEnabled !== true && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/auth/mfa/enroll')}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Enable MFA
            </Button>
          )}
          {mfaEnabled === true && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={disableMfa}
              disabled={disablingMfa}
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              {disablingMfa ? 'Disabling…' : 'Disable MFA'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!rbac.isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">User settings and preferences</p>
        </div>
        <Tabs defaultValue="preferences">
          <TabsList>
            <TabsTrigger value="preferences">
              <Globe className="h-4 w-4 mr-1.5" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="h-4 w-4 mr-1.5" />
              Security
            </TabsTrigger>
          </TabsList>
          <TabsContent value="preferences" className="mt-4">
            {personalSettingsSection}
          </TabsContent>
          <TabsContent value="security" className="mt-4">
            {securitySection}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage user roles and permissions</p>
      </div>

      <Tabs defaultValue="preferences">
        <TabsList>
          <TabsTrigger value="preferences">
            <Globe className="h-4 w-4 mr-1.5" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-1.5" />
            Security
          </TabsTrigger>
          <TabsTrigger value="admin">
            <Shield className="h-4 w-4 mr-1.5" />
            Admin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="mt-4">
          {personalSettingsSection}
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          {securitySection}
        </TabsContent>

        <TabsContent value="admin" className="mt-4 space-y-6">
      {/* original admin content below */}

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Assign User Role
          </CardTitle>
          <CardDescription>Grant roles to users for RBAC access control</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select user..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
                <SelectItem value="dispatcher">Dispatcher</SelectItem>
                <SelectItem value="ops_manager">Ops Manager</SelectItem>
                <SelectItem value="finance_manager">Finance Manager</SelectItem>
                <SelectItem value="fraud_investigator">Fraud Investigator</SelectItem>
                <SelectItem value="billing_agent">Billing Agent</SelectItem>
                <SelectItem value="support_agent">Support Agent</SelectItem>
                <SelectItem value="partner_user">Partner User</SelectItem>
                <SelectItem value="partner_admin">Partner Admin</SelectItem>
                <SelectItem value="product_owner">Product Owner</SelectItem>
                <SelectItem value="ml_ops">ML Ops</SelectItem>
                <SelectItem value="auditor">Auditor</SelectItem>
                <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                <SelectItem value="sys_admin">System Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={assignRole}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Roles</CardTitle>
              <CardDescription>Manage user permissions and access</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            <div className="space-y-3">
              {profiles.map(profile => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{profile.full_name || 'No name'}</div>
                    <div className="text-sm text-muted-foreground">{profile.email}</div>
                    <div className="flex gap-2 mt-2">
                      {profile.roles.length === 0 ? (
                        <Badge variant="outline">No roles assigned</Badge>
                      ) : (
                        profile.roles.map((roleEntry) => (
                          <Badge
                            key={roleEntry.id}
                            variant="outline"
                            className={getRoleBadgeColor(roleEntry.role)}
                          >
                            {roleEntry.role}
                            <button
                              onClick={() => removeRole(profile.id, roleEntry.id)}
                              className="ml-2 hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-warning/5 border-warning/20">
        <CardHeader>
          <CardTitle>Role Hierarchy</CardTitle>
          <CardDescription>Understanding permission levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getRoleBadgeColor('sys_admin')}>System Admin</Badge>
              <span className="text-muted-foreground">Platform operator with global access</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getRoleBadgeColor('tenant_admin')}>Tenant Admin</Badge>
              <span className="text-muted-foreground">Tenant owner, manage users and config</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getRoleBadgeColor('ops_manager')}>Ops Manager</Badge>
              <span className="text-muted-foreground">Manage WO, overrides, operator dashboards</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getRoleBadgeColor('finance_manager')}>Finance Manager</Badge>
              <span className="text-muted-foreground">Invoices, settlements, penalties, payouts</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getRoleBadgeColor('technician')}>Technician</Badge>
              <span className="text-muted-foreground">Field engineer, WO execution, photo capture</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getRoleBadgeColor('customer')}>Customer</Badge>
              <span className="text-muted-foreground">View tickets, service orders, invoices</span>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
