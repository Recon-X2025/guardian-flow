import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Database, TrendingUp, Package, Settings } from "lucide-react";
import { apiClient } from "@/integrations/api/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AnalyticsWorkspacesProps {
  workspaces: any[];
  isLoading: boolean;
}

export function AnalyticsWorkspaces({ workspaces, isLoading }: AnalyticsWorkspacesProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    workspace_type: "custom",
    storage_quota_gb: 1000,
    query_quota_per_day: 10000,
  });
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    try {
      const result = await apiClient.functions.invoke("analytics-workspace-manager", {
        body: {
          action: "create",
          payload: {
            name: formData.name,
            description: formData.description,
            workspace_type: formData.workspace_type,
            storage_quota_gb: formData.storage_quota_gb,
            query_quota_per_day: formData.query_quota_per_day,
          },
        },
      });

      if (result.error) throw result.error;

      toast.success("Workspace created successfully");
      setOpen(false);
      setFormData({
        name: "",
        description: "",
        workspace_type: "custom",
        storage_quota_gb: 1000,
        query_quota_per_day: 10000,
      });
      queryClient.invalidateQueries({ queryKey: ["analytics-workspaces"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to create workspace");
    }
  };

  const workspaceTypeIcons: Record<string, any> = {
    financial_services: TrendingUp,
    retail: Package,
    telecommunications: Database,
    manufacturing: Settings,
    energy_utilities: Database,
    logistics: Package,
    custom: Database,
  };

  if (isLoading) {
    return <div>Loading workspaces...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Analytics Workspaces</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Workspace
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Analytics Workspace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter workspace name"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the purpose of this workspace"
                />
              </div>

              <div>
                <Label htmlFor="type">Industry Type</Label>
                <Select
                  value={formData.workspace_type}
                  onValueChange={(value) => setFormData({ ...formData, workspace_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial_services">Financial Services</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="telecommunications">Telecommunications</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="energy_utilities">Energy & Utilities</SelectItem>
                    <SelectItem value="logistics">Logistics</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="storage">Storage Quota (GB)</Label>
                  <Input
                    id="storage"
                    type="number"
                    value={formData.storage_quota_gb}
                    onChange={(e) =>
                      setFormData({ ...formData, storage_quota_gb: parseInt(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="queries">Daily Query Quota</Label>
                  <Input
                    id="queries"
                    type="number"
                    value={formData.query_quota_per_day}
                    onChange={(e) =>
                      setFormData({ ...formData, query_quota_per_day: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Workspace</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workspaces?.map((workspace: any) => {
          const Icon = workspaceTypeIcons[workspace.workspace_type] || Database;
          return (
            <Card key={workspace.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{workspace.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {workspace.workspace_type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <Badge variant={workspace.status === "active" ? "default" : "secondary"}>
                    {workspace.status}
                  </Badge>
                </div>

                {workspace.description && (
                  <p className="text-sm text-muted-foreground">{workspace.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Storage</p>
                    <p className="text-sm font-medium">{workspace.storage_quota_gb} GB</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Daily Queries</p>
                    <p className="text-sm font-medium">{workspace.query_quota_per_day}</p>
                  </div>
                </div>

                <Button variant="outline" className="w-full" size="sm">
                  Manage Workspace
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {workspaces?.length === 0 && (
        <Card className="p-12 text-center">
          <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Workspaces Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first analytics workspace to get started
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Workspace
          </Button>
        </Card>
      )}
    </div>
  );
}
