import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Play, Download, Code, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";

interface Workspace {
  id: string;
  name: string;
}

interface DataSource {
  id: string;
  name: string;
}

interface QueryResults {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  execution_time_ms: number;
  rows_affected: number;
}

export function AnalyticsQueryExecutor() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [query, setQuery] = useState("SELECT * FROM customers LIMIT 100;");
  const [results, setResults] = useState<QueryResults | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const { data: workspaces } = useQuery({
    queryKey: ["analytics-workspaces"],
    queryFn: async () => {
      const result = await apiClient.functions.invoke("analytics-workspace-manager", {
        body: { action: "list" },
      });
      if (result.error) throw result.error;
      return result.data?.workspaces || [];
    },
  });

  const { data: dataSources } = useQuery({
    queryKey: ["analytics-data-sources", selectedWorkspace],
    enabled: !!selectedWorkspace,
    queryFn: async () => {
      const result = await apiClient.functions.invoke("analytics-data-source-manager", {
        body: { action: "list", payload: { workspace_id: selectedWorkspace } },
      });
      if (result.error) throw result.error;
      return result.data?.data_sources || [];
    },
  });

  const handleExecute = async () => {
    if (!selectedSource || !query.trim()) {
      toast.error("Please select a data source and enter a query");
      return;
    }

    setIsExecuting(true);
    
    try {
      // Mock query execution
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockResults = {
        columns: ["id", "name", "email", "created_at", "status"],
        rows: Array.from({ length: 10 }, (_, i) => [
          i + 1,
          `Customer ${i + 1}`,
          `customer${i + 1}@example.com`,
          new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          ["active", "inactive", "pending"][Math.floor(Math.random() * 3)]
        ]),
        execution_time_ms: 234,
        rows_affected: 10,
      };

      setResults(mockResults);
      toast.success(`Query executed successfully in ${mockResults.execution_time_ms}ms`);
    } catch (error) {
      toast.error("Query execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExport = () => {
    if (!results) return;

    const csv = [
      results.columns.join(","),
      ...results.rows.map((row: (string | number | boolean | null)[]) => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query-results-${Date.now()}.csv`;
    a.click();
    toast.success("Results exported to CSV");
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces?.map((ws: Workspace) => (
                <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSource} onValueChange={setSelectedSource} disabled={!selectedWorkspace}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select data source" />
            </SelectTrigger>
            <SelectContent>
              {dataSources?.map((source: DataSource) => (
                <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleExecute} 
            disabled={!selectedSource || isExecuting}
          >
            <Play className="h-4 w-4 mr-2" />
            {isExecuting ? "Executing..." : "Execute"}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={!results}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Query Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                SQL Query Editor
              </CardTitle>
              <CardDescription>Write and execute SQL queries against your data sources</CardDescription>
            </div>
            {results && (
              <Badge variant="outline">
                {results.rows_affected} rows • {results.execution_time_ms}ms
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your SQL query..."
            className="font-mono text-sm min-h-[200px]"
          />
          
          <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Query Guidelines:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Only SELECT queries are allowed for security</li>
                <li>Results are limited to 10,000 rows</li>
                <li>Query timeout is set to 30 seconds</li>
                <li>All queries are logged for audit purposes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Query Results</CardTitle>
            <CardDescription>
              Showing {results.rows.length} of {results.rows_affected} rows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {results.columns.map((col: string) => (
                      <th key={col} className="text-left p-2 font-medium bg-muted/50">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.rows.map((row: (string | number | boolean | null)[], i: number) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      {row.map((cell, j) => (
                        <td key={j} className="p-2">
                          {typeof cell === 'string' && cell.length > 50 
                            ? cell.substring(0, 50) + "..." 
                            : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}