import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function CustomerPortalModule() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button onClick={() => navigate("/auth/customer")}>Get Started</Button>
        </div>
      </header>

      <div className="container py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Customer Portal</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Self-service portal empowering customers to manage their service needs
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Business Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Reduce support costs by up to 40% while improving customer satisfaction with a branded self-service portal that puts control in your customers' hands.
            </p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>24/7 service booking with real-time technician availability and instant confirmation</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Real-time work order tracking with technician location and ETA updates</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Equipment management with warranty tracking and service history access</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Invoice viewing, payment processing, and billing history in one place</span>
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
              <h4 className="font-semibold mb-2">Self-Service Booking</h4>
              <p className="text-sm text-muted-foreground">
                Customers select service types, view available time slots, choose preferred technicians, and receive instant booking confirmation without phone calls or emails.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Real-Time Tracking</h4>
              <p className="text-sm text-muted-foreground">
                Live map showing technician location, accurate ETAs, and automatic notifications when the technician is en route, reducing customer uncertainty and wait times.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Equipment Registry</h4>
              <p className="text-sm text-muted-foreground">
                Customers view all registered equipment, warranty status, maintenance schedules, and complete service history to stay informed about their assets.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Billing & Payments</h4>
              <p className="text-sm text-muted-foreground">
                Secure online payment processing, invoice downloads, payment history, and automated payment reminders for overdue balances.
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
              <h4 className="font-semibold mb-1">B2C Home Services</h4>
              <p className="text-sm text-muted-foreground">
                Homeowners book HVAC tune-ups, plumbing repairs, or appliance maintenance at their convenience, track service appointments, and pay online.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">B2B Enterprise Accounts</h4>
              <p className="text-sm text-muted-foreground">
                Corporate clients manage multiple locations, track service spend across properties, and access detailed reporting for internal charge-backs.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Property Management</h4>
              <p className="text-sm text-muted-foreground">
                Property managers coordinate maintenance across tenant units, track work order status, and manage vendor billing from a centralized portal.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={() => navigate("/auth/customer")}>
            Start Using Customer Portal
          </Button>
        </div>
      </div>
    </div>
  );
}
