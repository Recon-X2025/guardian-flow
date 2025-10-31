import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function AnalyticsBIModule() {
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
        <h1 className="text-4xl font-bold mb-4">Analytics & BI Integration</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Real-time operational insights and seamless BI tool integration
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Business Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Make data-driven decisions with comprehensive operational analytics, financial reporting, and seamless integration with your existing business intelligence infrastructure.
            </p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Real-time dashboards tracking KPIs for operations, finance, SLA compliance, and workforce utilization</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Pre-built connectors for Tableau, Power BI, Looker, and other major BI platforms</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Custom report builder with drag-and-drop interface for non-technical users</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Automated report scheduling and distribution to stakeholders</span>
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
              <h4 className="font-semibold mb-2">Real-Time Dashboards</h4>
              <p className="text-sm text-muted-foreground">
                Pre-configured dashboards for operations managers, finance teams, and executives with live data updates and drill-down capabilities for detailed analysis.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">BI Tool Integration</h4>
              <p className="text-sm text-muted-foreground">
                Native connectors sync Guardian Flow data to your existing BI platform, enabling you to combine field service metrics with enterprise-wide analytics.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Custom Report Builder</h4>
              <p className="text-sm text-muted-foreground">
                Intuitive interface allows business users to create custom reports without SQL knowledge, selecting dimensions, metrics, filters, and visualization types.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Predictive Analytics</h4>
              <p className="text-sm text-muted-foreground">
                Machine learning models provide forecasts for revenue, resource needs, equipment failures, and SLA breach risks based on historical patterns.
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
              <h4 className="font-semibold mb-1">Executive Reporting</h4>
              <p className="text-sm text-muted-foreground">
                Automated monthly executive summaries combining operational KPIs, financial performance, customer satisfaction metrics, and trend analysis.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Operations Optimization</h4>
              <p className="text-sm text-muted-foreground">
                Monitor technician productivity, identify bottlenecks, track first-time fix rates, and optimize routing efficiency with detailed operational analytics.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Financial Analysis</h4>
              <p className="text-sm text-muted-foreground">
                Track revenue by service type, analyze cost per job, monitor payment cycles, and forecast cash flow with comprehensive financial reporting.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Start Using Analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
