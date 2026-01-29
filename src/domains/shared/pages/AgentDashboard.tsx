import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/integrations/api/client";
import { useToast } from "@/domains/shared/hooks/use-toast";
import { Bot, Play, Pause, Activity, Target, Zap, TrendingUp, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Agent {
  agent_id: string;
  name: string;
  description: string;
  goal: string;
  status: string;
  capabilities: string[];
  config: any;
}

interface AgentStatus {
  is_active: boolean;
  total_actions_24h: number;
  successful_actions: number;
  failed_actions: number;
  pending_approval: number;
  success_rate: string;
  avg_execution_time_ms: number;
}

const AgentDashboard = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [recentActions, setRecentActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('agent_registry')
        .select('*')
        .order('created_at', { ascending: true });

      if (result.error) throw result.error;
      setAgents((data || []) as Agent[]);
      if (data && data.length > 0) {
        setSelectedAgent(data[0] as Agent);
        loadAgentStatus(data[0].agent_id);
      }
    } catch (error: any) {
      toast({
        title: "Error loading agents",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAgentStatus = async (agentId: string) => {
    try {
      const result = await apiClient.functions.invoke('agent-orchestrator', {
        body: {
          action: 'get_agent_status',
          parameters: { agent_id: agentId }
        }
      });

      if (result.error) throw result.error;
      setAgentStatus(data.status);
      setRecentActions(data.recent_actions || []);
    } catch (error: any) {
      console.error('Error loading agent status:', error);
    }
  };

  const toggleAgent = async (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate_agent' : 'deactivate_agent';

    try {
      const result = await apiClient.functions.invoke('agent-orchestrator', {
        body: {
          action: action,
          parameters: { agent_id: agentId }
        }
      });

      if (result.error) throw result.error;

      toast({
        title: `Agent ${newStatus === 'active' ? 'Activated' : 'Deactivated'}`,
        description: `${agentId} is now ${newStatus}`,
      });

      loadAgents();
      if (selectedAgent?.agent_id === agentId) {
        loadAgentStatus(agentId);
      }
    } catch (error: any) {
      toast({
        title: "Error toggling agent",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getActionStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8" />
            Agent Observatory
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage autonomous AI agents
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.filter(a => a.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {agents.length} total agents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions (24h)</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agentStatus?.total_actions_24h || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {agentStatus?.successful_actions || 0} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agentStatus?.success_rate || '0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agentStatus?.pending_approval || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires human review
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Agent Registry</CardTitle>
            <CardDescription>Available autonomous agents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {agents.map((agent) => (
              <div
                key={agent.agent_id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedAgent?.agent_id === agent.agent_id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => {
                  setSelectedAgent(agent);
                  loadAgentStatus(agent.agent_id);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                      <h4 className="font-semibold">{agent.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {agent.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAgent(agent.agent_id, agent.status);
                    }}
                  >
                    {agent.status === 'active' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedAgent?.name || 'Select an agent'}</CardTitle>
                <CardDescription className="mt-1">
                  {selectedAgent?.goal}
                </CardDescription>
              </div>
              {selectedAgent && (
                <Badge variant={selectedAgent.status === 'active' ? 'default' : 'secondary'}>
                  {selectedAgent.status}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedAgent && (
              <Tabs defaultValue="actions" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="actions">Recent Actions</TabsTrigger>
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                  <TabsTrigger value="config">Configuration</TabsTrigger>
                </TabsList>

                <TabsContent value="actions" className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentActions.map((action) => (
                          <TableRow key={action.id}>
                            <TableCell className="font-medium">
                              {action.action_type}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getActionStatusColor(action.status)}>
                                {action.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(action.created_at).toLocaleTimeString()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {action.execution_time_ms ? `${action.execution_time_ms}ms` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {recentActions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              No recent actions
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="metrics" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{agentStatus?.total_actions_24h || 0}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Avg Execution Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {agentStatus?.avg_execution_time_ms || 0}ms
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Success Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{agentStatus?.success_rate || '0'}%</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Failed Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{agentStatus?.failed_actions || 0}</div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="config" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Capabilities</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedAgent.capabilities?.map((cap: string, idx: number) => (
                          <Badge key={idx} variant="secondary">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Configuration</h4>
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                        {JSON.stringify(selectedAgent.config, null, 2)}
                      </pre>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentDashboard;
