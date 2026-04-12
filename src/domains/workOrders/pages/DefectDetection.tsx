import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Eye, Upload, AlertTriangle, CheckCircle2, Wrench, Loader2 } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';

interface Defect {
  label: string;
  severity?: string;
  confidence: number;
  location?: string;
  // legacy bounding box from old mock
  boundingBox?: { x: number; y: number; w: number; h: number };
}

interface AnalysisResult {
  defects: Defect[];
  overallScore: number;
  overallCondition?: string;
  description?: string;
  recommendedAction?: string;
  provider?: string;
  analysisId: string;
}

const CONDITION_BADGE: Record<string, string> = {
  good:     'bg-green-100 text-green-800',
  fair:     'bg-yellow-100 text-yellow-800',
  poor:     'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const SEVERITY_BADGE: Record<string, 'default' | 'secondary' | 'destructive'> = {
  low: 'secondary', medium: 'default', high: 'destructive', critical: 'destructive',
};

const ACTION_LABELS: Record<string, string> = {
  none_required: '✅ No action required',
  monitor: '👁 Monitor — check at next service',
  schedule_maintenance: '🔧 Schedule maintenance',
  immediate_repair: '⚠️ Immediate repair needed',
  take_out_of_service: '🛑 Take out of service',
};

export default function DefectDetection() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [context, setContext] = useState('');

  const analyseMut = useMutation({
    mutationFn: async (file: File) => {
      return new Promise<AnalysisResult>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const res = await apiClient.request('/api/ai/vision/analyse', {
              method: 'POST',
              body: JSON.stringify({ imageBase64: base64, mimeType: file.type, context }),
            });
            if (res.error) throw new Error(res.error.message ?? 'Analysis failed');
            resolve(res.data as AnalysisResult);
          } catch (e) { reject(e); }
        };
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(file);
      });
    },
    onSuccess: (data) => {
      setResult(data);
      const count = data.defects.length;
      const providerLabel = data.provider === 'openai_gpt4o' ? 'GPT-4o' : 'mock';
      toast({
        title: `Analysis complete — ${count} defect${count !== 1 ? 's' : ''} found`,
        description: `Provider: ${providerLabel} · Score: ${(data.overallScore * 100).toFixed(0)}%`,
      });
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
        <div>
          <h1 className="text-3xl font-bold">Defect Detection</h1>
          <p className="text-muted-foreground text-sm">GPT-4o Vision — real analysis when OPENAI_API_KEY is set</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Upload Equipment Photo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="context-note" className="text-sm">Context (optional)</Label>
            <Input
              id="context-note"
              placeholder="e.g. HVAC unit after 2-year service, suspected compressor issue"
              value={context}
              onChange={e => setContext(e.target.value)}
              className="mt-1"
            />
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <Button onClick={() => fileRef.current?.click()} disabled={analyseMut.isPending}>
            {analyseMut.isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analysing…</>
              : <><Upload className="h-4 w-4 mr-2" />Choose Image</>}
          </Button>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader><CardTitle>Image Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="relative inline-block max-w-full">
              <img src={preview} alt="Uploaded" className="max-w-full max-h-96 rounded" />
              {result?.defects.map((defect, i) =>
                defect.boundingBox ? (
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
                ) : null
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          {/* Overall condition summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Analysis Result</span>
                <div className="flex items-center gap-2">
                  {result.provider && (
                    <Badge variant="outline" className="text-xs">
                      {result.provider === 'openai_gpt4o' ? '🤖 GPT-4o' : '🧪 Mock'}
                    </Badge>
                  )}
                  <span className={`text-sm font-semibold px-2 py-1 rounded ${CONDITION_BADGE[result.overallCondition ?? 'good'] ?? 'bg-gray-100'}`}>
                    {result.overallCondition?.toUpperCase() ?? 'UNKNOWN'} — {(result.overallScore * 100).toFixed(0)}%
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.description && (
                <p className="text-sm">{result.description}</p>
              )}
              {result.recommendedAction && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded">
                  <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">
                    {ACTION_LABELS[result.recommendedAction] ?? result.recommendedAction}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Defect list */}
          <Card>
            <CardHeader>
              <CardTitle>
                {result.defects.length === 0
                  ? <span className="flex items-center gap-2"><CheckCircle2 className="text-green-500" />No Defects Detected</span>
                  : <span className="flex items-center gap-2"><AlertTriangle className="text-amber-500" />{result.defects.length} Defect{result.defects.length !== 1 ? 's' : ''} Found</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.defects.length === 0 ? (
                <p className="text-muted-foreground text-sm">Equipment appears in good condition.</p>
              ) : (
                <ul className="space-y-2">
                  {result.defects.map((d, i) => (
                    <li key={i} className="flex justify-between items-start p-3 border rounded">
                      <div>
                        <span className="font-medium capitalize">{d.label}</span>
                        {d.location && <p className="text-xs text-muted-foreground mt-0.5">{d.location}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {d.severity && (
                          <Badge variant={SEVERITY_BADGE[d.severity] ?? 'secondary'} className="capitalize">
                            {d.severity}
                          </Badge>
                        )}
                        <Badge variant="outline">{(d.confidence * 100).toFixed(1)}%</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
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
