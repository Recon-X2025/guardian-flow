import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Play, Plus, Pause, GitBranch, Clock } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
}

interface DataSource {
  id: string;
  name: string;
}

interface Pipeline {
  id: string;
  name: string;
  description?: string;
  status: string;
  schedule?: string;
  last_run_at?: string;
}

interface PipelinePayload {
  workspace_id: string;
  name: FormDataEntryValue | null;
  description: FormDataEntryValue | null;
  source_id: FormDataEntryValue | null;
  config: {
    transformations: Array<{
      type: string;
      condition?: string;
      group_by?: string[];
      metrics?: string[];
    }>;
  };
  schedule: FormDataEntryValue | null;
}

export function AnalyticsPipelines() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: workspaces } = useQuery({
    queryKey: ["analytics-workspaces"],
    queryFn: async () => {
      const result = await apiClient.functions.invoke("analytics-workspace-manager", {
        body: { action: "list" },
      });
      if (result.error) throw result.error;
      return result.data?.workspaces || [];
    },
  });

  const { data: dataSources } = useQuery({
    queryKey: ["analytics-data-sources", selectedWorkspace],
    enabled: !!selectedWorkspace,
    queryFn: async () => {
      const result = await apiClient.functions.invoke("analytics-data-source-manager", {
        body: { action: "list", payload: { workspace_id: selectedWorkspace } },
      });
      if (result.error) throw result.error;
      return result.data?.data_sources || [];
    },
  });

  const { data: pipelines } = useQuery({
    queryKey: ["analytics-pipelines", selectedWorkspace],
    enabled: !!selectedWorkspace,
    queryFn: async () => {
      const result = await apiClient.functions.invoke("analytics-pipeline-executor", {
        body: { action: "list_pipelines", payload: { workspace_id: selectedWorkspace } },
      });
      if (result.error) throw result.error;
      return result.data?.pipelines || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: PipelinePayload) => {
      const result = await apiClient.functions.invoke("analytics-pipeline-executor", {
        body: { action: "create", payload },
      });
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-pipelines"] });
      toast.success("Pipeline created successfully");
      setIsCreateOpen(false);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      workspace_id: selectedWorkspace,
      name: formData.get("name"),
      description: formData.get("description"),
      source_id: formData.get("source_id"),
      config: {
        transformations: [
          { type: "filter", condition: "status = 'active'" },
          { type: "aggregate", group_by: ["category"], metrics: ["count", "sum"] }
        ]
      },
      schedule: formData.get("schedule"),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces?.map((ws: Workspace) => (
                <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedWorkspace}>
              <Plus className="h-4 w-4 mr-2" />
              New Pipeline
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Data Pipeline</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Pipeline Name</Label>
                <Input name="name" required placeholder="Customer Data ETL" />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea name="description" placeholder="Extract, transform, and load customer data" />
              </div>

              <div className="space-y-2">
                <Label>Data Source</Label>
                <Select name="source_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataSources?.map((source: DataSource) => (
                      <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Schedule (Cron)</Label>
                <Input name="schedule" placeholder="0 */4 * * *" />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  Create Pipeline
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!selectedWorkspace ? (
        <Card className="p-12 text-center">
          <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Workspace</h3>
          <p className="text-muted-foreground">
            Choose a workspace to view and manage its data pipelines
          </p>
        </Card>
      ) : pipelines?.length === 0 ? (
        <Card className="p-12 text-center">
          <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pipelines</h3>
          <p className="text-muted-foreground mb-4">
            Create your first data pipeline to automate ETL processes
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Pipeline
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pipelines?.map((pipeline: Pipeline) => (
            <Card key={pipeline.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-semibold">{pipeline.name}</h4>
                    <Badge variant="outline" className="mt-1">{pipeline.status}</Badge>
                  </div>
                </div>
              </div>

              {pipeline.description && (
                <p className="text-sm text-muted-foreground mb-3">{pipeline.description}</p>
              )}

              <div className="text-xs text-muted-foreground space-y-1 mb-4">
                {pipeline.schedule && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Schedule: {pipeline.schedule}
                  </div>
                )}
                {pipeline.last_run_at && (
                  <div>Last run: {new Date(pipeline.last_run_at).toLocaleString()}</div>
                )}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Play className="h-3 w-3 mr-1" />
                  Run Now
                </Button>
                <Button size="sm" variant="outline">
                  <Pause className="h-3 w-3 mr-1" />
                  Pause
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}