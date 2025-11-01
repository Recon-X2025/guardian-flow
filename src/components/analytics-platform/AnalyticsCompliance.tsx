import { Card } from "@/components/ui/card";
import { FileCheck } from "lucide-react";

export function AnalyticsCompliance() {
  return (
    <Card className="p-12 text-center">
      <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Compliance Evidence</h3>
      <p className="text-muted-foreground">
        Automated compliance reporting for SOC 2, ISO 27001, and more
      </p>
    </Card>
  );
}
