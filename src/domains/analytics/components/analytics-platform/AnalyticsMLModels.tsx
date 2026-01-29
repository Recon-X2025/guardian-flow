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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Brain, Play, Plus, TrendingUp, Activity } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function AnalyticsMLModels() {
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

  const { data: models } = useQuery({
    queryKey: ["analytics-ml-models", selectedWorkspace],
    enabled: !!selectedWorkspace,
    queryFn: async () => {
      const result = await apiClient.functions.invoke("analytics-ml-orchestrator", {
        body: { action: "list", payload: { workspace_id: selectedWorkspace } },
      });
      if (result.error) throw result.error;
      return result.data?.models || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const result = await apiClient.functions.invoke("analytics-ml-orchestrator", {
        body: { action: "create", payload },
      });
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-ml-models"] });
      toast.success("ML model created successfully");
      setIsCreateOpen(false);
    },
  });

  const deployMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await apiClient.functions.invoke("analytics-ml-orchestrator", {
        body: { action: "deploy", payload: { id } },
      });
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-ml-models"] });
      toast.success("Model deployed successfully");
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      workspace_id: selectedWorkspace,
      name: formData.get("name"),
      description: formData.get("description"),
      model_type: formData.get("model_type"),
      framework: formData.get("framework"),
      version: "1.0.0",
      config: {},
    });
  };

  // Mock performance data
  const performanceData = [
    { epoch: 1, train_acc: 0.65, val_acc: 0.62, train_loss: 0.45, val_loss: 0.48 },
    { epoch: 2, train_acc: 0.72, val_acc: 0.69, train_loss: 0.38, val_loss: 0.41 },
    { epoch: 3, train_acc: 0.78, val_acc: 0.74, train_loss: 0.32, val_loss: 0.36 },
    { epoch: 4, train_acc: 0.83, val_acc: 0.79, train_loss: 0.27, val_loss: 0.31 },
    { epoch: 5, train_acc: 0.87, val_acc: 0.82, train_loss: 0.23, val_loss: 0.28 },
    { epoch: 6, train_acc: 0.90, val_acc: 0.85, train_loss: 0.19, val_loss: 0.25 },
    { epoch: 7, train_acc: 0.92, val_acc: 0.87, train_loss: 0.16, val_loss: 0.22 },
    { epoch: 8, train_acc: 0.94, val_acc: 0.89, train_loss: 0.13, val_loss: 0.19 },
    { epoch: 9, train_acc: 0.95, val_acc: 0.90, train_loss: 0.11, val_loss: 0.17 },
    { epoch: 10, train_acc: 0.96, val_acc: 0.91, train_loss: 0.09, val_loss: 0.15 },
  ];

  const metricsData = [
    { metric: "Accuracy", value: 91 },
    { metric: "Precision", value: 89 },
    { metric: "Recall", value: 87 },
    { metric: "F1 Score", value: 88 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces?.map((ws: any) => (
                <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedWorkspace}>
              <Plus className="h-4 w-4 mr-2" />
              Train New Model
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Train ML Model</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Model Name</Label>
                <Input name="name" required placeholder="Customer Churn Predictor" />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea name="description" placeholder="Predicts customer churn probability" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Model Type</Label>
                  <Select name="model_type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classification">Classification</SelectItem>
                      <SelectItem value="regression">Regression</SelectItem>
                      <SelectItem value="clustering">Clustering</SelectItem>
                      <SelectItem value="time_series">Time Series</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Framework</Label>
                  <Select name="framework" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select framework" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tensorflow">TensorFlow</SelectItem>
                      <SelectItem value="pytorch">PyTorch</SelectItem>
                      <SelectItem value="sklearn">Scikit-learn</SelectItem>
                      <SelectItem value="xgboost">XGBoost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  Start Training
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{models?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Trained models</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Deployed</CardTitle>
            <Play className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {models?.filter((m: any) => m.status === 'deployed').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">In production</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">91%</div>
            <p className="text-xs text-muted-foreground">Across all models</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Predictions/Day</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">245K</div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>
      </div>

      {/* Models List */}
      <Card>
        <CardHeader>
          <CardTitle>ML Models</CardTitle>
          <CardDescription>Manage and deploy machine learning models</CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedWorkspace ? (
            <p className="text-center text-muted-foreground py-8">Select a workspace to view models</p>
          ) : models?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No models found</p>
          ) : (
            <div className="space-y-3">
              {models?.map((model: any) => (
                <div key={model.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">{model.name}</h4>
                      <Badge>{model.status}</Badge>
                      <Badge variant="outline">{model.framework}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{model.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Type: {model.model_type}</span>
                      <span>Version: {model.version}</span>
                      <span>Created: {new Date(model.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {model.status === 'training' && (
                    <Button size="sm" disabled>
                      <Play className="h-3 w-3 mr-1" />
                      Training...
                    </Button>
                  )}
                  {model.status !== 'deployed' && model.status !== 'training' && (
                    <Button 
                      size="sm" 
                      onClick={() => deployMutation.mutate(model.id)}
                      disabled={deployMutation.isPending}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Deploy
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Training Progress</CardTitle>
            <CardDescription>Accuracy over training epochs</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="epoch" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="train_acc" stroke="#8884d8" name="Training" />
                <Line type="monotone" dataKey="val_acc" stroke="#82ca9d" name="Validation" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Metrics</CardTitle>
            <CardDescription>Performance evaluation metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metricsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}