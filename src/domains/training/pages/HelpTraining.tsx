import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Video, 
  FileText, 
  PlayCircle, 
  Clock,
  CheckCircle,
  Wrench,
  Clipboard,
  Camera,
  Calendar,
  MapPin,
  Package,
  Shield,
  Receipt,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface TrainingModule {
  id: string;
  title: string;
  icon: any;
  description: string;
  duration: string;
  videos: {
    title: string;
    duration: string;
    url?: string;
    completed?: boolean;
  }[];
  workflow: {
    step: string;
    description: string;
  }[];
}

const trainingModules: TrainingModule[] = [
  {
    id: "tickets",
    title: "Tickets Management",
    icon: Clipboard,
    description: "Learn how to create, manage, and track service tickets",
    duration: "15 min",
    videos: [
      { title: "Creating a New Ticket", duration: "3:45", completed: true },
      { title: "Ticket Lifecycle & Status", duration: "5:20" },
      { title: "Work Order Creation from Tickets", duration: "4:15" },
      { title: "Ticket Alerts & Notifications", duration: "2:30" },
    ],
    workflow: [
      { step: "1. Customer Reports Issue", description: "Create ticket with unit serial, symptom, and site address" },
      { step: "2. Ticket Validation", description: "System validates warranty and parts availability" },
      { step: "3. Work Order Creation", description: "Generate work order and assign technician" },
      { step: "4. Completion & Closure", description: "Close ticket within 7 days of WO completion" },
    ]
  },
  {
    id: "workorders",
    title: "Work Orders",
    icon: Wrench,
    description: "Master the complete work order lifecycle from creation to completion",
    duration: "25 min",
    videos: [
      { title: "Work Order Overview", duration: "4:00", completed: true },
      { title: "Automated Prechecks", duration: "6:30" },
      { title: "Part Status Management", duration: "5:45" },
      { title: "Photo Validation Requirements", duration: "4:20" },
      { title: "Work Order Completion", duration: "4:25" },
    ],
    workflow: [
      { step: "1. WO Creation", description: "Auto-created from ticket with WO number generation" },
      { step: "2. Automated Prechecks", description: "Inventory, warranty, and photo validation run automatically" },
      { step: "3. Technician Assignment", description: "Assign qualified technician based on skills" },
      { step: "4. Release to Field", description: "WO released after all prechecks pass" },
      { step: "5. In-Progress Work", description: "Technician updates part status and captures photos" },
      { step: "6. Completion", description: "Submit with required photos and parts documentation" },
    ]
  },
  {
    id: "photos",
    title: "Photo Capture & Validation",
    icon: Camera,
    description: "Understanding photo requirements and validation process",
    duration: "12 min",
    videos: [
      { title: "Photo Requirements by Stage", duration: "3:30" },
      { title: "Capture Best Practices", duration: "4:15" },
      { title: "AI-Powered Validation", duration: "3:45" },
    ],
    workflow: [
      { step: "1. Pre-Work Photos", description: "Capture unit condition before starting repair" },
      { step: "2. In-Progress Photos", description: "Document repair steps and replaced parts" },
      { step: "3. Post-Work Photos", description: "Verify completed work and unit condition" },
      { step: "4. AI Validation", description: "System validates photo quality and completeness" },
    ]
  },
  {
    id: "scheduling",
    title: "Scheduler & Dispatch",
    icon: Calendar,
    description: "Optimize technician scheduling and work order dispatch",
    duration: "18 min",
    videos: [
      { title: "Calendar Overview", duration: "4:00" },
      { title: "Technician Assignment", duration: "5:30" },
      { title: "Route Optimization", duration: "4:45" },
      { title: "Capacity Planning", duration: "3:45" },
    ],
    workflow: [
      { step: "1. View Available WOs", description: "See all released work orders ready for dispatch" },
      { step: "2. Check Tech Availability", description: "Review technician schedules and skills" },
      { step: "3. Assign Work Orders", description: "Drag & drop WOs to technician calendar" },
      { step: "4. Route Optimization", description: "System suggests optimal routes for field visits" },
    ]
  },
  {
    id: "inventory",
    title: "Inventory & Parts Management",
    icon: Package,
    description: "Track inventory, manage parts, and handle procurement",
    duration: "20 min",
    videos: [
      { title: "Inventory Overview", duration: "4:30" },
      { title: "Stock Level Monitoring", duration: "5:00" },
      { title: "Part Reservation & Issuance", duration: "5:45" },
      { title: "Buffer Stock Management", duration: "4:45" },
    ],
    workflow: [
      { step: "1. Stock Check", description: "System checks inventory availability during precheck" },
      { step: "2. Part Reservation", description: "Reserve parts for approved work orders" },
      { step: "3. Part Issuance", description: "Issue parts to technician before field visit" },
      { step: "4. Consumption Tracking", description: "Mark parts as consumed or return unused" },
      { step: "5. Reorder Triggers", description: "Auto-trigger procurement when below threshold" },
    ]
  },
  {
    id: "warranty",
    title: "Warranty & RMA",
    icon: Shield,
    description: "Handle warranty claims and return merchandise authorizations",
    duration: "16 min",
    videos: [
      { title: "Warranty Verification", duration: "4:00" },
      { title: "In-Warranty vs Out-of-Warranty", duration: "5:30" },
      { title: "RMA Process", duration: "4:15" },
      { title: "Warranty Conflicts", duration: "2:15" },
    ],
    workflow: [
      { step: "1. Auto-Check", description: "System checks warranty status during WO creation" },
      { step: "2. Coverage Verification", description: "Validate warranty terms and covered parts" },
      { step: "3. Repair Type Assignment", description: "Set as in_warranty or out_of_warranty" },
      { step: "4. Cost Calculation", description: "Apply appropriate pricing based on warranty" },
      { step: "5. RMA Initiation", description: "Start RMA process for warranty-covered failures" },
    ]
  },
  {
    id: "finance",
    title: "Financial Operations",
    icon: Receipt,
    description: "Manage quotes, invoices, payments, and penalties",
    duration: "22 min",
    videos: [
      { title: "Quote Generation", duration: "4:30" },
      { title: "Invoice Creation & Management", duration: "6:00" },
      { title: "Payment Processing", duration: "5:30" },
      { title: "Penalty Calculation", duration: "6:00" },
    ],
    workflow: [
      { step: "1. Quote Generation", description: "Create quote from AI offer or manual entry" },
      { step: "2. Customer Approval", description: "Send quote to customer for approval" },
      { step: "3. Invoice Creation", description: "Generate invoice from completed WO and quote" },
      { step: "4. Penalty Application", description: "Auto-apply penalties based on penalty matrix" },
      { step: "5. Payment Collection", description: "Process payment and update invoice status" },
    ]
  },
  {
    id: "sapos",
    title: "Offer AI - Sales Point-of-Service",
    icon: Sparkles,
    description: "AI-powered upsell and cross-sell recommendations",
    duration: "14 min",
    videos: [
      { title: "Offer AI Overview", duration: "3:30" },
      { title: "AI Offer Generation", duration: "5:15" },
      { title: "Warranty Conflict Detection", duration: "3:00" },
      { title: "Offer Presentation", duration: "2:15" },
    ],
    workflow: [
      { step: "1. Trigger Analysis", description: "AI analyzes work order context and customer history" },
      { step: "2. Offer Generation", description: "Generate upsell/cross-sell offers with confidence scores" },
      { step: "3. Warranty Check", description: "Verify offers don't conflict with warranty terms" },
      { step: "4. Present to Customer", description: "Technician presents offers at point-of-service" },
      { step: "5. Acceptance & Quote", description: "Convert accepted offers to quotes and invoices" },
    ]
  },
  {
    id: "analytics",
    title: "Analytics & Reporting",
    icon: TrendingUp,
    description: "Track KPIs, monitor performance, and detect anomalies",
    duration: "17 min",
    videos: [
      { title: "Dashboard Overview", duration: "4:00" },
      { title: "KPI Monitoring", duration: "5:30" },
      { title: "Fraud Detection", duration: "4:45" },
      { title: "Custom Reports", duration: "2:45" },
    ],
    workflow: [
      { step: "1. Data Collection", description: "System continuously collects operational data" },
      { step: "2. Real-time Analysis", description: "AI analyzes patterns and detects anomalies" },
      { step: "3. Alert Generation", description: "Generate alerts for fraud or performance issues" },
      { step: "4. Investigation", description: "Review alerts and investigate flagged activities" },
      { step: "5. Reporting", description: "Generate reports for management and compliance" },
    ]
  },
  {
    id: "rbac",
    title: "User Management & RBAC",
    icon: Users,
    description: "Role-based access control and user administration",
    duration: "13 min",
    videos: [
      { title: "Understanding Roles", duration: "4:15" },
      { title: "Permission Management", duration: "4:30" },
      { title: "Tenant Isolation", duration: "2:45" },
      { title: "MFA & Security", duration: "1:30" },
    ],
    workflow: [
      { step: "1. User Creation", description: "Create user account with email and profile" },
      { step: "2. Role Assignment", description: "Assign appropriate role (technician, admin, etc.)" },
      { step: "3. Tenant Mapping", description: "Associate user with tenant for data isolation" },
      { step: "4. Permission Check", description: "System validates permissions for all actions" },
      { step: "5. Audit Logging", description: "All actions logged for compliance and security" },
    ]
  },
];

