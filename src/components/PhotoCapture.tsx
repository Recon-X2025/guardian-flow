import { useState } from "react";
import { Camera, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type PhotoRole = "context_wide" | "pre_closeup" | "serial" | "replacement_part";

interface PhotoFile {
  file: File | null;
  preview: string | null;
  hash: string | null;
}

interface PhotoCaptureProps {
  stage: "replacement" | "post_repair" | "pickup";
  workOrderId?: string;
  onComplete?: (payload: any) => void;
}

const roleLabels: Record<PhotoRole, { title: string; description: string }> = {
  context_wide: {
    title: "Context (Wide)",
    description: "Full view of the equipment and surrounding area",
  },
  pre_closeup: {
    title: "Pre-Service Closeup",
    description: "Detailed view before work begins",
  },
  serial: {
    title: "Serial Number",
    description: "Clear photo of unit serial number",
  },
  replacement_part: {
    title: "Replacement Part",
    description: "Photo of the part being replaced",
  },
};

export default function PhotoCapture({ stage, workOrderId, onComplete }: PhotoCaptureProps) {
  const { toast } = useToast();
  const requiredRoles: PhotoRole[] = ["context_wide", "pre_closeup", "serial", "replacement_part"];
  
  const [files, setFiles] = useState<Record<PhotoRole, PhotoFile>>({
    context_wide: { file: null, preview: null, hash: null },
    pre_closeup: { file: null, preview: null, hash: null },
    serial: { file: null, preview: null, hash: null },
    replacement_part: { file: null, preview: null, hash: null },
  });
  
  const [submitting, setSubmitting] = useState(false);
  const isComplete = requiredRoles.every((r) => files[r].file !== null);

  const computeHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleFile = async (role: PhotoRole, file: File | null) => {
    if (!file) {
      setFiles((prev) => ({
        ...prev,
        [role]: { file: null, preview: null, hash: null },
      }));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Photos must be under 10MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Only image files are allowed",
        variant: "destructive",
      });
      return;
    }

    const preview = URL.createObjectURL(file);
    const hash = await computeHash(file);

    setFiles((prev) => ({
      ...prev,
      [role]: { file, preview, hash },
    }));

    toast({
      title: "Photo captured",
      description: `${roleLabels[role].title} uploaded successfully`,
    });
  };

  const getGeo = async (): Promise<{ lat: number; lon: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });
  };

  const submit = async () => {
    if (!isComplete) return;
    
    setSubmitting(true);
    try {
      const imageEntries = [];
      
      for (const role of requiredRoles) {
        const photoFile = files[role];
        if (!photoFile.file || !photoFile.hash) continue;

        imageEntries.push({
          id: `photo_${Date.now()}_${role}`,
          role,
          hash: photoFile.hash,
          gps: (await getGeo()) || null,
          captured_at: new Date().toISOString(),
          filename: photoFile.file.name,
        });
      }

      // Call the validate-photos edge function
      const { data, error } = await supabase.functions.invoke('validate-photos', {
        body: {
          woId: workOrderId || 'demo',
          stage,
          images: imageEntries,
        },
      });

      if (error) throw error;

      toast({
        title: "Photos validated",
        description: "All required photos have been captured and validated successfully",
      });

      onComplete?.(data);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photos. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Photo Capture - {stage.replace("_", " ").toUpperCase()}
        </CardTitle>
        <CardDescription>
          4 photos required for validation. Capture clear, well-lit images for each category.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requiredRoles.map((role) => (
            <div
              key={role}
              className="border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-semibold">{roleLabels[role].title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {roleLabels[role].description}
                  </p>
                </div>
                {files[role].file && (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                )}
              </div>

              {files[role].preview ? (
                <div className="mt-3 relative">
                  <img
                    src={files[role].preview!}
                    alt={roleLabels[role].title}
                    className="w-full h-32 object-cover rounded"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => handleFile(role, null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="block mt-3">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFile(role, e.target.files?.[0] || null)}
                  />
                  <div className="flex items-center justify-center h-32 bg-muted rounded cursor-pointer hover:bg-muted/80 transition-colors">
                    <div className="text-center">
                      <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">Tap to capture</p>
                    </div>
                  </div>
                </label>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">All photos captured</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-warning" />
                <span className="text-sm font-medium">
                  {requiredRoles.filter((r) => files[r].file).length} of 4 photos captured
                </span>
              </>
            )}
          </div>
          <Button
            onClick={submit}
            disabled={!isComplete || submitting}
            className="min-w-32"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              "Submit Photos"
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• All photos are hashed and geo-stamped for security</p>
          <p>• Photos must be clear and well-lit</p>
          <p>• Maximum file size: 10MB per photo</p>
          <p>• GPS location will be captured if available</p>
        </div>
      </CardContent>
    </Card>
  );
}
