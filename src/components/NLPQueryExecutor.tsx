import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Database, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function NLPQueryExecutor() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const executeQuery = async () => {
    if (!query.trim()) {
      toast({
        title: "Enter a query",
        description: "Please enter a natural language query",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('nlp-query-executor', {
        body: { naturalQuery: query }
      });

      if (error) {
        if (error.message?.includes('Rate limit')) {
          toast({
            title: "Rate Limit Exceeded",
            description: "Please wait a moment before trying again",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      setResult(data);

      toast({
        title: "Query Executed",
        description: `Returned ${data.rowCount} rows in ${data.executionTime}ms`,
      });
    } catch (error) {
      console.error('Query error:', error);
      toast({
        title: "Query Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Natural Language Query
              </CardTitle>
              <CardDescription>
                Ask questions in plain English - AI will convert to SQL
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Example: Show me all open work orders from this month"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
          />
          <Button onClick={executeQuery} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Execute Query
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Query Results</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                {result.executionTime}ms
              </Badge>
              <Badge variant="secondary">
                {result.rowCount} rows
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm font-medium mb-1">Generated SQL:</div>
              <code className="text-xs">{result.sql}</code>
            </div>

            {result.explanation && (
              <div className="text-sm text-muted-foreground">
                <strong>Explanation:</strong> {result.explanation}
              </div>
            )}

            {result.results?.length > 0 && (
              <div className="border rounded-lg overflow-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(result.results[0]).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.results.map((row: any, idx: number) => (
                      <TableRow key={idx}>
                        {Object.values(row).map((val: any, i) => (
                          <TableCell key={i}>
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
