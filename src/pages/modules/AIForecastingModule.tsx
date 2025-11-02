import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function AIForecastingModule() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button onClick={() => navigate("/auth/forecasting")}>Get Started</Button>
        </div>
      </header>

      <div className="container py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">AI Forecasting & Scheduling</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Machine learning-powered demand forecasting and intelligent scheduling
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Business Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Optimize workforce allocation and reduce operational costs by up to 30% with AI-powered demand forecasting and dynamic scheduling that adapts to real-time conditions.
            </p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Predict service demand patterns with 95%+ accuracy using historical data and external factors</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Automated technician scheduling that maximizes utilization while minimizing travel time</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Dynamic route optimization that adjusts to traffic, weather, and priority changes</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>What-if scenario modeling to evaluate staffing and resource decisions</span>
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
              <h4 className="font-semibold mb-2">Demand Forecasting</h4>
              <p className="text-sm text-muted-foreground">
                ML models analyze historical work orders, seasonal patterns, weather data, and business events to predict service demand weeks in advance with high accuracy.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Intelligent Scheduling</h4>
              <p className="text-sm text-muted-foreground">
                Automatically generate optimal schedules considering technician skills, availability, current location, job priorities, SLA requirements, and customer preferences.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Route Optimization</h4>
              <p className="text-sm text-muted-foreground">
                Real-time route calculation minimizes travel time and fuel costs while adapting to traffic conditions, emergency jobs, and schedule changes throughout the day.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Capacity Planning</h4>
              <p className="text-sm text-muted-foreground">
                Model different scenarios to determine optimal staffing levels, identify resource bottlenecks, and plan for seasonal demand fluctuations.
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
              <h4 className="font-semibold mb-1">Utilities</h4>
              <p className="text-sm text-muted-foreground">
                Forecast maintenance needs across service territories, schedule crews for preventive work during low-demand periods, and respond efficiently to outages.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Home Services</h4>
              <p className="text-sm text-muted-foreground">
                Predict seasonal demand spikes for HVAC, plumbing, and electrical services, ensuring adequate technician coverage during peak periods.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Healthcare Equipment</h4>
              <p className="text-sm text-muted-foreground">
                Schedule preventive maintenance for medical devices during off-hours to minimize disruption while ensuring compliance with service intervals.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={() => navigate("/auth/forecasting")}>
            Start Using AI Forecasting
          </Button>
        </div>
      </div>
    </div>
  );
}
