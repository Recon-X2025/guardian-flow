import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import PhotoCapture from "@/components/PhotoCapture";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Shield, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PhotoCapturePage() {
  const [stage, setStage] = useState<"replacement" | "post_repair" | "pickup">("replacement");
  const [validations, setValidations] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchValidations = async () => {
    try {
      const { data, error } = await supabase
        .from('photo_validations')
        .select('*')
        .eq('work_order_id', 'demo-wo-id')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setValidations(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading validations",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchValidations();
  }, []);

  const handleComplete = (payload: any) => {
    console.log("Photos validated:", payload);
    toast({
      title: "Stage Complete",
      description: `${stage} photos validated successfully`,
    });
    fetchValidations();
  };

  const requiredStages = ["replacement", "post_repair", "pickup"];
  const completedStages = validations
    .filter(v => v.photos_validated && !v.anomaly_detected)
    .map(v => v.stage);
  
  const allStagesComplete = requiredStages.every(s => completedStages.includes(s));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Photo Capture & Validation</h1>
        <p className="text-muted-foreground">
          Critical stages require 4 mandatory photos for audit compliance
        </p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-600" />
            3-Stage Photo Enforcement
          </CardTitle>
          <CardDescription>Track validation status across all critical stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {requiredStages.map((stageName) => {
              const isComplete = completedStages.includes(stageName);
              return (
                <div
                  key={stageName}
                  className="flex items-center justify-between p-3 border rounded-lg bg-white"
                >
                  <div className="flex items-center gap-3">
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="font-medium capitalize">
                      {stageName.replace('_', ' ')}
                    </span>
                  </div>
                  <Badge className={isComplete ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                    {isComplete ? 'Validated' : 'Pending'}
                  </Badge>
                </div>
              );
            })}
          </div>

          {allStagesComplete && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">All Photo Stages Complete</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                <SelectItem value="replacement">
                  <div className="flex items-center gap-2">
                    {completedStages.includes('replacement') && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    Replacement
                  </div>
                </SelectItem>
                <SelectItem value="post_repair">
                  <div className="flex items-center gap-2">
                    {completedStages.includes('post_repair') && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    Post-Repair QA
                  </div>
                </SelectItem>
                <SelectItem value="pickup">
                  <div className="flex items-center gap-2">
                    {completedStages.includes('pickup') && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    Reverse Logistics Pickup
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
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
