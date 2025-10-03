import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Plus } from "lucide-react";

export default function Dispatch() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dispatch</h1>
          <p className="text-muted-foreground">
            Real-time technician tracking and dynamic dispatch
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Assign Work Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Dispatch Module
          </CardTitle>
          <CardDescription>Coming Soon - Real-Time Dispatch Features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>• Live map view with technician GPS tracking</p>
          <p>• Dynamic re-assignment based on proximity and ETA</p>
          <p>• Emergency dispatch with priority escalation</p>
          <p>• Geofencing for check-in/check-out automation</p>
          <p>• Broadcast notifications to available technicians</p>
          <p>• Parts availability-aware dispatch decisions</p>
          <p>• Integration with navigation apps (Google Maps, Waze)</p>
        </CardContent>
      </Card>
    </div>
  );
}