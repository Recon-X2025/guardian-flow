import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Upload, FileText, Book, AlertCircle } from 'lucide-react';

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mock KB articles for PC & Print domain
  const kbArticles = [
    {
      id: '1',
      title: 'HP LaserJet Pro Paper Jam Resolution',
      category: 'Troubleshooting',
      tags: ['printer', 'paper-jam', 'hp'],
      lastUpdated: '2025-09-15',
    },
    {
      id: '2',
      title: 'Dell OptiPlex Power Supply Replacement Guide',
      category: 'Repair Procedures',
      tags: ['desktop', 'power-supply', 'dell'],
      lastUpdated: '2025-09-20',
    },
    {
      id: '3',
      title: 'Brother MFC Drum Unit Installation',
      category: 'Maintenance',
      tags: ['mfp', 'drum-unit', 'brother'],
      lastUpdated: '2025-09-10',
    },
    {
      id: '4',
      title: 'PC Boot Failure Diagnostic Flow',
      category: 'Troubleshooting',
      tags: ['desktop', 'diagnostics', 'boot-failure'],
      lastUpdated: '2025-09-25',
    },
    {
      id: '5',
      title: 'Toner Cartridge Compatibility Matrix',
      category: 'Reference',
      tags: ['printer', 'toner', 'compatibility'],
      lastUpdated: '2025-09-18',
    },
  ];

  const filteredArticles = kbArticles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.tags.some(tag => tag.includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Knowledge Base</h1>
          <p className="text-muted-foreground">PC & Print technical documentation and service guides</p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Search Knowledge Base</CardTitle>
              <CardDescription>Find technical documentation and troubleshooting guides</CardDescription>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for device issues, repair procedures, part numbers..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No articles found. Try a different search term.
              </div>
            ) : (
              filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{article.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {article.category}
                      </Badge>
                      {article.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last updated: {new Date(article.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    View Article
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Document Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {['Troubleshooting', 'Repair Procedures', 'Maintenance', 'Reference', 'Safety Guidelines'].map((category) => (
                <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">{category}</span>
                  <Badge variant="outline">
                    {kbArticles.filter(a => a.category === category).length}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Popular Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['desktop', 'printer', 'mfp', 'power-supply', 'toner', 'drum-unit', 'paper-jam', 'boot-failure', 'diagnostics'].map((tag) => (
                <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-primary/10">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            KB Ingestion & RAG Integration
          </CardTitle>
          <CardDescription>Connect to external document processing pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              For production deployments with AI-powered search:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-card">
                <p className="font-semibold mb-2">Document Ingestion</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Upload PDF/DOCX service manuals</li>
                  <li>• Automatic chunking and embedding</li>
                  <li>• Metadata extraction (device model, part number)</li>
                  <li>• Version control for updated manuals</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg bg-card">
                <p className="font-semibold mb-2">RAG-Powered Search</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Semantic search with vector DB</li>
                  <li>• Contextual answers with citations</li>
                  <li>• Multi-modal support (text + images)</li>
                  <li>• Real-time sync with manual updates</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">External Integration Required</p>
                <p className="text-xs text-muted-foreground">
                  KB ingestion and RAG engine require vector DB (Pinecone, Weaviate, or pgvector) and embedding pipeline.
                  See <code className="px-1 py-0.5 rounded bg-card">docs/INFRASTRUCTURE_REQUIREMENTS.md</code> for details.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
