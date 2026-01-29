import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Lock, Key, Shield, RefreshCw, Eye, EyeOff, Plus } from "lucide-react";

export function AnalyticsSecurity() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [showKeyValues, setShowKeyValues] = useState<Record<string, boolean>>({});
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

  // Mock encryption keys data
  const encryptionKeys = [
    {
      id: "key-1",
      name: "Master Encryption Key",
      algorithm: "AES-256-GCM",
      status: "active",
      created_at: "2025-01-15T10:00:00Z",
      rotated_at: "2025-10-01T10:00:00Z",
      next_rotation: "2026-04-01T10:00:00Z",
      usage: "data-at-rest",
    },
    {
      id: "key-2",
      name: "Transit Encryption Key",
      algorithm: "RSA-4096",
      status: "active",
      created_at: "2025-02-20T10:00:00Z",
      rotated_at: "2025-09-15T10:00:00Z",
      next_rotation: "2026-03-15T10:00:00Z",
      usage: "data-in-transit",
    },
    {
      id: "key-3",
      name: "Backup Encryption Key",
      algorithm: "AES-256-GCM",
      status: "pending_rotation",
      created_at: "2024-06-10T10:00:00Z",
      rotated_at: "2025-05-01T10:00:00Z",
      next_rotation: "2025-11-01T10:00:00Z",
      usage: "backup",
    },
  ];

  // Mock access policies data
  const accessPolicies = [
    {
      id: "policy-1",
      name: "Data Engineer Access",
      resource: "data_sources",
      actions: ["read", "write", "execute"],
      conditions: { time: "business_hours", location: "corporate_network" },
      status: "active",
    },
    {
      id: "policy-2",
      name: "Analyst Read-Only",
      resource: "dashboards",
      actions: ["read"],
      conditions: { mfa_required: true },
      status: "active",
    },
    {
      id: "policy-3",
      name: "Admin Full Access",
      resource: "*",
      actions: ["*"],
      conditions: { mfa_required: true, ip_whitelist: true },
      status: "active",
    },
  ];

  const handleRotateKey = (keyId: string) => {
    toast.success(`Key rotation initiated for ${keyId}`);
    queryClient.invalidateQueries({ queryKey: ["encryption-keys"] });
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeyValues(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Encryption Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{encryptionKeys.length}</div>
            <p className="text-xs text-muted-foreground">Active keys</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Access Policies</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accessPolicies.length}</div>
            <p className="text-xs text-muted-foreground">Active policies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Rotations</CardTitle>
            <RefreshCw className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {encryptionKeys.filter(k => k.status === 'pending_rotation').length}
            </div>
            <p className="text-xs text-muted-foreground">Requires action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Lock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98%</div>
            <p className="text-xs text-muted-foreground">Excellent</p>
          </CardContent>
        </Card>
      </div>

      {/* Encryption Keys Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Encryption Key Management</CardTitle>
              <CardDescription>Manage encryption keys and rotation schedules</CardDescription>
            </div>
            <Dialog open={isKeyDialogOpen} onOpenChange={setIsKeyDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate New Encryption Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Key Name</Label>
                    <Input placeholder="My Encryption Key" />
                  </div>
                  <div className="space-y-2">
                    <Label>Algorithm</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select algorithm" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aes-256">AES-256-GCM</SelectItem>
                        <SelectItem value="rsa-4096">RSA-4096</SelectItem>
                        <SelectItem value="chacha20">ChaCha20-Poly1305</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Usage</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select usage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="data-at-rest">Data at Rest</SelectItem>
                        <SelectItem value="data-in-transit">Data in Transit</SelectItem>
                        <SelectItem value="backup">Backups</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={() => {
                    toast.success("Encryption key generated");
                    setIsKeyDialogOpen(false);
                  }}>
                    Generate Key
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {encryptionKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">{key.name}</h4>
                    <Badge variant={key.status === 'active' ? 'default' : 'secondary'}>
                      {key.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline">{key.algorithm}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Usage: {key.usage} | Created: {new Date(key.created_at).toLocaleDateString()}</div>
                    <div>Last Rotated: {new Date(key.rotated_at).toLocaleDateString()} | Next: {new Date(key.next_rotation).toLocaleDateString()}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        {showKeyValues[key.id] ? 'c8f9a2b3-4d5e-6f7g-8h9i-0j1k2l3m4n5o' : '••••••••••••••••'}
                      </code>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => toggleKeyVisibility(key.id)}
                      >
                        {showKeyValues[key.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleRotateKey(key.id)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Rotate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Access Policies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Access Control Policies</CardTitle>
              <CardDescription>Fine-grained access control and authorization rules</CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Policy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {accessPolicies.map((policy) => (
              <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">{policy.name}</h4>
                    <Badge>{policy.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Resource: <code className="bg-muted px-1 rounded">{policy.resource}</code></div>
                    <div>Actions: {policy.actions.map(a => (
                      <code key={a} className="bg-muted px-1 rounded mr-1">{a}</code>
                    ))}</div>
                    <div>Conditions: {JSON.stringify(policy.conditions)}</div>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  Edit Policy
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
