import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, AlertTriangle, DollarSign, Shield } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { AddPenaltyRuleDialog } from '@/domains/financial/components/AddPenaltyRuleDialog';
import { PenaltyDetailsDialog } from '@/domains/financial/components/PenaltyDetailsDialog';

export default function Penalties() {
  const { toast } = useToast();
  const [penalties, setPenalties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState<any>(null);

  useEffect(() => {
    fetchPenalties();
  }, []);

  const fetchPenalties = async () => {
    try {
      const { data, error } = await apiClient
        .from('penalty_matrix')
        .select('*')
        .eq('active', true)
        .order('severity_level', { ascending: false });

      if (error) throw error;
      setPenalties(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading penalties',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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

  const criticalCount = penalties.filter(p => p.severity_level === 'critical').length;
  const autoBillCount = penalties.filter(p => p.auto_bill).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Penalty Management</h1>
          <p className="text-muted-foreground">Track penalties and partner compliance violations</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          Add Penalty Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{penalties.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Critical Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Auto-Bill Enabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{autoBillCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-destructive/5 border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Penalty Engine Integration
          </CardTitle>
          <CardDescription>Flows into Finance & Settlements (Module #84/85)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Penalties automatically adjust partner payouts</p>
            <p>• All adjustments logged with audit trail and provenance</p>
            <p>• Dispute resolution workflow with manager approval</p>
            <p>• Integration with invoicing for customer-facing penalties</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Penalty Matrix</CardTitle>
              <CardDescription>Active penalty rules and calculations</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search penalties..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading penalties...</div>
          ) : penalties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No penalty rules found</div>
          ) : (
            <div className="space-y-3">
              {penalties.map((penalty) => (
                <div
                  key={penalty.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{penalty.penalty_code}</span>
                      <Badge variant="outline" className={getSeverityColor(penalty.severity_level)}>
                        {penalty.severity_level}
                      </Badge>
                      {penalty.auto_bill && (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          Auto-Bill
                        </Badge>
                      )}
                      {penalty.dispute_allowed && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          Disputable
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground">{penalty.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {penalty.percentage_value}% of {penalty.base_reference?.replace('_', ' ')}
                      </span>
                      <span>•</span>
                      <span>Type: {penalty.violation_type}</span>
                      <span>•</span>
                      <span>Method: {penalty.calculation_method}</span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedPenalty(penalty);
                      setDetailsDialogOpen(true);
                    }}
                  >
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
          <CardTitle>Penalty Categories</CardTitle>
          <CardDescription>Types of violations tracked by the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="font-medium text-sm mb-1">Skill Violations</div>
              <div className="text-xs text-muted-foreground">
                Uncertified or expired certification
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium text-sm mb-1">SLA Breaches</div>
              <div className="text-xs text-muted-foreground">
                Missed service level commitments
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium text-sm mb-1">Capacity Issues</div>
              <div className="text-xs text-muted-foreground">
                Exceeded concurrent work orders
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium text-sm mb-1">Parts Violations</div>
              <div className="text-xs text-muted-foreground">
                Unauthorized or inflated parts usage
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium text-sm mb-1">Compliance</div>
              <div className="text-xs text-muted-foreground">
                Data breaches and security violations
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="font-medium text-sm mb-1">Quality</div>
              <div className="text-xs text-muted-foreground">
                Failed inspections and rework
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Audit Trail Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✓ All penalty calculations logged with provenance</p>
            <p>✓ Override approvals require manager + MFA authentication</p>
            <p>✓ Adjustments appear as line items in invoices and settlements</p>
            <p>✓ Dispute workflow tracks status and resolution</p>
          </div>
        </CardContent>
      </Card>

      <AddPenaltyRuleDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchPenalties}
      />

      <PenaltyDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        penalty={selectedPenalty}
      />
    </div>
  );
}
