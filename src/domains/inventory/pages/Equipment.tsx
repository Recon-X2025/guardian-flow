import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Package, QrCode } from 'lucide-react';
import { EquipmentDialog } from '@/domains/inventory/components/EquipmentDialog';
import { useRBAC } from '@/domains/auth/contexts/RBACContext';
import { useActionPermissions } from '@/domains/auth/hooks/useActionPermissions';

export default function Equipment() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const { tenantId, hasRole, loading: rbacLoading } = useRBAC();
  const isSysAdmin = hasRole('sys_admin');
  const equipmentPerms = useActionPermissions('equipment');
  const isViewOnly = !equipmentPerms.create && !equipmentPerms.edit;

  const { data: equipment, isLoading, refetch } = useQuery({
    queryKey: ['equipment', searchTerm, tenantId, isSysAdmin],
    enabled: !rbacLoading && (isSysAdmin || !!tenantId),
    queryFn: async () => {
      let query = supabase
        .from('equipment')
        .select('*, customers(company_name, first_name, last_name)')
        .order('created_at', { ascending: false }) as any;

      // Only sys_admin sees all equipment, others filtered by tenant
      if (!isSysAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%,equipment_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success';
      case 'maintenance': return 'bg-warning';
      case 'retired': return 'bg-muted';
      case 'broken': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {isViewOnly && (
        <Alert>
          <AlertDescription>
            <strong>View-Only Mode:</strong> You have read-only access to Equipment.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Equipment & Asset Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage equipment lifecycle and maintenance
          </p>
        </div>
        {equipmentPerms.create && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Register Equipment
          </Button>
        )}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search equipment by name, serial number, or equipment #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading equipment...</div>
        ) : equipment && equipment.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((eq: any) => (
                <TableRow key={eq.id}>
                  <TableCell className="font-mono text-sm">
                    {eq.equipment_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{eq.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {eq.manufacturer} {eq.model}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{eq.category}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {eq.serial_number}
                  </TableCell>
                  <TableCell>
                    {eq.customers ? (
                      eq.customers.company_name ||
                      `${eq.customers.first_name} ${eq.customers.last_name}`
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(eq.status)}>
                      {eq.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {eq.warranty_expiry ? (
                      new Date(eq.warranty_expiry) > new Date() ? (
                        <Badge className="bg-success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Expired</Badge>
                      )
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEquipment(eq);
                          setDialogOpen(true);
                        }}
                      >
                        Details
                      </Button>
                      <Button variant="ghost" size="sm">
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No equipment registered. Add your first equipment to get started.</p>
          </div>
        )}
      </Card>

      <EquipmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        equipment={selectedEquipment}
        onSuccess={() => {
          refetch();
          setDialogOpen(false);
          setSelectedEquipment(null);
        }}
      />
    </div>
  );
}