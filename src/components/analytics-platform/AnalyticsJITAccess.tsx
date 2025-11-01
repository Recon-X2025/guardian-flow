import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";

export function AnalyticsJITAccess() {
  return (
    <Card className="p-12 text-center">
      <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Just-In-Time Access</h3>
      <p className="text-muted-foreground">
        Request and manage temporary privileged access
      </p>
    </Card>
  );
}
