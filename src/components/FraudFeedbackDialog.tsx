import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle2 } from "lucide-react";

interface FraudFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertId: string;
  onSuccess?: () => void;
}

export function FraudFeedbackDialog({
  open,
  onOpenChange,
  alertId,
  onSuccess,
}: FraudFeedbackDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState<'true_positive' | 'false_positive' | 'uncertain'>('true_positive');
  const [confidence, setConfidence] = useState<'low' | 'medium' | 'high'>('medium');
  const [feedbackNotes, setFeedbackNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Submit feedback
      const { error } = await apiClient
        .from('fraud_feedback' as any)
        .insert({
          alert_id: alertId,
          investigator_id: user.id,
          label,
          confidence,
          feedback_notes: feedbackNotes,
          verified: false
        } as any)
        .then();

      if (error) throw error;

      toast({
        title: "Feedback Submitted",
        description: "Your fraud investigation feedback has been recorded for active learning",
      });

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setLabel('true_positive');
      setConfidence('medium');
      setFeedbackNotes('');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Fraud Investigation Feedback</DialogTitle>
          <DialogDescription>
            Label this fraud alert to improve detection accuracy. Your feedback will be used for active learning.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Label Classification *</Label>
            <RadioGroup value={label} onValueChange={(v: any) => setLabel(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true_positive" id="true_positive" />
                <Label htmlFor="true_positive" className="cursor-pointer font-normal">
                  True Positive - Legitimate fraud detected
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false_positive" id="false_positive" />
                <Label htmlFor="false_positive" className="cursor-pointer font-normal">
                  False Positive - Not actually fraud
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="uncertain" id="uncertain" />
                <Label htmlFor="uncertain" className="cursor-pointer font-normal">
                  Uncertain - Requires further investigation
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Confidence Level *</Label>
            <RadioGroup value={confidence} onValueChange={(v: any) => setConfidence(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="cursor-pointer font-normal">
                  High - Very confident in this assessment
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="cursor-pointer font-normal">
                  Medium - Reasonably confident
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="cursor-pointer font-normal">
                  Low - Uncertain, needs more evidence
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Investigation Notes</Label>
            <Textarea
              id="notes"
              placeholder="Describe your findings, reasoning, and any additional context..."
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/50 p-3 rounded">
            <CheckCircle2 className="h-4 w-4" />
            <span>This feedback will be added to the labeled dataset for ML training</span>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Feedback
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
