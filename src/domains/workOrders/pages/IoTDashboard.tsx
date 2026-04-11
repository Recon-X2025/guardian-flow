import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Cpu, Wifi, WifiOff, Plus, Trash2, Radio } from "lucide-react";
import { useToast } from "@/domains/shared/hooks/use-toast";

interface IoTDevice {
  id: string;
  device_id: string;
  name?: string;
  status?: string;
  last_seen?: string;
  last_seen_at?: string;
  last_metric?: string;
  last_value?: number;
}

interface IoTReading {
  id: string;
  device_id: string;
  metric: string;
  value: number;
  unit: string;
  timestamp: string;
}

interface IoTRule {
  id: string;
  device_id: string;
  metric: string;
  condition: string;
  threshold: number;
  action: string;
  active: boolean;
}

interface RegisterForm {
  name: string;
  deviceId: string;
}

interface NewCredentials {
  clientId: string;
  password: string;
  deviceId: string;
}

interface RuleForm {
  device_id: string;
  metric: string;
  condition: string;
  threshold: string;
  action: string;
}

export default function IoTDashboard() {
  const [tab, setTab] = useState("devices");
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [newCredentials, setNewCredentials] = useState<NewCredentials | null>(null);
  const [registerForm, setRegisterForm] = useState<RegisterForm>({ name: "", deviceId: "" });
  const [ruleForm, setRuleForm] = useState<RuleForm>({ device_id: "", metric: "", condition: "gt", threshold: "", action: "send_alert" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ["iot-devices"],
    queryFn: async () => {
      const res = await fetch("/api/iot/devices");
      if (!res.ok) throw new Error("Failed to load devices");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: readingsData, isLoading: readingsLoading } = useQuery({
    queryKey: ["iot-readings"],
    queryFn: async () => {
      const res = await fetch("/api/iot/readings?limit=50");
      if (!res.ok) throw new Error("Failed to load readings");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: rulesData } = useQuery({
    queryKey: ["iot-rules"],
    queryFn: async () => {
      const res = await fetch("/api/iot/rules");
      if (!res.ok) throw new Error("Failed to load rules");
      return res.json();
    },
  });

  const { data: mqttStatus } = useQuery({
    queryKey: ["iot-mqtt-status"],
    queryFn: async () => {
      const res = await fetch("/api/iot/mqtt/status");
      if (!res.ok) return { connected: false, broker: "N/A" };
      return res.json();
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (form: RegisterForm) => {
      const res = await fetch("/api/iot/devices/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, deviceId: form.deviceId }),
      });
      if (!res.ok) throw new Error("Registration failed");
      return res.json();
    },
    onSuccess: (data) => {
      setShowRegisterDialog(false);
      setNewCredentials({ clientId: data.clientId, password: data.password, deviceId: data.device?.device_id || "" });
      queryClient.invalidateQueries({ queryKey: ["iot-devices"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createRuleMutation = useMutation({
    mutationFn: async (form: RuleForm) => {
      const res = await fetch("/api/iot/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, threshold: parseFloat(form.threshold) }),
      });
      if (!res.ok) throw new Error("Failed to create rule");
      return res.json();
    },
    onSuccess: () => {
      setShowRuleDialog(false);
      toast({ title: "Rule created" });
      queryClient.invalidateQueries({ queryKey: ["iot-rules"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await fetch(`/api/iot/rules/${ruleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete rule");
    },
    onSuccess: () => {
      toast({ title: "Rule deleted" });
      queryClient.invalidateQueries({ queryKey: ["iot-rules"] });
    },
  });

  const devices: IoTDevice[] = devicesData?.devices || [];
  const readings: IoTReading[] = readingsData?.readings || [];
  const rules: IoTRule[] = rulesData?.rules || [];
  const online = devices.filter(d => d.status === "online" || d.status === "active").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">IoT Telemetry</h1>
          <p className="text-muted-foreground">Real-time device telemetry ingestion and monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={mqttStatus?.connected ? "default" : "secondary"} className="flex items-center gap-1">
            <Radio className="h-3 w-3" />
            MQTT: {mqttStatus?.connected ? "Connected" : "Stub"}
          </Badge>
          <Button size="sm" onClick={() => setShowRegisterDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Register Device
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Devices</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold flex items-center gap-2"><Cpu className="h-5 w-5 text-primary" />{devicesLoading ? "…" : devices.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Online</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold flex items-center gap-2"><Wifi className="h-5 w-5 text-green-500" />{online}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Offline</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold flex items-center gap-2"><WifiOff className="h-5 w-5 text-red-500" />{devices.length - online}</div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="readings">Recent Readings</TabsTrigger>
          <TabsTrigger value="rules">Threshold Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-2 mt-4">
          {devicesLoading && <p className="text-sm text-muted-foreground">Loading devices…</p>}
          {devices.length === 0 && !devicesLoading && (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No devices registered yet. Click "Register Device" to add one.</CardContent></Card>
          )}
          {devices.map(d => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{d.name || d.device_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.last_metric ? `${d.last_metric}: ` : ""}
                      <span className="font-semibold">{d.last_value !== undefined ? d.last_value : "—"}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {d.last_seen_at ? new Date(d.last_seen_at).toLocaleTimeString() : d.last_seen || "—"}
                  </span>
                  <Badge variant={d.status === "online" || d.status === "active" ? "default" : "destructive"}>
                    {d.status || "unknown"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="readings" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {readingsLoading ? (
                <p className="text-sm text-muted-foreground py-4">Loading readings…</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-muted-foreground border-b"><th className="text-left pb-2">Device</th><th className="text-left pb-2">Metric</th><th className="text-left pb-2">Value</th><th className="text-left pb-2">Time</th></tr></thead>
                  <tbody>
                    {readings.length === 0 && (
                      <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No readings yet.</td></tr>
                    )}
                    {readings.map(r => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2">{r.device_id}</td>
                        <td>{r.metric}</td>
                        <td>{r.value} {r.unit}</td>
                        <td className="text-muted-foreground">{new Date(r.timestamp).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowRuleDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Rule
            </Button>
          </div>
          {rules.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No threshold rules. Add one to auto-create work orders or send alerts.</CardContent></Card>
          )}
          {rules.map(r => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="text-sm">
                  <span className="font-medium">{r.device_id}</span>
                  <span className="text-muted-foreground mx-2">·</span>
                  <span>{r.metric} {r.condition} {r.threshold}</span>
                  <span className="text-muted-foreground mx-2">→</span>
                  <Badge variant="outline">{r.action}</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteRuleMutation.mutate(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Register Device Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Device</DialogTitle>
            <DialogDescription>Create a new IoT device and generate MQTT credentials.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Device Name</Label>
              <Input placeholder="e.g., Pump Station Alpha" value={registerForm.name} onChange={e => setRegisterForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Device ID</Label>
              <Input placeholder="e.g., pump-alpha-01" value={registerForm.deviceId} onChange={e => setRegisterForm(f => ({ ...f, deviceId: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegisterDialog(false)}>Cancel</Button>
            <Button onClick={() => registerMutation.mutate(registerForm)} disabled={registerMutation.isPending || !registerForm.deviceId}>
              {registerMutation.isPending ? "Registering…" : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show credentials after registration */}
      <Dialog open={!!newCredentials} onOpenChange={() => setNewCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Device Credentials</DialogTitle>
            <DialogDescription>Save these credentials — the password will not be shown again.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 font-mono text-sm bg-muted p-4 rounded">
            <div><span className="text-muted-foreground">Client ID: </span>{newCredentials?.clientId}</div>
            <div><span className="text-muted-foreground">Password: </span>{newCredentials?.password}</div>
            <div><span className="text-muted-foreground">Topic: </span>gf/YOUR_TENANT/devices/{newCredentials?.deviceId}/telemetry</div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Threshold Rule</DialogTitle>
            <DialogDescription>Trigger actions when a metric crosses a threshold.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Device ID</Label>
              <Input placeholder="device-id" value={ruleForm.device_id} onChange={e => setRuleForm(f => ({ ...f, device_id: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Metric</Label>
              <Input placeholder="e.g., temperature" value={ruleForm.metric} onChange={e => setRuleForm(f => ({ ...f, metric: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={ruleForm.condition} onValueChange={v => setRuleForm(f => ({ ...f, condition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["gt", "lt", "gte", "lte", "eq"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Threshold</Label>
                <Input type="number" placeholder="0" value={ruleForm.threshold} onChange={e => setRuleForm(f => ({ ...f, threshold: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={ruleForm.action} onValueChange={v => setRuleForm(f => ({ ...f, action: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_alert">Send Alert</SelectItem>
                  <SelectItem value="create_work_order">Create Work Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>Cancel</Button>
            <Button onClick={() => createRuleMutation.mutate(ruleForm)} disabled={createRuleMutation.isPending || !ruleForm.device_id || !ruleForm.metric || !ruleForm.threshold}>
              {createRuleMutation.isPending ? "Creating…" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
