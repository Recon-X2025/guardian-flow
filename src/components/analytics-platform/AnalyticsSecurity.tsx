import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";

export function AnalyticsSecurity() {
  return (
    <Card className="p-12 text-center">
      <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Security Controls</h3>
      <p className="text-muted-foreground">
        Encryption, key management, and access policies
      </p>
    </Card>
  );
}
