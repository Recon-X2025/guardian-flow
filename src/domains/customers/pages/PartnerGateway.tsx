import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Building2, CheckCircle2, Clock, PlusCircle, ShieldX, Loader2 } from "lucide-react";
import { useToast } from "@/domains/shared/hooks/use-toast";

interface CrowdPartner {
  id: string;
  orgName: string;
  contactEmail: string;
  skills: string[];
  territories: string[];
  status: "invited" | "active" | "suspended";
  webhookUrl?: string;
  createdAt: string;
}

interface PendingWO {
  id: string;
  wo_number?: string;
  crowd_status?: string;
  crowd_partner_id?: string;
}

const STATUS_COLOR: Record<string, string> = {
  active:    "bg-green-100 text-green-800",
  invited:   "bg-yellow-100 text-yellow-800",
  suspended: "bg-red-100 text-red-800",
};

export default function PartnerGateway() {
  const { toast } = useToast();
  const [tab, setTab]               = useState("partners");
  const [partners, setPartners]     = useState<CrowdPartner[]>([]);
  const [pendingWOs, setPendingWOs] = useState<PendingWO[]>([]);
  const [loading, setLoading]       = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    orgName: "", contactEmail: "", skills: "", webhookUrl: "",
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [pRes, woRes] = await Promise.all([
        fetch("/api/crowd/partners"),
        fetch("/api/work-orders?crowd_status=pending_acceptance"),
      ]);
      if (pRes.ok) {
        const { partners: data } = await pRes.json();
        setPartners(data || []);
      }
      if (woRes.ok) {
        const { workOrders } = await woRes.json();
        setPendingWOs((workOrders || []).filter((wo: PendingWO) => wo.crowd_status === "pending_acceptance"));
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/crowd/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName:      form.orgName,
          contactEmail: form.contactEmail,
          skills:       form.skills.split(",").map(s => s.trim()).filter(Boolean),
          webhookUrl:   form.webhookUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Partner invited", description: `${form.orgName} has been invited.` });
      setInviteOpen(false);
      setForm({ orgName: "", contactEmail: "", skills: "", webhookUrl: "" });
      fetchAll();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(partnerId: string) {
    try {
      const res = await fetch(`/api/crowd/partners/${partnerId}/approve`, { method: "PUT" });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Partner approved" });
      fetchAll();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }
  }

  async function handleSuspend(partnerId: string) {
    try {
      const res = await fetch(`/api/crowd/partners/${partnerId}/suspend`, { method: "PUT" });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Partner suspended" });
      fetchAll();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crowd Marketplace</h1>
          <p className="text-muted-foreground">Manage crowd partner organisations and WO assignments</p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />Invite Partner
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="pending">
            Pending WOs
            {pendingWOs.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{pendingWOs.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="partners" className="space-y-3 mt-4">
          {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
          {!loading && partners.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No crowd partners yet. Invite one to get started.</p>
          )}
          {partners.map(p => (
            <Card key={p.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{p.orgName}</span>
                    <Badge className={STATUS_COLOR[p.status] || ""}>{p.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    {p.status === "invited" && (
                      <Button size="sm" variant="outline" onClick={() => handleApprove(p.id)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                      </Button>
                    )}
                    {p.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => handleSuspend(p.id)}>
                        <ShieldX className="h-3 w-3 mr-1" />Suspend
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{p.contactEmail}</p>
                {p.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.skills.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingWOs.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No pending crowd WOs.</p>
          )}
          {pendingWOs.map(wo => (
            <Card key={wo.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">{wo.wo_number || wo.id.slice(0, 8)}</span>
                  <Badge variant="outline">Pending Acceptance</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Crowd Partner</DialogTitle>
            <DialogDescription>Send an invitation to a new crowd partner organisation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <Label>Organisation Name *</Label>
              <Input
                value={form.orgName}
                onChange={e => setForm(f => ({ ...f, orgName: e.target.value }))}
                placeholder="Acme Field Services"
                required
              />
            </div>
            <div>
              <Label>Contact Email *</Label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                placeholder="contact@acme.com"
                required
              />
            </div>
            <div>
              <Label>Skills (comma-separated)</Label>
              <Input
                value={form.skills}
                onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
                placeholder="electrical, hvac, plumbing"
              />
            </div>
            <div>
              <Label>Webhook URL (optional)</Label>
              <Input
                value={form.webhookUrl}
                onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))}
                placeholder="https://partner.example.com/hooks/gf"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Invitation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
