import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Wrench, MapPin } from 'lucide-react';
import { TechnicianDialog } from '@/domains/shared/components/TechnicianDialog';
import { TechnicianMap } from '@/domains/shared/components/TechnicianMap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRBAC } from '@/domains/auth/contexts/RBACContext';

interface Technician {
  id: string;
  employee_id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  status?: string;
  certification_level?: string;
  certifications?: string[];
  specializations?: string[];
  availability?: string;
}

export default function Technicians() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const { tenantId, hasRole, loading: rbacLoading } = useRBAC();
  const isSysAdmin = hasRole('sys_admin');

  const { data: technicians, isLoading, refetch } = useQuery({
    queryKey: ['technicians', searchTerm, tenantId, isSysAdmin],
    enabled: !rbacLoading && (isSysAdmin || !!tenantId),
    queryFn: async () => {
      let query = apiClient
        .from('technicians')
        .select('*')
        .order('created_at', { ascending: false });

      // Only sys_admin sees all technicians, others filtered by tenant
      if (!isSysAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      // Note: apiClient doesn't support .or() with ilike, so we'll filter client-side for search
      const result = await query;
      if (result.error) throw result.error;
      
      let data = result.data || [];
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        data = data.filter((t: Technician) =>
          t.first_name?.toLowerCase().includes(searchLower) ||
          t.last_name?.toLowerCase().includes(searchLower) ||
          t.employee_id?.toLowerCase().includes(searchLower)
        );
      }
      
      return data;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success';
      case 'on_leave': return 'bg-warning';
      case 'inactive': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="h-8 w-8" />
            Field Force Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage technicians, skills, and field operations
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Technician
        </Button>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search technicians by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">Loading technicians...</div>
            ) : technicians && technicians.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Certifications</TableHead>
                    <TableHead>Specializations</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {technicians.map((tech: Technician) => (
                    <TableRow key={tech.id}>
                      <TableCell className="font-mono text-sm">
                        {tech.employee_id}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {tech.first_name} {tech.last_name}
                        </div>
                        {tech.certification_level && (
                          <div className="text-sm text-muted-foreground">
                            {tech.certification_level}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{tech.email}</div>
                          <div className="text-muted-foreground">{tech.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(tech.status)}>
                          {tech.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tech.certifications?.slice(0, 2).map((cert: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                          {tech.certifications?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{tech.certifications.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tech.specializations?.slice(0, 2).map((spec: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                          {tech.specializations?.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{tech.specializations.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTechnician(tech);
                            setDialogOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No technicians found. Add your first technician to get started.</p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="map">
          <Card className="p-6">
            <TechnicianMap technicians={technicians || []} />
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Technician Schedules</h2>
              <Badge variant="outline">Today: {new Date().toLocaleDateString()}</Badge>
            </div>
            {technicians && technicians.length > 0 ? (
              <div className="space-y-4">
                {technicians.map((tech: Technician) => (
                  <div key={tech.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Wrench className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{tech.full_name || `${tech.first_name || ''} ${tech.last_name || ''}`.trim() || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{tech.email}</p>
                        </div>
                      </div>
                      <Badge variant={tech.availability === 'available' ? 'default' : tech.availability === 'busy' ? 'secondary' : 'outline'}>
                        {tech.availability || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                        <div key={day} className={`text-center p-2 rounded text-xs ${idx < 5 ? 'bg-primary/10' : 'bg-muted'}`}>
                          <div className="font-medium">{day}</div>
                          <div className="text-muted-foreground">{idx < 5 ? '9-5' : 'Off'}</div>
                        </div>
                      ))}
                    </div>
                    {tech.skills && tech.skills.length > 0 && (
                      <div className="mt-3 flex gap-1 flex-wrap">
                        {tech.skills.map((skill: string) => (
                          <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No technicians found. Add technicians to view their schedules.</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <TechnicianDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        technician={selectedTechnician}
        onSuccess={() => {
          refetch();
          setDialogOpen(false);
          setSelectedTechnician(null);
        }}
      />
    </div>
  );
}