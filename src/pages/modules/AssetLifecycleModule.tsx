import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function AssetLifecycleModule() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button onClick={() => navigate("/auth")}>Get Started</Button>
        </div>
      </header>

      <div className="container py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Asset Lifecycle Management</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Track and optimize equipment from procurement through retirement
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Business Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Maximize asset value and minimize downtime with comprehensive lifecycle tracking that reduces equipment failure rates by 35% and extends asset lifespan by up to 20%.
            </p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Complete asset registry with maintenance history and performance metrics</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Predictive maintenance scheduling based on AI analysis of failure patterns</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Warranty tracking and automated claims processing</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Compliance documentation and audit trails for regulated industries</span>
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
              <h4 className="font-semibold mb-2">Predictive Maintenance</h4>
              <p className="text-sm text-muted-foreground">
                Machine learning algorithms analyze equipment telemetry, maintenance history, and failure patterns to predict when assets require service before breakdowns occur.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Warranty Management</h4>
              <p className="text-sm text-muted-foreground">
                Track warranty coverage across your asset portfolio, automatically verify eligibility for claims, and streamline the warranty claim process with vendors.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Compliance Tracking</h4>
              <p className="text-sm text-muted-foreground">
                Maintain required inspection schedules, safety certifications, and regulatory compliance documentation with automated reminders and audit-ready reports.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Total Cost of Ownership</h4>
              <p className="text-sm text-muted-foreground">
                Track all costs associated with each asset including purchase price, maintenance, repairs, and operating costs to optimize replacement decisions.
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
              <h4 className="font-semibold mb-1">Manufacturing</h4>
              <p className="text-sm text-muted-foreground">
                Manage production equipment maintenance schedules, track downtime costs, and optimize preventive maintenance to minimize production interruptions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Healthcare</h4>
              <p className="text-sm text-muted-foreground">
                Ensure medical equipment compliance, calibration tracking, and preventive maintenance to meet strict regulatory requirements and patient safety standards.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Transportation & Logistics</h4>
              <p className="text-sm text-muted-foreground">
                Monitor vehicle fleet health, schedule preventive maintenance, track fuel efficiency, and manage regulatory compliance for commercial vehicles.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Start Using Asset Lifecycle Management
          </Button>
        </div>
      </div>
    </div>
  );
}
