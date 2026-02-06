import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';
import { WorkOrder, getStatusColor } from './types';

interface ServiceHistoryTabProps {
  workOrders: WorkOrder[];
}

export function ServiceHistoryTab({ workOrders }: ServiceHistoryTabProps) {
  if (workOrders.length === 0) {
    return (
      <Card className="p-12 text-center">
        <History className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <p className="text-muted-foreground">
          No service history yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {workOrders.map((wo) => (
        <Card key={wo.id} className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">{wo.wo_number}</h3>
                <Badge className={getStatusColor(wo.status)}>
                  {wo.status}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Created: {new Date(wo.created_at).toLocaleDateString()}</p>
                {wo.completed_at && (
                  <p>Completed: {new Date(wo.completed_at).toLocaleDateString()}</p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
