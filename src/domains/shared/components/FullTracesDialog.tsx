import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, MapPin, Monitor, Clock, User, Shield } from "lucide-react";
import { format } from "date-fns";

interface FullTracesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: any[];
}

export function FullTracesDialog({ open, onOpenChange, logs }: FullTracesDialogProps) {
  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('reject')) return 'text-destructive';
    if (action.includes('approve') || action.includes('complete')) return 'text-success';
    if (action.includes('override') || action.includes('mfa')) return 'text-warning';
    return 'text-primary';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Full Audit Trail & Traces
          </DialogTitle>
          <DialogDescription>
            Detailed view of all system actions with correlation tracking
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-4">
            {logs.map((log, index) => (
              <div key={log.id} className="border rounded-lg p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`font-semibold ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.resource_type}
                      </Badge>
                      {log.mfa_verified && (
                        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                          <Shield className="h-3 w-3 mr-1" />
                          MFA Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(log.created_at), "PPP 'at' HH:mm:ss")}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    #{index + 1}
                  </Badge>
                </div>

                <Separator />

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {/* User & Role */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">User ID</p>
                        <p className="font-mono text-xs">{log.user_id || "N/A"}</p>
                      </div>
                    </div>
                    {log.actor_role && (
                      <div className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Actor Role</p>
                          <Badge variant="outline" className="text-xs">
                            {log.actor_role}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resource Info */}
                  <div className="space-y-2">
                    {log.resource_id && (
                      <div className="flex items-start gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Resource ID</p>
                          <p className="font-mono text-xs">{log.resource_id}</p>
                        </div>
                      </div>
                    )}
                    {log.tenant_id && (
                      <div className="flex items-start gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Tenant ID</p>
                          <p className="font-mono text-xs">{log.tenant_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Network Info */}
                  <div className="space-y-2">
                    {log.ip_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">IP Address</p>
                          <p className="font-mono text-xs">{log.ip_address}</p>
                        </div>
                      </div>
                    )}
                    {log.user_agent && (
                      <div className="flex items-start gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">User Agent</p>
                          <p className="text-xs line-clamp-2">{log.user_agent}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Correlation & Metadata */}
                  <div className="space-y-2">
                    {log.correlation_id && (
                      <div className="flex items-start gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Correlation ID</p>
                          <code className="text-xs px-2 py-1 rounded bg-muted font-mono">
                            {log.correlation_id}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reason */}
                {log.reason && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Reason</p>
                      <div className="bg-muted/50 rounded p-2 text-sm">
                        {log.reason}
                      </div>
                    </div>
                  </>
                )}

                {/* Changes */}
                {log.changes && Object.keys(log.changes).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Changes Made</p>
                      <div className="bg-muted/50 rounded p-3 font-mono text-xs space-y-1">
                        {Object.entries(log.changes).map(([key, value]) => (
                          <div key={key} className="flex items-start gap-2">
                            <span className="text-warning font-semibold">{key}:</span>
                            <span className="text-foreground">
                              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Full Trace Info Footer */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span>ID: {log.id.slice(0, 13)}...</span>
                  {log.mfa_verified && (
                    <span className="text-success font-medium">✓ MFA Verified</span>
                  )}
                  <span className="ml-auto">
                    Created: {format(new Date(log.created_at), "HH:mm:ss.SSS")}
                  </span>
                </div>
              </div>
            ))}

            {logs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No traces available</p>
                <p className="text-sm">Traces will appear as system actions are performed</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t text-xs text-muted-foreground">
          <span>{logs.length} traces loaded</span>
          <span>Showing complete audit trail with correlation tracking</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
