import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

export function AnalyticsAuditLogs() {
  return (
    <Card className="p-12 text-center">
      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Audit Logs</h3>
      <p className="text-muted-foreground">
        Immutable audit trail with 7-year retention
      </p>
    </Card>
  );
}
