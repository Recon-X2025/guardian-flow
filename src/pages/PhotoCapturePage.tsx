import { useState } from "react";
import PhotoCapture from "@/components/PhotoCapture";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Shield } from "lucide-react";

export default function PhotoCapturePage() {
  const [stage, setStage] = useState<"replacement" | "post_repair" | "pickup">("replacement");
  const [validated, setValidated] = useState(false);

  const handleComplete = (payload: any) => {
    console.log("Photos validated:", payload);
    setValidated(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Photo Capture & Validation</h1>
        <p className="text-muted-foreground">
          Critical stages require 4 mandatory photos for audit compliance
        </p>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Photo Enforcement Policy
          </CardTitle>
          <CardDescription>Non-negotiable compliance requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Minimum 4 Photos Required</p>
              <p className="text-xs text-muted-foreground">
                Context, Pre-closeup, Serial Number, and Replacement Part
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Critical Stages</p>
              <p className="text-xs text-muted-foreground">
                Replacement, Post-Repair QA, and Reverse Logistics Pickup
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Security Features</p>
              <p className="text-xs text-muted-foreground">
                SHA-256 hashing, GPS geo-stamping, timestamp verification, and immutable storage
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Service Stage</CardTitle>
          <CardDescription>Choose the stage that requires photo documentation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={stage} onValueChange={(v: any) => setStage(v)}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="replacement">Replacement</SelectItem>
                <SelectItem value="post_repair">Post-Repair QA</SelectItem>
                <SelectItem value="pickup">Reverse Logistics Pickup</SelectItem>
              </SelectContent>
            </Select>
            {validated && (
              <Badge variant="default" className="bg-success">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Photos Validated
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <PhotoCapture
        stage={stage}
        workOrderId="WO-2024-001"
        onComplete={handleComplete}
      />

      <Card>
        <CardHeader>
          <CardTitle>Override Policy</CardTitle>
          <CardDescription>Manager approval with MFA required for exceptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2 text-muted-foreground">
            <p>
              • Frontend must block progression until validation returns{" "}
              <code className="px-1 py-0.5 bg-muted rounded text-xs">photos_validated == true</code>
            </p>
            <p>
              • Override requires manager-level RBAC permissions
            </p>
            <p>
              • All overrides are logged with justification and audit trail
            </p>
            <p>
              • MFA (Multi-Factor Authentication) required for override approval
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
