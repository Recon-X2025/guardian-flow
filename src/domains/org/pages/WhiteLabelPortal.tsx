import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Globe, Eye, Save } from "lucide-react";

const mockConfig = {
  company_name: "Acme Field Services",
  primary_color: "#2563eb",
  secondary_color: "#64748b",
  logo_url: "https://placehold.co/200x60?text=ACME",
  domain: "acme.guardianflow.io",
  features_enabled: ["analytics", "iot_dashboard", "customer_portal", "work_orders"],
};

const mockThemes = [
  { id: "th1", name: "Guardian Blue", primary: "#2563eb", secondary: "#64748b" },
  { id: "th2", name: "Forest Green", primary: "#16a34a", secondary: "#374151" },
  { id: "th3", name: "Slate Dark", primary: "#6366f1", secondary: "#1e293b" },
  { id: "th4", name: "Amber Energy", primary: "#d97706", secondary: "#292524" },
];

export default function WhiteLabelPortal() {
  const [config, setConfig] = useState(mockConfig);
  const [tab, setTab] = useState("branding");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">White-Label Portal</h1>
          <p className="text-muted-foreground">Customise branding, features and domain for your tenants</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline"><Eye className="h-4 w-4 mr-2" />Preview</Button>
          <Button size="sm"><Save className="h-4 w-4 mr-2" />Save</Button>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>
        <TabsContent value="branding" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Palette className="h-4 w-4" />Brand Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-muted-foreground">Company Name</label><p className="text-sm font-medium mt-1">{config.company_name}</p></div>
                <div><label className="text-xs font-medium text-muted-foreground">Domain</label><p className="text-sm font-medium mt-1 flex items-center gap-1"><Globe className="h-3 w-3" />{config.domain}</p></div>
                <div><label className="text-xs font-medium text-muted-foreground">Primary Colour</label><div className="flex items-center gap-2 mt-1"><div className="h-5 w-5 rounded border" style={{ background: config.primary_color }} /><span className="text-sm font-mono">{config.primary_color}</span></div></div>
                <div><label className="text-xs font-medium text-muted-foreground">Logo URL</label><p className="text-xs text-muted-foreground mt-1 truncate">{config.logo_url}</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="themes" className="grid grid-cols-2 gap-3 mt-4">
          {mockThemes.map(t => (
            <Card key={t.id} className="cursor-pointer hover:ring-2 hover:ring-primary">
              <CardContent className="py-3 flex items-center gap-3">
                <div className="flex gap-1"><div className="h-8 w-8 rounded-l" style={{ background: t.primary }} /><div className="h-8 w-8 rounded-r" style={{ background: t.secondary }} /></div>
                <span className="text-sm font-medium">{t.name}</span>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="features" className="space-y-2 mt-4">
          {["analytics", "iot_dashboard", "customer_portal", "work_orders", "federated_learning", "dex_marketplace"].map(feat => (
            <Card key={feat}>
              <CardContent className="py-3 flex items-center justify-between">
                <span className="text-sm capitalize">{feat.replace(/_/g, " ")}</span>
                <Badge variant={config.features_enabled.includes(feat) ? "default" : "secondary"}>
                  {config.features_enabled.includes(feat) ? "Enabled" : "Disabled"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
