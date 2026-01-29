import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, Users, FileText } from 'lucide-react';

export default function PartnerPortal() {
  const { data: partners } = useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const { data: commissions } = useQuery({
    queryKey: ['partner-commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_commissions')
        .select('*, partners(company_name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    }
  });

  const totalCommissions = commissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;
  const pendingCommissions = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;
  const paidCommissions = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          Partner Portal
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage partner relationships and commissions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Commissions</p>
              <p className="text-3xl font-bold">${totalCommissions.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-3xl font-bold text-warning">${pendingCommissions.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-warning" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-3xl font-bold text-success">${paidCommissions.toLocaleString()}</p>
            </div>
            <FileText className="h-8 w-8 text-success" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="rules">Commission Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Active Partners</h2>
            {partners && partners.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner #</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((partner: any) => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-mono text-sm">
                        {partner.partner_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {partner.company_name}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{partner.contact_name}</div>
                          <div className="text-muted-foreground">{partner.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{partner.partner_type}</Badge>
                      </TableCell>
                      <TableCell>{partner.commission_rate}%</TableCell>
                      <TableCell>
                        <Badge className="bg-success">{partner.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No partners registered yet.
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Commission History</h2>
            {commissions && commissions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Base Amount</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission: any) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        {commission.partners?.company_name}
                      </TableCell>
                      <TableCell>${commission.base_amount?.toLocaleString()}</TableCell>
                      <TableCell>{commission.commission_rate}%</TableCell>
                      <TableCell className="font-semibold">
                        ${commission.commission_amount?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'}>
                          {commission.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(commission.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No commissions recorded yet.
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Commission Rules</h2>
            <div className="text-center py-12 text-muted-foreground">
              Commission rules management coming soon...
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}