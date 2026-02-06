import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Brain, 
  Database, 
  Search, 
  Zap, 
  FileText, 
  Settings, 
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface DocumentChunk {
  id: string;
  content: string;
  source: string;
  relevance: number;
}

export default function RAGEngine() {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<DocumentChunk[]>([]);
  const [embeddingStats, setEmbeddingStats] = useState({
    totalDocuments: 1247,
    totalChunks: 8932,
    vectorDimension: 1536,
    lastIndexed: "2025-10-07 14:32:00"
  });

  const handleQuery = async () => {
    setIsProcessing(true);
    
    // Simulate RAG query processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setResults([
      {
        id: "chunk_001",
        content: "The standard warranty period for PC and Print units is 12 months from installation date. Extended warranties are available for premium customers.",
        source: "warranty_policy.pdf",
        relevance: 0.94
      },
      {
        id: "chunk_002",
        content: "Work order penalties apply when service completion exceeds SLA by more than 4 hours. Penalty calculation is based on 15% of quoted cost.",
        source: "service_operations_manual.pdf",
        relevance: 0.87
      },
      {
        id: "chunk_003",
        content: "Pre-check validation includes photo verification, inventory availability check, and warranty status confirmation before work order release.",
        source: "ops_procedures.pdf",
        relevance: 0.82
      }
    ]);
    
    setIsProcessing(false);
  };

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8" />
            RAG Engine
          </h1>
          <p className="text-muted-foreground mt-1">
            Retrieval-Augmented Generation for Contextual AI
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Configure
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{embeddingStats.totalDocuments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Indexed sources</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vector Chunks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{embeddingStats.totalChunks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Searchable segments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vector Dimensions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{embeddingStats.vectorDimension}</div>
            <p className="text-xs text-muted-foreground mt-1">Embedding size</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Indexed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">Recently</div>
            <p className="text-xs text-muted-foreground mt-1">{embeddingStats.lastIndexed}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="query" className="space-y-4">
        <TabsList>
          <TabsTrigger value="query">Query Interface</TabsTrigger>
          <TabsTrigger value="index">Vector Index</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="query" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Semantic Search</CardTitle>
              <CardDescription>
                Query the vector database using natural language
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Query</label>
                <Textarea
                  placeholder="Ask a question about your operational data..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <Button 
                onClick={handleQuery} 
                disabled={!query || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing Query...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search Vector Database
                  </>
                )}
              </Button>

              {results.length > 0 && (
                <div className="space-y-3 mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Retrieved Contexts</h3>
                    <Badge variant="secondary">{results.length} chunks</Badge>
                  </div>

                  {results.map((result, index) => (
                    <Card key={result.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{result.source}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Relevance:</span>
                            <Badge variant={result.relevance > 0.9 ? "default" : "secondary"}>
                              {(result.relevance * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed">{result.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="index" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vector Index Status</CardTitle>
              <CardDescription>
                Monitor and manage your document embeddings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Vector Store</p>
                      <p className="text-xs text-muted-foreground">MongoDB Atlas Vector Search</p>
                    </div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Embedding Model</p>
                      <p className="text-xs text-muted-foreground">text-embedding-3-small (1536D)</p>
                    </div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Brain className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Chunking Strategy</p>
                      <p className="text-xs text-muted-foreground">Recursive character splitting (512 tokens)</p>
                    </div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
              </div>

              <Button className="w-full" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Rebuild Vector Index
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Indexed Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { name: "Product Manuals", docs: 347, chunks: 2893 },
                  { name: "Service Procedures", docs: 521, chunks: 3124 },
                  { name: "Warranty Policies", docs: 89, chunks: 712 },
                  { name: "Training Materials", docs: 203, chunks: 1548 },
                  { name: "Compliance Documents", docs: 87, chunks: 655 }
                ].map((collection, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{collection.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {collection.docs} documents • {collection.chunks.toLocaleString()} chunks
                      </p>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>RAG Configuration</CardTitle>
              <CardDescription>
                Fine-tune retrieval and generation parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Top K Results</label>
                <Input type="number" defaultValue="5" />
                <p className="text-xs text-muted-foreground">
                  Number of top matching chunks to retrieve
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Similarity Threshold</label>
                <Input type="number" defaultValue="0.75" step="0.01" min="0" max="1" />
                <p className="text-xs text-muted-foreground">
                  Minimum cosine similarity for chunk inclusion
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Context Window Size</label>
                <Input type="number" defaultValue="512" />
                <p className="text-xs text-muted-foreground">
                  Maximum tokens per chunk
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Chunk Overlap</label>
                <Input type="number" defaultValue="64" />
                <p className="text-xs text-muted-foreground">
                  Token overlap between consecutive chunks
                </p>
              </div>

              <Button className="w-full">
                Save Configuration
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Query Latency</span>
                  <span className="font-medium">342ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cache Hit Rate</span>
                  <span className="font-medium">78%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Queries (24h)</span>
                  <span className="font-medium">1,847</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
