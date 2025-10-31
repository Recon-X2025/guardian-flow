import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function FraudComplianceModule() {
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
        <h1 className="text-4xl font-bold mb-4">Fraud Detection & Compliance</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Advanced protection against fraud with automated compliance tracking
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Business Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Protect your operations from fraudulent activity and maintain regulatory compliance with AI-powered detection that identifies suspicious patterns and automates compliance documentation.
            </p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Image forgery detection to verify authentic photo documentation from field technicians</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Anomaly detection that flags unusual patterns in work orders, invoices, and time tracking</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Automated compliance reporting for industry regulations and standards</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Audit trail management with tamper-proof logging of all critical operations</span>
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
              <h4 className="font-semibold mb-2">Image Forgery Detection</h4>
              <p className="text-sm text-muted-foreground">
                AI algorithms analyze photos submitted by technicians to detect manipulation, ensuring work completion documentation is authentic and trustworthy.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Behavioral Anomaly Detection</h4>
              <p className="text-sm text-muted-foreground">
                Machine learning identifies unusual patterns such as excessive overtime claims, duplicate invoicing, inflated part costs, or suspicious work order modifications.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Compliance Automation</h4>
              <p className="text-sm text-muted-foreground">
                Automatically track and document compliance with industry regulations, safety standards, and contractual SLAs with audit-ready reports.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Investigation Workflow</h4>
              <p className="text-sm text-muted-foreground">
                Structured case management for investigating flagged incidents, collecting evidence, and documenting resolution with full audit trails.
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
              <h4 className="font-semibold mb-1">Insurance Claims</h4>
              <p className="text-sm text-muted-foreground">
                Verify authenticity of damage photos and detect fraudulent claims before processing, reducing losses from false submissions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Government Contracts</h4>
              <p className="text-sm text-muted-foreground">
                Maintain strict compliance with regulations, track certified technician requirements, and generate audit documentation for oversight agencies.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Enterprise Security</h4>
              <p className="text-sm text-muted-foreground">
                Monitor for insider threats, unauthorized access attempts, and suspicious data export patterns to protect sensitive business information.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Start Using Fraud Detection
          </Button>
        </div>
      </div>
    </div>
  );
}
