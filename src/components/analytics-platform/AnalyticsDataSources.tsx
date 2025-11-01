import { Card } from "@/components/ui/card";
import { Database } from "lucide-react";

export function AnalyticsDataSources() {
  return (
    <Card className="p-12 text-center">
      <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Data Sources</h3>
      <p className="text-muted-foreground">
        Connect to databases, cloud storage, APIs, and more
      </p>
    </Card>
  );
}
