import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function MarketplaceModule() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button onClick={() => navigate("/auth/marketplace")}>Get Started</Button>
        </div>
      </header>

      <div className="container py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Marketplace & Extensions</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Extend platform capabilities with pre-built integrations and custom extensions
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Business Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Accelerate time-to-value and customize Guardian Flow to your unique business needs with a rich ecosystem of pre-built integrations, industry templates, and extensibility options.
            </p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Pre-built integrations with popular business systems (ERP, CRM, accounting, communication)</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Industry-specific workflow templates for telecommunications, HVAC, healthcare, utilities, and more</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Custom extension development framework with comprehensive APIs and SDKs</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Marketplace for discovering, installing, and managing third-party extensions</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Key Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">Pre-Built Integrations</h4>
              <p className="text-sm text-muted-foreground">
                Connect Guardian Flow with your existing business systems through ready-to-use integrations that sync data bidirectionally and maintain real-time consistency.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Industry Templates</h4>
              <p className="text-sm text-muted-foreground">
                Deploy industry-specific workflows, forms, and business rules in minutes rather than months with pre-configured templates designed by domain experts.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Extension Development</h4>
              <p className="text-sm text-muted-foreground">
                Build custom functionality using comprehensive REST APIs, webhooks, and serverless functions to tailor the platform to your exact requirements.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Marketplace Discovery</h4>
              <p className="text-sm text-muted-foreground">
                Browse, evaluate, and install extensions from verified vendors with ratings, documentation, and support information to ensure quality and compatibility.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Use Cases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">ERP Integration</h4>
              <p className="text-sm text-muted-foreground">
                Sync work orders, invoices, and inventory data with SAP, Oracle, or Microsoft Dynamics to maintain a single source of truth across systems.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Communication Platforms</h4>
              <p className="text-sm text-muted-foreground">
                Integrate with Slack, Microsoft Teams, or WhatsApp for real-time notifications, status updates, and technician communication.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Specialized Equipment</h4>
              <p className="text-sm text-muted-foreground">
                Build custom extensions for industry-specific equipment types, proprietary diagnostic tools, or specialized reporting requirements unique to your business.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={() => navigate("/auth/marketplace")}>
            Explore Marketplace
          </Button>
        </div>
      </div>
    </div>
  );
}
