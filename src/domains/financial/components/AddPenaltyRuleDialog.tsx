import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { apiClient } from '@/integrations/api/client';
import { Loader2 } from 'lucide-react';

interface AddPenaltyRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddPenaltyRuleDialog({ open, onOpenChange, onSuccess }: AddPenaltyRuleDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    penaltyCode: '',
    description: '',
    violationType: 'sla_breach',
    severityLevel: 'medium',
    percentageValue: '',
    baseReference: 'work_order_value',
    calculationMethod: 'percentage',
    autoBill: false,
    disputeAllowed: true,
    mfaRequired: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await apiClient
        .from('penalty_matrix')
        .insert({
          penalty_code: formData.penaltyCode,
          description: formData.description,
          violation_type: formData.violationType,
          severity_level: formData.severityLevel,
          percentage_value: parseFloat(formData.percentageValue) || 0,
          base_reference: formData.baseReference,
          calculation_method: formData.calculationMethod,
          auto_bill: formData.autoBill,
          dispute_allowed: formData.disputeAllowed,
          mfa_required: formData.mfaRequired,
          active: true,
        })
        .then();

      if (error) throw error;

      toast({
        title: 'Penalty rule added',
        description: `${formData.penaltyCode} has been added to the penalty matrix`,
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        penaltyCode: '',
        description: '',
        violationType: 'sla_breach',
        severityLevel: 'medium',
        percentageValue: '',
        baseReference: 'work_order_value',
        calculationMethod: 'percentage',
        autoBill: false,
        disputeAllowed: true,
        mfaRequired: false,
      });
    } catch (error: any) {
      toast({
        title: 'Error adding penalty rule',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Penalty Rule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="penaltyCode">Penalty Code *</Label>
              <Input
                id="penaltyCode"
                value={formData.penaltyCode}
                onChange={(e) => setFormData({ ...formData, penaltyCode: e.target.value })}
                placeholder="e.g., SLA-BREACH-01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="violationType">Violation Type *</Label>
              <Select value={formData.violationType} onValueChange={(value) => setFormData({ ...formData, violationType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sla_breach">SLA Breach</SelectItem>
                  <SelectItem value="skill_violation">Skill Violation</SelectItem>
                  <SelectItem value="capacity_exceeded">Capacity Exceeded</SelectItem>
                  <SelectItem value="parts_violation">Parts Violation</SelectItem>
                  <SelectItem value="compliance_violation">Compliance Violation</SelectItem>
                  <SelectItem value="quality_issue">Quality Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the penalty rule..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severityLevel">Severity Level *</Label>
              <Select value={formData.severityLevel} onValueChange={(value) => setFormData({ ...formData, severityLevel: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="percentageValue">Penalty Percentage (%) *</Label>
              <Input
                id="percentageValue"
                type="number"
                step="0.01"
                value={formData.percentageValue}
                onChange={(e) => setFormData({ ...formData, percentageValue: e.target.value })}
                placeholder="e.g., 10"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseReference">Base Reference *</Label>
              <Select value={formData.baseReference} onValueChange={(value) => setFormData({ ...formData, baseReference: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work_order_value">Work Order Value</SelectItem>
                  <SelectItem value="parts_cost">Parts Cost</SelectItem>
                  <SelectItem value="service_fee">Service Fee</SelectItem>
                  <SelectItem value="total_invoice">Total Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="calculationMethod">Calculation Method *</Label>
              <Select value={formData.calculationMethod} onValueChange={(value) => setFormData({ ...formData, calculationMethod: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="tiered">Tiered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="autoBill"
                checked={formData.autoBill}
                onCheckedChange={(checked) => setFormData({ ...formData, autoBill: checked })}
              />
              <Label htmlFor="autoBill">Auto-Bill (Apply automatically)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="disputeAllowed"
                checked={formData.disputeAllowed}
                onCheckedChange={(checked) => setFormData({ ...formData, disputeAllowed: checked })}
              />
              <Label htmlFor="disputeAllowed">Allow Disputes</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="mfaRequired"
                checked={formData.mfaRequired}
                onCheckedChange={(checked) => setFormData({ ...formData, mfaRequired: checked })}
              />
              <Label htmlFor="mfaRequired">Require MFA for Override</Label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Penalty Rule
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
