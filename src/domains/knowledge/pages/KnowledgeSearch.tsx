import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Search, FileText } from 'lucide-react';

interface SearchResult {
  content: string;
  source: string;
  relevanceScore: number;
  lineage: { collection: string; id: string };
}

export default function KnowledgeSearch() {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [includeDecisions, setIncludeDecisions] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const searchMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/knowledge/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, includeDecisionRecords: includeDecisions, topK: 10 }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => setResults(data.results || []),
    onError: (e: Error) => toast({ title: 'Search failed', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Search className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Knowledge Search</h1>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search knowledge base..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && query && searchMut.mutate()}
              className="flex-1"
            />
            <Button onClick={() => searchMut.mutate()} disabled={searchMut.isPending || !query}>
              <Search className="h-4 w-4 mr-2" />Search
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={includeDecisions}
              onChange={e => setIncludeDecisions(e.target.checked)}
              className="rounded"
            />
            Include decision records
          </label>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{r.source}</span>
                  </div>
                  <Badge variant="secondary">{(r.relevanceScore * 100).toFixed(0)}% relevant</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">{r.content || 'No content preview available.'}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Collection: {r.lineage?.collection} · ID: {r.lineage?.id}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results.length === 0 && searchMut.isSuccess && (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">No results found.</CardContent></Card>
      )}
    </div>
  );
}
