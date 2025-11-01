import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Play, Plus, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

export function AnalyticsDataQuality({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();

  const { data: qualityRules } = useQuery({
    queryKey: ["analytics-quality-rules", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("analytics-data-quality", {
        body: { action: "get_rules", workspaceId }
      });
      if (error) throw error;
      return data.rules || [];
    }
  });

  const { data: qualityResults } = useQuery({
    queryKey: ["analytics-quality-results", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("analytics-data-quality", {
        body: { action: "get_quality_results", workspaceId }
      });
      if (error) throw error;
      return data.results || [];
    }
  });

  const runCheckMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { data, error } = await supabase.functions.invoke("analytics-data-quality", {
        body: { action: "run_quality_check", ruleId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-quality-results"] });
      toast.success("Quality check completed");
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const overallScore = qualityResults && qualityResults.length > 0
    ? qualityResults.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / qualityResults.length
    : 0;

  const passedChecks = qualityResults?.filter((r: any) => r.passed).length || 0;
  const totalChecks = qualityResults?.length || 0;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Data Quality Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallScore.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {passedChecks}/{totalChecks} checks passed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualityRules?.filter((r: any) => r.is_active).length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {qualityRules?.length || 0} total rules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Issues Detected</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChecks - passedChecks}</div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quality Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Quality Rules</CardTitle>
              <CardDescription>Configure and run data quality validation rules</CardDescription>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {qualityRules?.map((rule: any) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{rule.name}</h4>
                    <Badge variant={getSeverityColor(rule.severity)}>{rule.severity}</Badge>
                    {rule.is_active ? (
                      <Badge variant="outline">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Type: {rule.rule_type} | Table: {rule.table_name}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => runCheckMutation.mutate(rule.id)}
                  disabled={runCheckMutation.isPending}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Run Check
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Results */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Quality Check Results</CardTitle>
          <CardDescription>Latest data quality validation results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {qualityResults?.slice(0, 10).map((result: any) => (
              <div key={result.id} className="flex items-start justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium text-sm">{result.rule?.name}</h5>
                    {result.passed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Score: {result.score?.toFixed(1)}% | Tested: {result.records_tested} | Failed: {result.records_failed}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(result.execution_time).toLocaleString()}
                  </p>
                </div>
                <Badge variant={result.passed ? 'outline' : 'destructive'}>
                  {result.passed ? 'Passed' : 'Failed'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
