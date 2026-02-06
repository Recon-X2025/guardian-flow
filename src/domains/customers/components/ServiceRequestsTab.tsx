import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar } from 'lucide-react';
import { ServiceRequest, getStatusColor } from './types';

interface ServiceRequestsTabProps {
  serviceRequests: ServiceRequest[];
}

export function ServiceRequestsTab({ serviceRequests }: ServiceRequestsTabProps) {
  if (serviceRequests.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <p className="text-muted-foreground">
          No service requests yet. Click "Book Service" to get started.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {serviceRequests.map((request) => (
        <Card key={request.id} className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">{request.title}</h3>
                <Badge className={getStatusColor(request.status)}>
                  {request.status}
                </Badge>
                {request.priority && (
                  <Badge variant="outline">{request.priority}</Badge>
                )}
              </div>
              {request.request_number && (
                <p className="text-sm text-muted-foreground">
                  Request # {request.request_number}
                </p>
              )}
              {request.description && (
                <p className="text-sm">{request.description}</p>
              )}
              {request.preferred_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Preferred: {new Date(request.preferred_date).toLocaleDateString()}
                  {request.preferred_time_slot && ` - ${request.preferred_time_slot}`}
                </div>
              )}
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
