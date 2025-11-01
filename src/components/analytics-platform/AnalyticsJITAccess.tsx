import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export function AnalyticsJITAccess() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: workspaces } = useQuery({
    queryKey: ["analytics-workspaces"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("analytics-workspace-manager", {
        body: { action: "list" },
      });
      if (error) throw error;
      return data.workspaces || [];
    },
  });

  const { data: requests } = useQuery({
    queryKey: ["analytics-jit-requests", selectedWorkspace],
    enabled: !!selectedWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("analytics-jit-access", {
        body: { action: "list_requests", payload: { workspace_id: selectedWorkspace } },
      });
      if (error) throw error;
      return data.requests || [];
    },
  });

  const requestMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.functions.invoke("analytics-jit-access", {
        body: { action: "request_access", payload },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-jit-requests"] });
      toast.success("Access request submitted");
      setIsRequestOpen(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("analytics-jit-access", {
        body: { action: "approve_request", payload: { id } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-jit-requests"] });
      toast.success("Access request approved");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("analytics-jit-access", {
        body: { action: "reject_request", payload: { id } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-jit-requests"] });
      toast.success("Access request rejected");
    },
  });

  const handleRequest = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    requestMutation.mutate({
      workspace_id: selectedWorkspace,
      resource_type: formData.get("resource_type"),
      resource_id: formData.get("resource_id"),
      access_level: formData.get("access_level"),
      justification: formData.get("justification"),
      duration_hours: parseInt(formData.get("duration_hours") as string),
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "rejected": return <XCircle className="h-4 w-4 text-red-600" />;
      case "expired": return <Clock className="h-4 w-4 text-gray-400" />;
      default: return <AlertCircle className="h-4 w-4 text-amber-600" />;
    }
  };

  const pending = requests?.filter((r: any) => r.status === 'pending').length || 0;
  const approved = requests?.filter((r: any) => r.status === 'approved').length || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Access</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approved}</div>
            <p className="text-xs text-muted-foreground">Currently granted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Access Requests</CardTitle>
              <CardDescription>Just-in-Time privileged access management</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces?.map((ws: any) => (
                    <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedWorkspace}>Request Access</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Temporary Access</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleRequest} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Resource Type</Label>
                      <Select name="resource_type" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="data_source">Data Source</SelectItem>
                          <SelectItem value="pipeline">Pipeline</SelectItem>
                          <SelectItem value="dashboard">Dashboard</SelectItem>
                          <SelectItem value="ml_model">ML Model</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Resource ID</Label>
                      <Input name="resource_id" required placeholder="uuid-of-resource" />
                    </div>

                    <div className="space-y-2">
                      <Label>Access Level</Label>
                      <Select name="access_level" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">Read Only</SelectItem>
                          <SelectItem value="write">Read & Write</SelectItem>
                          <SelectItem value="admin">Full Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Duration (hours)</Label>
                      <Input name="duration_hours" type="number" required min="1" max="72" defaultValue="4" />
                    </div>

                    <div className="space-y-2">
                      <Label>Business Justification</Label>
                      <Textarea name="justification" required rows={3} placeholder="Explain why you need this access..." />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsRequestOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={requestMutation.isPending}>
                        Submit Request
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {!selectedWorkspace ? (
              <p className="text-center text-muted-foreground py-8">Select a workspace to view requests</p>
            ) : requests?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No access requests found</p>
            ) : (
              requests?.map((request: any) => (
                <div key={request.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(request.status)}
                      <h4 className="font-medium">{request.resource_type}</h4>
                      <Badge>{request.access_level}</Badge>
                      <Badge variant="outline">{request.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{request.justification}</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Duration: {request.duration_hours}h | Expires: {request.expires_at ? new Date(request.expires_at).toLocaleString() : 'N/A'}</div>
                      <div>Requested: {new Date(request.created_at).toLocaleString()}</div>
                      {request.approved_at && <div>Approved: {new Date(request.approved_at).toLocaleString()}</div>}
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(request.id)}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(request.id)}>
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
