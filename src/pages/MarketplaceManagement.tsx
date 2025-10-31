import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Store, Package, DollarSign, TrendingUp, Users, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function MarketplaceManagement() {
  const { data: extensions = [] } = useQuery({
    queryKey: ["marketplace-extensions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_extensions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: installations = [] } = useQuery({
    queryKey: ["extension-installations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extension_installations")
        .select("*, extension:marketplace_extensions(*)")
        .order("installed_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["marketplace-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_transactions")
        .select("*, extension:marketplace_extensions(*)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  const totalRevenue = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const activeExtensions = extensions.filter(e => e.status === 'approved').length;
  const pendingApprovals = extensions.filter(e => e.status === 'pending').length;
  const totalInstallations = extensions.reduce((sum, e) => sum + (e.install_count || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Marketplace Management</h1>
        <p className="text-muted-foreground">
          Manage extensions, partners, and marketplace analytics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From marketplace transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Extensions</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeExtensions}</div>
            <p className="text-xs text-muted-foreground">
              {pendingApprovals} pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Installations</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInstallations}</div>
            <p className="text-xs text-muted-foreground">
              Across all extensions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{installations.length}</div>
            <p className="text-xs text-muted-foreground">
              Unique installations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="extensions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="extensions">Extensions</TabsTrigger>
          <TabsTrigger value="installations">Installations</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="certification">Certification</TabsTrigger>
        </TabsList>

        <TabsContent value="extensions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Marketplace Extensions</CardTitle>
                  <CardDescription>
                    All extensions available on the marketplace
                  </CardDescription>
                </div>
                <Button>
                  <Store className="h-4 w-4 mr-2" />
                  Submit Extension
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Extension Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Installs</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extensions.map((ext) => (
                    <TableRow key={ext.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{ext.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {ext.description?.substring(0, 50)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{ext.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {ext.pricing_model === 'free' ? (
                          <Badge variant="secondary">Free</Badge>
                        ) : (
                          <span className="font-mono text-sm">${ext.price}</span>
                        )}
                      </TableCell>
                      <TableCell>{ext.install_count || 0}</TableCell>
                      <TableCell>
                        {ext.rating ? (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{ext.rating.toFixed(1)}</span>
                            <span className="text-yellow-500">★</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No ratings</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(ext.status)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="installations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Installations</CardTitle>
              <CardDescription>
                Track extension installations across tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Extension</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Tenant ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Installed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installations.map((install) => (
                    <TableRow key={install.id}>
                      <TableCell className="font-medium">
                        {install.extension?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {install.user_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {install.tenant_id?.slice(0, 8) || 'N/A'}...
                      </TableCell>
                      <TableCell>
                        {install.status === 'active' ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">{install.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(install.installed_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Recent marketplace transactions and revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Extension</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="font-medium">
                        {txn.extension?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {txn.user_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {txn.currency} ${Number(txn.amount).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {txn.payment_status === 'succeeded' ? (
                          <Badge className="bg-green-500">Succeeded</Badge>
                        ) : txn.payment_status === 'pending' ? (
                          <Badge variant="secondary">Pending</Badge>
                        ) : (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(txn.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Extension Certification Process</CardTitle>
              <CardDescription>
                Steps and requirements for marketplace certification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Security Review</h3>
                    <p className="text-sm text-muted-foreground">
                      Static code analysis, dependency scanning, and penetration testing
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Compliance Validation</h3>
                    <p className="text-sm text-muted-foreground">
                      Data handling practices, privacy requirements, audit logging verification
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Performance Testing</h3>
                    <p className="text-sm text-muted-foreground">
                      Load testing, resource consumption limits, response time validation
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Integration Testing</h3>
                    <p className="text-sm text-muted-foreground">
                      API compatibility, error handling, rollback procedures
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    5
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Documentation Review</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete API documentation, user guides, support processes
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
