import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Brain } from 'lucide-react';

interface FeatureImportance {
  feature: string;
  importance: number;
  direction: string;
}

interface CounterfactualAlt {
  feature: string;
  original: unknown;
  suggested: unknown;
  impact: number;
}

export default function ExplainabilityDashboard() {
  const { toast } = useToast();
  const [modelId, setModelId] = useState('');
  const [inputJson, setInputJson] = useState('{"age": 35, "income": 50000, "score": 720}');
  const [result, setResult] = useState<{ featureImportances: FeatureImportance[]; counterfactual: { alternatives: CounterfactualAlt[] } } | null>(null);

  const explainMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ml/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, inputData: JSON.parse(inputJson) }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => setResult(data),
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const chartData = (result?.featureImportances || []).map(f => ({
    name: f.feature,
    value: f.importance,
    fill: f.direction === 'positive' ? '#22c55e' : '#ef4444',
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Brain className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Explainability Dashboard</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Explain Prediction</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Model ID" value={modelId} onChange={e => setModelId(e.target.value)} />
          <textarea
            className="w-full border rounded p-2 text-sm font-mono min-h-[80px]"
            value={inputJson}
            onChange={e => setInputJson(e.target.value)}
            placeholder='{"feature1": value, ...}'
          />
          <Button onClick={() => explainMut.mutate()} disabled={explainMut.isPending || !modelId}>
            Explain
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader><CardTitle>Feature Importance</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 1]} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Counterfactual Alternatives</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>Original</TableHead>
                    <TableHead>Suggested</TableHead>
                    <TableHead>Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(result.counterfactual?.alternatives || []).map((alt, i) => (
                    <TableRow key={i}>
                      <TableCell>{alt.feature}</TableCell>
                      <TableCell>{String(alt.original)}</TableCell>
                      <TableCell>{String(alt.suggested)}</TableCell>
                      <TableCell>{(alt.impact * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