export default function HelpTraining() {
  const [selectedModule, setSelectedModule] = useState<string>("tickets");

  const currentModule = trainingModules.find(m => m.id === selectedModule) || trainingModules[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Help & Training</h1>
          <p className="text-muted-foreground">Comprehensive guides and video tutorials for all modules</p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          <BookOpen className="h-3 w-3 mr-1" />
          {trainingModules.length} Modules
        </Badge>
      </div>

      <Tabs defaultValue="videos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="videos">
            <Video className="h-4 w-4 mr-2" />
            Video Library
          </TabsTrigger>
          <TabsTrigger value="workflows">
            <FileText className="h-4 w-4 mr-2" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="quickstart">
            <PlayCircle className="h-4 w-4 mr-2" />
            Quick Start
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Module Selector */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Modules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {trainingModules.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => setSelectedModule(module.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedModule === module.id
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-muted/50 border-border hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <module.icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{module.title}</span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Video Content */}
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <currentModule.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>{currentModule.title}</CardTitle>
                        <CardDescription>{currentModule.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-muted">
                      <Clock className="h-3 w-3 mr-1" />
                      {currentModule.duration}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentModule.videos.map((video, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {video.completed ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <PlayCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{video.title}</p>
                          <p className="text-xs text-muted-foreground">{video.duration}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {video.completed ? 'Completed' : 'Not Started'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-sm">📹 Additional Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                    <div className="h-8 w-8 rounded bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold">PDF</div>
                    <div>
                      <p className="text-sm font-medium">User Manual v2.0</p>
                      <p className="text-xs text-muted-foreground">Complete platform guide</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                    <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">DOC</div>
                    <div>
                      <p className="text-sm font-medium">Quick Start Guide</p>
                      <p className="text-xs text-muted-foreground">Get started in 5 minutes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                    <div className="h-8 w-8 rounded bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold">XLS</div>
                    <div>
                      <p className="text-sm font-medium">Keyboard Shortcuts</p>
                      <p className="text-xs text-muted-foreground">Boost your productivity</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {trainingModules.map((module) => (
              <Card key={module.id}>
                <AccordionItem value={module.id} className="border-none">
                  <AccordionTrigger className="px-6 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <module.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{module.title}</p>
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="space-y-4 pt-4">
                      {module.workflow.map((step, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                              {idx + 1}
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm mb-1">{step.step}</p>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Card>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="quickstart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started with Guardian Flow</CardTitle>
              <CardDescription>A comprehensive overview of the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">🎯 Platform Overview</h3>
                  <p className="text-sm text-muted-foreground">
                    Guardian Flow is an enterprise field service platform that automates PC and printer repair workflows with AI-powered prechecks, warranty validation, and fraud detection.
                  </p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">🔑 Key Concepts</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li><strong>Tickets:</strong> Customer service requests that initiate the workflow</li>
                    <li><strong>Work Orders:</strong> Technical assignments created from tickets</li>
                    <li><strong>Prechecks:</strong> Automated validations (inventory, warranty, photos)</li>
                    <li><strong>Part Status:</strong> Lifecycle tracking from reservation to consumption</li>
                    <li><strong>Offer AI:</strong> AI-powered upsell offers at point-of-service</li>
                    <li><strong>RBAC:</strong> Role-based permissions ensuring secure access</li>
                  </ul>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">📊 Typical Workflow</h3>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Customer reports issue → Ticket created</li>
                    <li>System validates warranty & inventory</li>
                    <li>Work Order generated & assigned to technician</li>
                    <li>Technician captures photos & performs repair</li>
                    <li>AI suggests offers to customer</li>
                    <li>Work Order completed with documentation</li>
                    <li>Invoice generated with penalties (if any)</li>
                    <li>Payment processed & ticket closed</li>
                  </ol>
                </div>

                <div className="border-l-4 border-warning pl-4">
                  <h3 className="font-semibold mb-2">⚡ Important Rules</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Tickets must be closed within 7 days of WO completion</li>
                    <li>Photo validation is mandatory for WO completion</li>
                    <li>Part status transitions must follow defined workflow</li>
                    <li>MFA required for critical override actions</li>
                    <li>All actions are audit-logged for compliance</li>
                  </ul>
                </div>

                <div className="border-l-4 border-success pl-4">
                  <h3 className="font-semibold mb-2">✅ Best Practices</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Always capture clear, well-lit photos at each stage</li>
                    <li>Update part status immediately after each action</li>
                    <li>Review automated alerts and fraud flags daily</li>
                    <li>Monitor dashboard KPIs for operational insights</li>
                    <li>Close tickets promptly to avoid penalty alerts</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Need More Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                • Contact your system administrator for additional training
              </p>
              <p className="text-muted-foreground">
                • Check the Knowledge Base for detailed technical documentation
              </p>
              <p className="text-muted-foreground">
                • Review audit logs in Observability for action history
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
