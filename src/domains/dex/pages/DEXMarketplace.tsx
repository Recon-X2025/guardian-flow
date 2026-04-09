import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Download, Store, Upload } from "lucide-react";

const mockListings = [
  { id: "l1", name: "Emergency Dispatch Flow", author: "GuardianFlow", description: "Priority escalation with auto-notify", steps: 5, rating: 4.8, reviews: 24, installs: 142, category: "Field Service" },
  { id: "l2", name: "Preventive Maintenance PM", author: "OpsTech Labs", description: "Scheduled PM with checklist gate", steps: 7, rating: 4.5, reviews: 18, installs: 89, category: "Maintenance" },
  { id: "l3", name: "Customer Onboarding", author: "CX Partners", description: "Full customer onboarding workflow", steps: 9, rating: 4.2, reviews: 11, installs: 47, category: "Customer Success" },
];

const mockInstalled = [
  { id: "i1", listing_id: "l1", name: "Emergency Dispatch Flow", installed_at: "2024-01-08", version: "2.1" },
];

export default function DEXMarketplace() {
  const [tab, setTab] = useState("browse");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Store className="h-6 w-6" />DEX Marketplace</h1>
          <p className="text-muted-foreground">Discover and install shared execution flow templates</p>
        </div>
        <Button size="sm"><Upload className="h-4 w-4 mr-2" />Publish Flow</Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="installed">Installed</TabsTrigger>
        </TabsList>
        <TabsContent value="browse" className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {mockListings.map(l => (
            <Card key={l.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm">{l.name}</CardTitle>
                  <Badge variant="secondary">{l.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{l.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500 fill-amber-500" />{l.rating} ({l.reviews})</span>
                  <span>{l.installs} installs</span>
                  <span>{l.steps} steps</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">by {l.author}</span>
                  <Button size="sm"><Download className="h-3 w-3 mr-1" />Install</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="installed" className="space-y-2 mt-4">
          {mockInstalled.map(i => (
            <Card key={i.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{i.name}</p>
                  <p className="text-xs text-muted-foreground">v{i.version} · Installed {i.installed_at}</p>
                </div>
                <Badge>Installed</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
