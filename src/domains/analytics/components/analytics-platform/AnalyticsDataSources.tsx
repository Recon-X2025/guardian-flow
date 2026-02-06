import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Database, Plus, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { toast } from "sonner";

interface Workspace {
  id: string;
  name: string;
}

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  sync_schedule?: string;
  last_sync_at?: string;
}

interface DataSourcePayload {
  workspace_id: string;
  type: FormDataEntryValue | null;
  name: FormDataEntryValue | null;
  description: FormDataEntryValue | null;
  config: {
    host: FormDataEntryValue | null;
    port: FormDataEntryValue | null;
    database: FormDataEntryValue | null;
    username: FormDataEntryValue | null;
  };
  sync_schedule: FormDataEntryValue | null;
}

export function AnalyticsDataSources() {
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

  const { data: dataSources, isLoading } = useQuery({
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

  const createMutation = useMutation({
    mutationFn: async (payload: DataSourcePayload) => {
      const result = await apiClient.functions.invoke("analytics-data-source-manager", {
        body: { action: "create", payload },
      });
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-data-sources"] });
      toast.success("Data source created successfully");
      setIsCreateOpen(false);
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await apiClient.functions.invoke("analytics-data-source-manager", {
        body: { action: "test_connection", payload: { id } },
      });
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-data-sources"] });
      toast.success("Connection test successful");
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      workspace_id: selectedWorkspace,
      type: formData.get("type"),
      name: formData.get("name"),
      description: formData.get("description"),
      config: {
        host: formData.get("host"),
        port: formData.get("port"),
        database: formData.get("database"),
        username: formData.get("username"),
      },
      sync_schedule: formData.get("sync_schedule"),
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error": return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Label>Workspace:</Label>
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
              Add Data Source
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Connect New Data Source</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Source Type</Label>
                  <Select name="type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mongodb">MongoDB</SelectItem>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="s3">Amazon S3</SelectItem>
                      <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                      <SelectItem value="api">REST API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input name="name" required placeholder="Production DB" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea name="description" placeholder="Optional description" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="host">Host</Label>
                  <Input name="host" placeholder="db.example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input name="port" type="number" placeholder="5432" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="database">Database</Label>
                  <Input name="database" placeholder="production" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input name="username" placeholder="readonly_user" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sync_schedule">Sync Schedule (Cron)</Label>
                <Input name="sync_schedule" placeholder="0 */6 * * *" />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Data Source"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!selectedWorkspace ? (
        <Card className="p-12 text-center">
          <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Workspace</h3>
          <p className="text-muted-foreground">
            Choose a workspace above to view and manage its data sources
          </p>
        </Card>
      ) : isLoading ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Loading data sources...</p>
        </Card>
      ) : dataSources?.length === 0 ? (
        <Card className="p-12 text-center">
          <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Data Sources</h3>
          <p className="text-muted-foreground mb-4">
            Connect your first data source to start building pipelines
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Data Source
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dataSources?.map((source: DataSource) => (
            <Card key={source.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-semibold">{source.name}</h4>
                    <Badge variant="outline" className="mt-1">{source.type}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(source.status)}
                </div>
              </div>

              {source.description && (
                <p className="text-sm text-muted-foreground mb-3">{source.description}</p>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                {source.sync_schedule && (
                  <div>Schedule: {source.sync_schedule}</div>
                )}
                {source.last_sync_at && (
                  <div>Last sync: {new Date(source.last_sync_at).toLocaleString()}</div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => testConnectionMutation.mutate(source.id)}
                  disabled={testConnectionMutation.isPending}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Test
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
