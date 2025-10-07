import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database, Cpu, Workflow, Shield, Activity, TrendingUp, Zap, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ModelOrchestration = () => {
  const [systemConfig, setSystemConfig] = useState<any>({});
  const [models, setModels] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    try {
      const [configRes, modelsRes, workflowsRes, policiesRes, featuresRes] = await Promise.all([
        (supabase as any).from('system_config').select('*'),
        (supabase as any).from('model_registry').select('*').eq('active', true),
        (supabase as any).from('workflow_definitions').select('*').eq('active', true),
        (supabase as any).from('policy_registry').select('*').eq('active', true),
        (supabase as any).from('feature_toggles').select('*')
      ]);

      if (configRes.data) {
        const config = configRes.data.reduce((acc: any, item: any) => {
          try {
            acc[item.config_key] = JSON.parse(item.config_value);
          } catch {
            acc[item.config_key] = item.config_value;
          }
          return acc;
        }, {});
        setSystemConfig(config);
      }
      setModels((modelsRes.data || []) as any[]);
      setWorkflows((workflowsRes.data || []) as any[]);
      setPolicies((policiesRes.data || []) as any[]);
      setFeatures((featuresRes.data || []) as any[]);
    } catch (error: any) {
      toast({
        title: "Error loading system status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const detectSystem = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('system-detect', {});
      if (error) throw error;
      
      toast({
        title: "System Detection Complete",
        description: `Database mode: ${data.db_mode}`,
      });
      
      loadSystemStatus();
    } catch (error: any) {
      toast({
        title: "Detection failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleFeature = async (featureKey: string, currentEnabled: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('feature_toggles')
        .update({ enabled: !currentEnabled })
        .eq('feature_key', featureKey);

      if (error) throw error;

      toast({
        title: "Feature Updated",
        description: `Feature ${currentEnabled ? 'disabled' : 'enabled'} successfully`,
      });

      loadSystemStatus();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recon-X v3.0 Platform Orchestration</h1>
          <p className="text-muted-foreground mt-1">
            Adaptive AI platform with auto-detection and policy-driven governance
          </p>
        </div>
        <Button onClick={detectSystem}>
          <Activity className="h-4 w-4 mr-2" />
          Detect System
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Database Mode</CardTitle>
            <Database className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Badge variant={systemConfig.db_mode === 'SUPABASE_FULL' ? 'default' : 'secondary'}>
              {systemConfig.db_mode || 'RESTRICTED_DB'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Vector: {systemConfig.vector_enabled ? 'Enabled' : 'Disabled'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Models</CardTitle>
            <Cpu className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{models.length}</div>
            <p className="text-xs text-muted-foreground">Active models</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Workflows</CardTitle>
            <Workflow className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.length}</div>
            <p className="text-xs text-muted-foreground">Autonomous flows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Policies</CardTitle>
            <Shield className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{policies.length}</div>
            <p className="text-xs text-muted-foreground">Governance rules</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models">AI Models</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Registry</CardTitle>
              <CardDescription>AI models available for agent selection</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Capabilities</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Avg Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell className="font-medium">{model.model_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{model.provider}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {model.capabilities?.slice(0, 3).map((cap: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {cap}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{model.usage_count || 0}</TableCell>
                      <TableCell>${model.avg_cost_per_1k_tokens || 0}/1K</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Definitions</CardTitle>
              <CardDescription>Declarative workflow graphs for autonomous execution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{workflow.name}</h4>
                        <p className="text-sm text-muted-foreground">{workflow.description}</p>
                      </div>
                      <Badge>{workflow.version}</Badge>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {workflow.trigger_events?.map((event: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Policy Registry</CardTitle>
              <CardDescription>Policy-as-Code governance rules</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{policy.category}</Badge>
                      </TableCell>
                      <TableCell>{policy.policy_type}</TableCell>
                      <TableCell>{policy.priority}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Toggles</CardTitle>
              <CardDescription>Control agent capabilities and rollouts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {features.map((feature) => (
                  <div key={feature.id} className="p-4 border rounded-lg flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{feature.name}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={feature.enabled ? 'default' : 'secondary'}>
                          {feature.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Badge variant="outline">{feature.rollout_percentage}% rollout</Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={feature.enabled ? 'destructive' : 'default'}
                      onClick={() => toggleFeature(feature.feature_key, feature.enabled)}
                    >
                      {feature.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            v3.0 Adaptive Architecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Auto-Detection</p>
                <p className="text-xs text-muted-foreground">
                  Automatically adapts to SUPABASE_FULL or RESTRICTED_DB mode
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Policy-Driven</p>
                <p className="text-xs text-muted-foreground">
                  All agent actions governed by policy-as-code enforcement
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Full Observability</p>
                <p className="text-xs text-muted-foreground">
                  OpenTelemetry-style tracing for every agent decision
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelOrchestration;
