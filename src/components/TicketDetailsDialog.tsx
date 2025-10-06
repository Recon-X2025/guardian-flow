import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, User, Wrench, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface TicketDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: any;
}

export function TicketDetailsDialog({ open, onOpenChange, ticket }: TicketDetailsDialogProps) {
  if (!ticket) return null;

  const workOrder = ticket.work_orders?.[0];
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Clock className="h-4 w-4" />;
      case "assigned":
        return <AlertCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-warning/10 text-warning border-warning/20";
      case "assigned":
        return "bg-primary/10 text-primary border-primary/20";
      case "completed":
        return "bg-success/10 text-success border-success/20";
      default:
        return "bg-muted";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Ticket Details</span>
            <Badge variant="outline" className="text-xs">
              TKT-{ticket.id.slice(0, 8)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Complete information about this service ticket
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Status</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getStatusColor(ticket.status)}>
                {getStatusIcon(ticket.status)}
                <span className="ml-1 capitalize">{ticket.status}</span>
              </Badge>
              {workOrder && (
                <Badge variant="outline" className="bg-muted">
                  WO: {workOrder.wo_number}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Basic Information</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="text-sm font-medium">{ticket.customer_name || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Wrench className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Unit Serial Number</p>
                  <p className="text-sm font-medium font-mono">{ticket.unit_serial}</p>
                </div>
              </div>

              {ticket.site_address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Site Address</p>
                    <p className="text-sm font-medium">{ticket.site_address}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">
                    {format(new Date(ticket.created_at), "PPP 'at' p")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Symptom Description */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Symptom Description</h3>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.symptom}</p>
            </div>
          </div>

          {/* Work Order Information */}
          {workOrder && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-3">Work Order Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">WO Number</span>
                    <span className="text-sm font-medium font-mono">{workOrder.wo_number}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">WO Status</span>
                    <Badge variant="outline" className={getStatusColor(workOrder.status)}>
                      {workOrder.status}
                    </Badge>
                  </div>

                  {workOrder.part_status && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Part Status</span>
                      <Badge variant="outline" className="bg-muted text-xs">
                        {workOrder.part_status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  )}

                  {workOrder.completed_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Completed At</span>
                      <span className="text-sm font-medium">
                        {format(new Date(workOrder.completed_at), "PPP 'at' p")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-3">Additional Information</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Ticket ID</span>
                <span className="font-mono">{ticket.id}</span>
              </div>
              {ticket.updated_at && (
                <div className="flex justify-between">
                  <span>Last Updated</span>
                  <span>{format(new Date(ticket.updated_at), "PPP 'at' p")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
