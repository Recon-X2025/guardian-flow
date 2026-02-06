import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/domains/shared/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { Badge } from "@/components/ui/badge";

interface MFAOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredAction: string;
  onSuccess?: () => void;
}

export default function MFAOverrideDialog({
  open,
  onOpenChange,
  requiredAction,
  onSuccess,
}: MFAOverrideDialogProps) {
  const { toast } = useToast();
  const [justification, setJustification] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!justification.trim()) {
      toast({
        title: "Justification required",
        description: "Please provide a reason for this override request",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiClient.functions.invoke('create-override-request', {
        body: {
          requiredAction,
          justification,
          urgencyLevel,
        },
      });

      if (result.error) throw result.error;

      toast({
        title: "Override request submitted",
        description: "Your request has been sent to a manager for approval",
      });

      onSuccess?.();
      onOpenChange(false);
      setJustification("");
      setUrgencyLevel("medium");
    } catch (error: unknown) {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Failed to submit override request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-warning" />
            </div>
            <div>
              <DialogTitle>MFA Override Request</DialogTitle>
              <DialogDescription>
                Request manager approval to bypass MFA requirement
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning">Security Override Required</p>
                <p className="text-muted-foreground mt-1">
                  This action requires MFA verification. Submit an override request for manager approval.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Required Action</Label>
            <div className="p-3 bg-muted rounded-lg">
              <code className="text-sm">{requiredAction}</code>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgency">Urgency Level</Label>
            <Select value={urgencyLevel} onValueChange={(v: "low" | "medium" | "high" | "critical") => setUrgencyLevel(v)}>
              <SelectTrigger id="urgency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Low</Badge>
                    <span className="text-sm">Can wait 24+ hours</span>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50">Medium</Badge>
                    <span className="text-sm">Within 4 hours</span>
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-orange-50">High</Badge>
                    <span className="text-sm">Within 1 hour</span>
                  </div>
                </SelectItem>
                <SelectItem value="critical">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Critical</Badge>
                    <span className="text-sm">Immediate</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="justification">
              Justification <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="justification"
              placeholder="Explain why this override is necessary..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Provide clear business justification for audit trail
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Average approval time: {urgencyLevel === "critical" ? "5-10 min" : urgencyLevel === "high" ? "30 min" : "2-4 hours"}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !justification.trim()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Submit Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
