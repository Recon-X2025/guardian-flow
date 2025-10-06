import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Shield, AlertTriangle } from 'lucide-react';

interface PenaltyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  penalty: any;
}

export function PenaltyDetailsDialog({ open, onOpenChange, penalty }: PenaltyDetailsDialogProps) {
  if (!penalty) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'high':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'medium':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'low':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {penalty.penalty_code}
          </DialogTitle>
          <DialogDescription>
            Detailed information about this penalty rule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Severity & Status</h3>
            <div className="flex gap-2">
              <Badge variant="outline" className={getSeverityColor(penalty.severity_level)}>
                {penalty.severity_level}
              </Badge>
              {penalty.auto_bill && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  Auto-Bill Enabled
                </Badge>
              )}
              {penalty.dispute_allowed && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Disputable
                </Badge>
              )}
              {penalty.mfa_required && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                  <Shield className="h-3 w-3 mr-1" />
                  MFA Required
                </Badge>
              )}
              <Badge variant="outline" className={penalty.active ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'}>
                {penalty.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground">
              {penalty.description || 'No description provided'}
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Violation Type</h3>
              <p className="text-sm text-muted-foreground">{penalty.violation_type}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Rate Card Entry</h3>
              <p className="text-sm text-muted-foreground">{penalty.rate_card_entry_code || 'N/A'}</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Calculation Method
            </h3>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Method:</span>
                  <span className="ml-2 font-medium">{penalty.calculation_method}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Percentage Value:</span>
                  <span className="ml-2 font-medium">{penalty.percentage_value}%</span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Base Reference:</span>
                <span className="ml-2 font-medium">{penalty.base_reference?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-2">Billing & Dispute Settings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auto-Billing:</span>
                <span className="font-medium">{penalty.auto_bill ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dispute Allowed:</span>
                <span className="font-medium">{penalty.dispute_allowed ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">MFA Required:</span>
                <span className="font-medium">{penalty.mfa_required ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Created</h3>
              <p className="text-xs text-muted-foreground">
                {new Date(penalty.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-1">Last Updated</h3>
              <p className="text-xs text-muted-foreground">
                {new Date(penalty.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
