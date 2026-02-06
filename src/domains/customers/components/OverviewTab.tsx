import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ServiceRequest, Invoice, Equipment, getStatusColor } from './types';

interface OverviewTabProps {
  serviceRequests: ServiceRequest[];
  equipment: Equipment[];
  pendingInvoices: Invoice[];
  totalPending: number;
  formatCurrency: (amount: number) => string;
  onProcessPayment: (invoice: Invoice) => void;
}

export function OverviewTab({
  serviceRequests,
  equipment,
  pendingInvoices,
  totalPending,
  formatCurrency,
  onProcessPayment,
}: OverviewTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {serviceRequests.filter(r => ['submitted', 'scheduled'].includes(r.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">Active service requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Registered Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipment.length}</div>
            <p className="text-xs text-muted-foreground">Total equipment items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground">{pendingInvoices.length} pending invoices</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Service Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {serviceRequests.slice(0, 5).length > 0 ? (
              <div className="space-y-2">
                {serviceRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{request.title}</p>
                      <p className="text-xs text-muted-foreground">{request.status}</p>
                    </div>
                    <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No service requests yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingInvoices.length > 0 ? (
              <div className="space-y-2">
                {pendingInvoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{invoice.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(Number(invoice.total_amount))}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => onProcessPayment(invoice)}>
                      Pay Now
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                All invoices paid
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
