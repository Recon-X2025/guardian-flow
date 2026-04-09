import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Eye, Upload } from 'lucide-react';

interface Defect {
  label: string;
  confidence: number;
  boundingBox: { x: number; y: number; w: number; h: number };
}

interface AnalysisResult {
  defects: Defect[];
  overallScore: number;
  analysisId: string;
}

export default function DefectDetection() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyseMut = useMutation({
    mutationFn: async (file: File) => {
      return new Promise<AnalysisResult>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const res = await fetch('/api/ai/vision/analyse', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
            });
            if (!res.ok) throw new Error(await res.text());
            resolve(await res.json());
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(file);
      });
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: `Analysis complete — ${data.defects.length} defect(s) found` });
    },
    onError: (e: Error) => toast({ title: 'Analysis failed', description: e.message, variant: 'destructive' }),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setResult(null);
    analyseMut.mutate(file);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Eye className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Defect Detection</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Upload Image</CardTitle></CardHeader>
        <CardContent>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <Button onClick={() => fileRef.current?.click()} disabled={analyseMut.isPending}>
            <Upload className="h-4 w-4 mr-2" />
            {analyseMut.isPending ? 'Analysing...' : 'Choose Image'}
          </Button>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader><CardTitle>Image Analysis</CardTitle></CardHeader>
          <CardContent>
            <div className="relative inline-block">
              <img src={preview} alt="Uploaded" className="max-w-full max-h-96 rounded" />
              {result?.defects.map((defect, i) => (
                <div
                  key={i}
                  className="absolute border-2 border-red-500"
                  style={{
                    left: `${defect.boundingBox.x * 100}%`,
                    top: `${defect.boundingBox.y * 100}%`,
                    width: `${defect.boundingBox.w * 100}%`,
                    height: `${defect.boundingBox.h * 100}%`,
                  }}
                >
                  <span className="absolute -top-5 left-0 bg-red-500 text-white text-xs px-1 rounded">
                    {defect.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              <span>Defects Found</span>
              <Badge variant={result.overallScore > 0.8 ? 'default' : 'destructive'}>
                Score: {(result.overallScore * 100).toFixed(0)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.defects.length === 0 ? (
              <p className="text-muted-foreground">No defects detected.</p>
            ) : (
              <ul className="space-y-2">
                {result.defects.map((d, i) => (
                  <li key={i} className="flex justify-between items-center p-2 border rounded">
                    <span className="font-medium capitalize">{d.label}</span>
                    <Badge variant="secondary">{(d.confidence * 100).toFixed(1)}% confidence</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
