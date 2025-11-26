import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Users } from 'lucide-react';
import { CustomerDialog } from '@/components/CustomerDialog';
import { useToast } from '@/hooks/use-toast';
import { useRBAC } from '@/contexts/RBACContext';
import { useActionPermissions } from '@/hooks/useActionPermissions';

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const { toast } = useToast();
  const { tenantId, hasRole, loading: rbacLoading } = useRBAC();
  const isSysAdmin = hasRole('sys_admin');
  const customerPerms = useActionPermissions('customers');
  const isViewOnly = !customerPerms.create && !customerPerms.edit;

  const { data: customers, isLoading, refetch } = useQuery({
    queryKey: ['customers', searchTerm, tenantId, isSysAdmin],
    enabled: !rbacLoading && (isSysAdmin || !!tenantId),
    queryFn: async () => {
      let query = apiClient
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      // Only sys_admin sees all customers, others filtered by tenant
      if (!isSysAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      // Note: apiClient doesn't support .or() with ilike, so we'll filter client-side for search
      const result = await query;
      if (result.error) throw result.error;
      
      let data = result.data || [];
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        data = data.filter((c: any) => 
          c.company_name?.toLowerCase().includes(searchLower) ||
          c.first_name?.toLowerCase().includes(searchLower) ||
          c.last_name?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower)
        );
      }
      
      return data;
    }
  });

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedCustomer(null);
    setDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success';
      case 'inactive': return 'bg-muted';
      case 'suspended': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {isViewOnly && (
        <Alert>
          <AlertDescription>
            <strong>View-Only Mode:</strong> You have read-only access to Customers.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Customer Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage customer information and relationships
          </p>
        </div>
        {customerPerms.create && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        )}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search customers by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading customers...</div>
        ) : customers && customers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer #</TableHead>
                <TableHead>Name/Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Credit Limit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer: any) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-mono text-sm">
                    {customer.customer_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {customer.company_name || `${customer.first_name} ${customer.last_name}`}
                      </div>
                      {customer.company_name && (
                        <div className="text-sm text-muted-foreground">
                          {customer.first_name} {customer.last_name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.customer_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{customer.email}</div>
                      <div className="text-muted-foreground">{customer.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(customer.status)}>
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell>${customer.credit_limit?.toLocaleString() || 0}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(customer)}
                      disabled={!customerPerms.view}
                    >
                      {customerPerms.edit ? 'View Details' : 'View'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No customers found. Create your first customer to get started.</p>
          </div>
        )}
      </Card>

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={selectedCustomer}
        onSuccess={() => {
          refetch();
          setDialogOpen(false);
          toast({
            title: 'Success',
            description: selectedCustomer ? 'Customer updated successfully' : 'Customer created successfully'
          });
        }}
      />
    </div>
  );
}