import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, FileText } from 'lucide-react';
import { ContractDialog } from '@/domains/shared/components/ContractDialog';
import { format } from 'date-fns';

export default function Contracts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);

  const { data: contracts, isLoading, refetch } = useQuery({
    queryKey: ['contracts', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('service_contracts')
        .select('*, customers(company_name, first_name, last_name)')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,contract_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success';
      case 'draft': return 'bg-muted';
      case 'pending': return 'bg-warning';
      case 'expired': return 'bg-destructive';
      case 'cancelled': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Service Contracts
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage service contracts and recurring revenue
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search contracts by title or contract #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading contracts...</div>
        ) : contracts && contracts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract: any) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-mono text-sm">
                    {contract.contract_number}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{contract.title}</div>
                    <div className="text-sm text-muted-foreground">
                      Billing: {contract.billing_frequency}
                    </div>
                  </TableCell>
                  <TableCell>
                    {contract.customers ? (
                      contract.customers.company_name ||
                      `${contract.customers.first_name} ${contract.customers.last_name}`
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{contract.contract_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {contract.currency} {contract.contract_value?.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{format(new Date(contract.start_date), 'MMM d, yyyy')}</div>
                      <div className="text-muted-foreground">
                        to {format(new Date(contract.end_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(contract.status)}>
                      {contract.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedContract(contract);
                        setDialogOpen(true);
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No contracts found. Create your first contract to get started.</p>
          </div>
        )}
      </Card>

      <ContractDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contract={selectedContract}
        onSuccess={() => {
          refetch();
          setDialogOpen(false);
          setSelectedContract(null);
        }}
      />
    </div>
  );
}