import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Brain, Sparkles, Shield, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const EXAMPLE_QUERIES = [
  'How many work orders were completed last month?',
  'Top 5 assets by maintenance cost',
  'Show overdue invoices by vendor',
  'Total CO2 emissions by scope this year',
  'Which assets have the most failures?',
];

interface QueryResult {
  sql: string;
  results: Record<string, unknown>[];
  chartType: 'bar' | 'line' | 'table' | 'number';
  rowCount: number;
}

function BarChart({ data, labelKey, valueKey }: { data: Record<string, unknown>[]; labelKey: string; valueKey: string }) {
  const values = data.map(d => Number(d[valueKey]) || 0);
  const max = Math.max(...values, 1);
  return (
    <div className="space-y-2">
      {data.slice(0, 10).map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs w-32 truncate text-right text-muted-foreground">{String(row[labelKey] ?? i)}</span>
          <div className="flex-1 bg-muted rounded h-5 overflow-hidden">
            <div
              className="h-full bg-primary rounded"
              style={{ width: `${(values[i] / max) * 100}%` }}
            />
          </div>
          <span className="text-xs w-12 text-right">{values[i]}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, valueKey }: { data: Record<string, unknown>[]; valueKey: string }) {
  const values = data.map(d => Number(d[valueKey]) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const W = 500, H = 120, pad = 10;
  const points = values.map((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * (W - 2 * pad);
    const y = H - pad - ((v - min) / (max - min)) * (H - 2 * pad);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32">
      <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="2" points={points} />
      {values.map((v, i) => {
        const x = pad + (i / Math.max(values.length - 1, 1)) * (W - 2 * pad);
        const y = H - pad - ((v - min) / (max - min)) * (H - 2 * pad);
        return <circle key={i} cx={x} cy={y} r="3" fill="hsl(var(--primary))" />;
      })}
    </svg>
  );
}

export default function NLPQueryInterface() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sqlExpanded, setSqlExpanded] = useState(false);

  const handleAsk = async (q = question) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/analytics/nlp-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, tenantId: 'default' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Query failed');
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const columns = result?.results?.[0] ? Object.keys(result.results[0]) : [];
  const labelKey = columns[0] ?? 'label';
  const valueKey = columns[1] ?? columns[0] ?? 'value';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Natural Language Query</h1>
          <p className="text-muted-foreground">Ask questions about your data in plain English</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><Sparkles className="w-5 h-5 text-primary mb-1" /><CardTitle className="text-base">AI-Powered</CardTitle><CardDescription>Converts questions to optimized SQL</CardDescription></CardHeader></Card>
        <Card><CardHeader><Shield className="w-5 h-5 text-green-500 mb-1" /><CardTitle className="text-base">Secure</CardTitle><CardDescription>Read-only queries with safety validation</CardDescription></CardHeader></Card>
        <Card><CardHeader><Brain className="w-5 h-5 text-blue-500 mb-1" /><CardTitle className="text-base">Smart Fallback</CardTitle><CardDescription>Keyword matching when AI is unavailable</CardDescription></CardHeader></Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask a question about your data..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              className="flex-1 text-base"
            />
            <Button onClick={() => handleAsk()} disabled={loading || !question.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">Try:</span>
            {EXAMPLE_QUERIES.map(q => (
              <Badge
                key={q}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                onClick={() => { setQuestion(q); handleAsk(q); }}
              >
                {q}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Results <Badge variant="secondary" className="ml-2">{result.rowCount} row{result.rowCount !== 1 ? 's' : ''}</Badge></CardTitle>
                <Badge>{result.chartType}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {result.chartType === 'number' && (
                <div className="text-center py-8">
                  <p className="text-6xl font-bold text-primary">{result.results[0]?.[valueKey] ?? result.rowCount}</p>
                </div>
              )}
              {result.chartType === 'bar' && result.results.length > 0 && (
                <BarChart data={result.results} labelKey={labelKey} valueKey={valueKey} />
              )}
              {result.chartType === 'line' && result.results.length > 0 && (
                <LineChart data={result.results} valueKey={valueKey} />
              )}
              {result.chartType === 'table' && result.results.length > 0 && (
                <Table>
                  <TableHeader><TableRow>{columns.map(c => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {result.results.map((row, i) => (
                      <TableRow key={i}>{columns.map(c => <TableCell key={c}>{String(row[c] ?? '')}</TableCell>)}</TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <button
                className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                onClick={() => setSqlExpanded(!sqlExpanded)}
              >
                {sqlExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Generated SQL
              </button>
            </CardHeader>
            {sqlExpanded && (
              <CardContent>
                <pre className="bg-muted rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">{result.sql}</pre>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
