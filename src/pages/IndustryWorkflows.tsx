import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Zap, Shield, Truck, Wrench, Play, Eye } from "lucide-react";

const industryIcons: Record<string, any> = {
  healthcare: Shield,
  utilities: Zap,
  insurance: Building2,
  logistics: Truck,
  field_service: Wrench,
};

export default function IndustryWorkflows() {
  const [selectedIndustry, setSelectedIndustry] = useState<string>("healthcare");

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["workflow-templates", selectedIndustry],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_templates" as any)
        .select("*")
        .eq("industry_type", selectedIndustry)
        .eq("active", true)
        .order("created_at", { ascending: false }) as any;

      if (error) throw error;
      return data || [];
    },
  });

  const industries = [
    {
      value: "healthcare",
      label: "Healthcare",
      description: "Patient care, medical equipment service, HIPAA compliance",
      color: "bg-blue-500",
    },
    {
      value: "utilities",
      label: "Utilities",
      description: "Power, water, gas infrastructure maintenance and outage management",
      color: "bg-yellow-500",
    },
    {
      value: "insurance",
      label: "Insurance",
      description: "Claims adjudication, damage assessment, fraud prevention",
      color: "bg-green-500",
    },
    {
      value: "logistics",
      label: "Logistics",
      description: "Last-mile delivery, route optimization, shipment tracking",
      color: "bg-purple-500",
    },
    {
      value: "field_service",
      label: "Field Service",
      description: "General field operations, equipment maintenance, installations",
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Industry Workflows</h1>
        <p className="text-muted-foreground">
          Pre-configured workflow templates optimized for specific industries
        </p>
      </div>

      {/* Industry Selector */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {industries.map((industry) => {
          const Icon = industryIcons[industry.value];
          const isSelected = selectedIndustry === industry.value;
          
          return (
            <Card
              key={industry.value}
              className={`cursor-pointer transition-all ${
                isSelected ? "ring-2 ring-primary" : "hover:shadow-lg"
              }`}
              onClick={() => setSelectedIndustry(industry.value)}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${industry.color} bg-opacity-20`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-sm">{industry.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {industry.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Workflow Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const Icon = industryIcons[selectedIndustry];
              return <Icon className="h-5 w-5" />;
            })()}
            {industries.find((i) => i.value === selectedIndustry)?.label} Workflows
          </CardTitle>
          <CardDescription>
            Configurable workflow templates with industry-specific compliance and validation rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading workflows...
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No workflows configured for this industry yet
              </p>
              <Button>Create First Workflow</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow Name</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow: any) => (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{workflow.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {workflow.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {workflow.steps?.length || 0} steps
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {Object.keys(workflow.compliance_requirements || {}).length > 0 ? (
                        <Badge variant="secondary">
                          {Object.keys(workflow.compliance_requirements).length} requirements
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{workflow.version}</Badge>
                    </TableCell>
                    <TableCell>
                      {workflow.active ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Industry-Specific Features */}
      <Card>
        <CardHeader>
          <CardTitle>Industry Features & Compliance</CardTitle>
          <CardDescription>
            Key features and compliance requirements for {industries.find((i) => i.value === selectedIndustry)?.label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedIndustry === "healthcare" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold">Features</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Patient consent management</li>
                  <li>• Medical equipment certification tracking</li>
                  <li>• HIPAA-compliant audit logging</li>
                  <li>• PHI data encryption and access control</li>
                  <li>• Emergency prioritization workflows</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Compliance Requirements</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• HIPAA Privacy Rule compliance</li>
                  <li>• HIPAA Security Rule implementation</li>
                  <li>• BAA agreements with service partners</li>
                  <li>• Regular security risk assessments</li>
                  <li>• Breach notification procedures</li>
                </ul>
              </div>
            </div>
          )}

          {selectedIndustry === "utilities" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold">Features</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Critical infrastructure prioritization</li>
                  <li>• Outage impact assessment</li>
                  <li>• Safety compliance validation</li>
                  <li>• Emergency response protocols</li>
                  <li>• Regulatory incident reporting</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Compliance Requirements</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• NERC CIP (Critical Infrastructure Protection)</li>
                  <li>• DOT safety regulations</li>
                  <li>• EPA environmental compliance</li>
                  <li>• State utility commission requirements</li>
                  <li>• ISO quality standards</li>
                </ul>
              </div>
            </div>
          )}

          {selectedIndustry === "insurance" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold">Features</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Adjuster assignment workflows</li>
                  <li>• Damage assessment protocols</li>
                  <li>• Multi-party approval chains</li>
                  <li>• Fraud detection integration</li>
                  <li>• Claims documentation management</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Compliance Requirements</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• State insurance regulations</li>
                  <li>• Fair claims handling practices</li>
                  <li>• Anti-fraud measures</li>
                  <li>• Data privacy (GDPR, CCPA)</li>
                  <li>• Financial reporting standards</li>
                </ul>
              </div>
            </div>
          )}

          {selectedIndustry === "logistics" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold">Features</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Route optimization integration</li>
                  <li>• Multi-leg shipment tracking</li>
                  <li>• Carrier coordination workflows</li>
                  <li>• Customs clearance management</li>
                  <li>• Proof of delivery capture</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Compliance Requirements</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• DOT transportation regulations</li>
                  <li>• International shipping laws</li>
                  <li>• Hazmat handling requirements</li>
                  <li>• Customs and trade compliance</li>
                  <li>• Environmental standards</li>
                </ul>
              </div>
            </div>
          )}

          {selectedIndustry === "field_service" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold">Features</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Dynamic scheduling and dispatch</li>
                  <li>• Parts inventory management</li>
                  <li>• Mobile technician workflows</li>
                  <li>• Customer portal integration</li>
                  <li>• Service contract management</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Compliance Requirements</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Industry-specific certifications</li>
                  <li>• Safety standards (OSHA)</li>
                  <li>• Quality management (ISO 9001)</li>
                  <li>• Data privacy regulations</li>
                  <li>• Service level agreements</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
