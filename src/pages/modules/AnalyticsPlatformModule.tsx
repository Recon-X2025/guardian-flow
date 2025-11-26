import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function AnalyticsPlatformModule() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button onClick={() => navigate("/auth/analytics")}>Get Started</Button>
        </div>
      </header>

      <div className="container py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Enterprise Analytics Platform</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Secure, scalable data analytics with compliance built-in
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Business Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Transform your data into actionable insights with enterprise-grade analytics infrastructure. Built for security, compliance, and scale from day one.
            </p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Multi-tenant architecture with complete data isolation and SOC2/ISO27001 compliance</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>AI/ML orchestration with model versioning, A/B testing, and performance monitoring</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Automated data quality validation with anomaly detection and alerting</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Just-in-time access controls with comprehensive audit logging</span>
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
              <h4 className="font-semibold mb-2">Data Engineering Pipeline</h4>
              <p className="text-sm text-muted-foreground">
                Ingest data from any source with batch, real-time, and streaming capabilities. Built-in ETL/ELT transformations with data quality gates at every step.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">ML Orchestration</h4>
              <p className="text-sm text-muted-foreground">
                Deploy, monitor, and manage machine learning models with versioning, A/B testing, and automated retraining based on performance metrics.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Data Quality & Governance</h4>
              <p className="text-sm text-muted-foreground">
                Automated validation rules, anomaly detection, and data profiling ensure your analytics are built on trustworthy data with full lineage tracking.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Security & Compliance</h4>
              <p className="text-sm text-muted-foreground">
                SOC2 and ISO27001 ready with role-based access control, data masking, audit logs, and compliance reporting. Just-in-time access for elevated permissions.
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
              <h4 className="font-semibold mb-1">Predictive Analytics</h4>
              <p className="text-sm text-muted-foreground">
                Deploy ML models to forecast demand, predict equipment failures, identify churn risks, and optimize resource allocation with confidence.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Real-Time Dashboards</h4>
              <p className="text-sm text-muted-foreground">
                Create interactive dashboards with live data streaming, collaborative filtering, and advanced visualizations for operational monitoring.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Industry Templates</h4>
              <p className="text-sm text-muted-foreground">
                Pre-built analytics workflows for manufacturing, healthcare, utilities, logistics, and more. Deploy proven analytics in minutes, not months.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={() => navigate("/auth/analytics")}>
            Start Using Analytics Platform
          </Button>
        </div>
      </div>
    </div>
  );
}
