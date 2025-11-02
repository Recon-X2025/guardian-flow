import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function FieldServiceModule() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button onClick={() => navigate("/auth/fsm")}>Get Started</Button>
        </div>
      </header>

      <div className="container py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Field Service Management</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Complete work order lifecycle management from ticket creation to completion
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Business Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Transform your field service operations with end-to-end work order management that reduces response times by up to 40% and improves first-time fix rates by 25%.
            </p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Automated ticket routing and technician dispatch based on skills, location, and availability</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Real-time mobile app for technicians with offline capabilities</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Photo capture and validation with AI-powered quality checks</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Service level agreement (SLA) monitoring and breach prevention</span>
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
              <h4 className="font-semibold mb-2">Intelligent Dispatching</h4>
              <p className="text-sm text-muted-foreground">
                AI-powered assignment engine considers technician skills, current location, travel time, and availability to optimize job assignments and minimize travel costs.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Mobile Execution</h4>
              <p className="text-sm text-muted-foreground">
                Technicians access work orders, customer information, equipment history, and parts inventory from their mobile devices. Capture signatures, photos, and notes directly in the field.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Parts & Inventory Integration</h4>
              <p className="text-sm text-muted-foreground">
                Check real-time inventory levels, reserve parts for jobs, and automatically trigger procurement when stock levels are low.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Customer Communication</h4>
              <p className="text-sm text-muted-foreground">
                Automated notifications keep customers informed with appointment confirmations, technician en-route alerts, and completion updates.
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
              <h4 className="font-semibold mb-1">Telecommunications</h4>
              <p className="text-sm text-muted-foreground">
                Manage installation, repair, and maintenance of network equipment across thousands of customer sites with optimized routing and parts availability.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">HVAC Services</h4>
              <p className="text-sm text-muted-foreground">
                Schedule preventive maintenance, handle emergency repair calls, and manage seasonal demand spikes with intelligent workforce allocation.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Facility Management</h4>
              <p className="text-sm text-muted-foreground">
                Coordinate multi-trade work orders across commercial properties, tracking SLAs and tenant satisfaction metrics in real-time.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={() => navigate("/auth/fsm")}>
            Start Using Field Service Management
          </Button>
        </div>
      </div>
    </div>
  );
}
