import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Image as ImageIcon, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  FileSearch,
  MapPin,
  Calendar,
  Camera,
  Shield
} from "lucide-react";

type ForensicResult = {
  imageId: string;
  fileName: string;
  verdict: "authentic" | "suspicious" | "forged";
  confidence: number;
  findings: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    location?: { x: number; y: number };
  }>;
  metadata: {
    timestamp?: string;
    gps?: { lat: number; lng: number };
    camera?: string;
    software?: string;
  };
};

export default function ImageForensicsModule() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<ForensicResult[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const analyzeImages = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error("Please select images to analyze");
      return;
    }

    setIsAnalyzing(true);
    const newResults: ForensicResult[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append("image", file);

        // Upload to storage
        const fileName = `forensics/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("document-templates")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        // Invoke forensics analysis edge function
        const { data, error } = await supabase.functions.invoke("analyze-image-forensics", {
          body: { 
            filePath: fileName,
            fileName: file.name
          }
        });

        if (error) {
          console.error("Analysis error:", error);
          toast.error(`Failed to analyze ${file.name}`);
          continue;
        }

        newResults.push(data);
      }

      setResults(newResults);
      
      if (newResults.length > 0) {
        const suspiciousCount = newResults.filter(r => r.verdict !== "authentic").length;
        if (suspiciousCount > 0) {
          toast.warning(`Analysis complete: ${suspiciousCount} suspicious image(s) detected`);
        } else {
          toast.success("All images appear authentic");
        }
      }
    } catch (error: any) {
      console.error("Forensics error:", error);
      toast.error("Image analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case "authentic": return "bg-green-500";
      case "suspicious": return "bg-yellow-500";
      case "forged": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low": return "text-blue-500";
      case "medium": return "text-yellow-500";
      case "high": return "text-orange-500";
      case "critical": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Image Forensics & Fraud Detection
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered image authenticity analysis and tamper detection
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Images for Analysis
          </CardTitle>
          <CardDescription>
            Upload work order photos, evidence, or documents for forensic analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
              />
            </div>
            <Button 
              onClick={analyzeImages} 
              disabled={isAnalyzing || !selectedFiles}
            >
              {isAnalyzing ? (
                "Analyzing..."
              ) : (
                <>
                  <FileSearch className="w-4 h-4 mr-2" />
                  Analyze Images
                </>
              )}
            </Button>
          </div>

          {selectedFiles && selectedFiles.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedFiles.length} file(s) selected
            </p>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Analysis Results</h2>
          
          {results.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-6 h-6" />
                    <div>
                      <CardTitle className="text-lg">{result.fileName}</CardTitle>
                      <CardDescription>Image ID: {result.imageId}</CardDescription>
                    </div>
                  </div>
                  <Badge className={getVerdictColor(result.verdict)}>
                    {result.verdict.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="findings" className="w-full">
                  <TabsList>
                    <TabsTrigger value="findings">Findings</TabsTrigger>
                    <TabsTrigger value="metadata">Metadata</TabsTrigger>
                    <TabsTrigger value="score">Confidence Score</TabsTrigger>
                  </TabsList>

                  <TabsContent value="findings" className="space-y-3">
                    {result.findings.length === 0 ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span>No tampering detected</span>
                      </div>
                    ) : (
                      result.findings.map((finding, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                          <AlertTriangle className={`w-5 h-5 mt-0.5 ${getSeverityColor(finding.severity)}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{finding.type}</span>
                              <Badge variant="outline" className={getSeverityColor(finding.severity)}>
                                {finding.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {finding.description}
                            </p>
                            {finding.location && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Location: ({finding.location.x}, {finding.location.y})
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="metadata" className="space-y-3">
                    {result.metadata.timestamp && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          Timestamp: {new Date(result.metadata.timestamp).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {result.metadata.gps && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          GPS: {result.metadata.gps.lat.toFixed(6)}, {result.metadata.gps.lng.toFixed(6)}
                        </span>
                      </div>
                    )}
                    {result.metadata.camera && (
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Camera: {result.metadata.camera}</span>
                      </div>
                    )}
                    {result.metadata.software && (
                      <div className="flex items-center gap-2">
                        <FileSearch className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Software: {result.metadata.software}</span>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="score">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Authenticity Confidence</span>
                          <span className="text-sm font-semibold">{result.confidence}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${
                              result.confidence >= 80 ? "bg-green-500" :
                              result.confidence >= 50 ? "bg-yellow-500" :
                              "bg-red-500"
                            }`}
                            style={{ width: `${result.confidence}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {result.confidence >= 80
                          ? "High confidence that the image is authentic"
                          : result.confidence >= 50
                          ? "Moderate confidence - further investigation recommended"
                          : "Low confidence - likely tampered or forged"}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
