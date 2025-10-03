import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, CheckCircle2, Clock, AlertCircle, Shield, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function WorkOrders() {
  const { toast } = useToast();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          ticket:tickets(*),
          technician:profiles(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setWorkOrders(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading work orders',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'in_progress':
      case 'assigned':
        return <Clock className="h-4 w-4" />;
      case 'pending_validation':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success border-success/20';
      case 'in_progress':
      case 'assigned':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'pending_validation':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'draft':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Work Orders</h1>
          <p className="text-muted-foreground">Manage field service work orders and assignments</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Work Order
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total WOs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {workOrders.filter(wo => wo.status === 'pending_validation').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {workOrders.filter(wo => wo.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {workOrders.filter(wo => wo.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Work Orders</CardTitle>
              <CardDescription>View and manage all work orders</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search work orders..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading work orders...</div>
          ) : workOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No work orders found</div>
          ) : (
            <div className="space-y-3">
              {workOrders.map((wo) => (
                <div
                  key={wo.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{wo.wo_number || 'Draft'}</span>
                      <Badge variant="outline" className={getStatusColor(wo.status)}>
                        {getStatusIcon(wo.status)}
                        <span className="ml-1">{wo.status?.replace('_', ' ')}</span>
                      </Badge>
                      {wo.warranty_checked && (
                        <Badge variant="outline" className="bg-info/10 text-info border-info/20">
                          <Shield className="h-3 w-3 mr-1" />
                          Warranty Checked
                        </Badge>
                      )}
                      {wo.parts_reserved && (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          <Package className="h-3 w-3 mr-1" />
                          Parts Reserved
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground">
                      Ticket: {wo.ticket?.unit_serial || 'N/A'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Tech: {wo.technician?.full_name || 'Unassigned'}</span>
                      <span>•</span>
                      <span>Cost: ${wo.cost_to_customer?.toFixed(2) || '0.00'}</span>
                      <span>•</span>
                      <span>{new Date(wo.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Pre-Release Validation</CardTitle>
          <CardDescription>Work orders must pass validation before release</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✓ Inventory cascade check (hub → OEM → partner → buffer)</p>
            <p>✓ Warranty coverage verification for non-consumable parts</p>
            <p>✓ Technician skill certification matching</p>
            <p>✓ Parts reservation confirmation</p>
            <p className="text-xs text-warning">⚠ RBAC override available with manager approval + MFA</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
