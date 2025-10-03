import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, UserPlus, Search, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'admin' | 'manager' | 'technician' | 'customer';

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('customer');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchProfiles();
  }, []);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const fetchProfiles = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch roles for each profile
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const profilesWithRoles = profilesData?.map(profile => ({
        ...profile,
        roles: rolesData?.filter(r => r.user_id === profile.id) || []
      })) || [];

      setProfiles(profilesWithRoles);
    } catch (error: any) {
      toast({
        title: 'Error loading profiles',
        description: error.message,
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
      const { error } = await supabase
        .from('user_roles')
        .insert([{
          user_id: selectedProfile,
          role: selectedRole,
        }]);

      if (error) throw error;

      toast({
        title: 'Role assigned',
        description: 'User role has been updated successfully',
      });

      fetchProfiles();
      setSelectedProfile('');
      setSelectedRole('customer');
    } catch (error: any) {
      toast({
        title: 'Error assigning role',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const removeRole = async (userId: string, roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: 'Role removed',
        description: 'User role has been removed successfully',
      });

      fetchProfiles();
    } catch (error: any) {
      toast({
        title: 'Error removing role',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'manager':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'technician':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">User settings and preferences</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Admin access required to manage user roles.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage user roles and permissions</p>
      </div>

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
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
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
                        profile.roles.map((roleEntry: any) => (
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
              <Badge variant="outline" className={getRoleBadgeColor('admin')}>Admin</Badge>
              <span className="text-muted-foreground">Full system access, manage users, penalties, inventory</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getRoleBadgeColor('manager')}>Manager</Badge>
              <span className="text-muted-foreground">Create tickets, work orders, manage validations</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getRoleBadgeColor('technician')}>Technician</Badge>
              <span className="text-muted-foreground">Upload photos, update assigned work orders</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getRoleBadgeColor('customer')}>Customer</Badge>
              <span className="text-muted-foreground">View tickets and work orders</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
