import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Shield, FileCheck, AlertCircle, Download, RefreshCw } from 'lucide-react';

export default function ComplianceCenter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: frameworks, isLoading } = useQuery({
    queryKey: ['compliance-frameworks'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('compliance_frameworks')
        .select(`
          *,
          controls:compliance_controls(
            *,
            evidence:compliance_evidence(count)
          )
        `);
      
      if (error) throw error;
      return data;
    },
  });

  const collectEvidenceMutation = useMutation({
    mutationFn: async (frameworkId: string) => {
      const { data, error } = await (supabase as any).functions.invoke('compliance-policy-enforcer', {
        body: { action: 'collect_evidence', frameworkId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['compliance-frameworks'] });
      toast({
        title: 'Evidence collected',
        description: `Collected ${data.evidenceCount} evidence items.`,
      });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async (frameworkId: string) => {
      const { data, error } = await (supabase as any).functions.invoke('compliance-policy-enforcer', {
        body: { action: 'generate_report', frameworkId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${Date.now()}.json`;
      a.click();
      
      toast({
        title: 'Report generated',
        description: 'Compliance report downloaded.',
      });
    },
  });

  const calculateComplianceScore = (framework: any) => {
    const total = framework.controls?.length || 0;
    if (total === 0) return 0;
    
    const withEvidence = framework.controls?.filter((c: any) => 
      c.evidence && c.evidence.length > 0
    ).length || 0;
    
    return Math.round((withEvidence / total) * 100);
  };

  if (isLoading) {
    return <div className="p-8">Loading compliance data...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Compliance Center
          </h1>
          <p className="text-muted-foreground">
            Manage compliance frameworks and evidence
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {frameworks?.map((framework) => {
          const score = calculateComplianceScore(framework);
          const controlCount = framework.controls?.length || 0;
          const evidenceCount = framework.controls?.reduce(
            (acc: number, c: any) => acc + (c.evidence?.[0]?.count || 0), 0
          ) || 0;

          return (
            <Card key={framework.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{framework.framework_name}</CardTitle>
                    <CardDescription>
                      {controlCount} controls • {evidenceCount} evidence
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={score >= 80 ? 'default' : score >= 50 ? 'secondary' : 'destructive'}
                  >
                    {score}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Compliance Score</span>
                    <span className="font-medium">{score}%</span>
                  </div>
                  <Progress value={score} />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => collectEvidenceMutation.mutate(framework.id)}
                    disabled={collectEvidenceMutation.isPending}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Collect
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateReportMutation.mutate(framework.id)}
                    disabled={generateReportMutation.isPending}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {frameworks?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No compliance frameworks configured.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}