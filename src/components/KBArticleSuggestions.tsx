import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface KBArticle {
  id: string;
  title: string;
  category: string;
  tags: string[];
  relevanceScore?: number;
}

interface KBArticleSuggestionsProps {
  symptom: string;
  compact?: boolean;
}

// Mock KB articles database
const kbArticles: KBArticle[] = [
  {
    id: '1',
    title: 'HP LaserJet Pro Paper Jam Resolution',
    category: 'Troubleshooting',
    tags: ['printer', 'paper-jam', 'hp', 'jam', 'paper'],
  },
  {
    id: '2',
    title: 'Dell OptiPlex Power Supply Replacement Guide',
    category: 'Repair Procedures',
    tags: ['desktop', 'power-supply', 'dell', 'power', 'boot', 'won\'t start'],
  },
  {
    id: '3',
    title: 'Brother MFC Drum Unit Installation',
    category: 'Maintenance',
    tags: ['mfp', 'drum-unit', 'brother', 'print quality', 'lines'],
  },
  {
    id: '4',
    title: 'PC Boot Failure Diagnostic Flow',
    category: 'Troubleshooting',
    tags: ['desktop', 'diagnostics', 'boot-failure', 'won\'t boot', 'no display', 'power'],
  },
  {
    id: '5',
    title: 'Toner Cartridge Compatibility Matrix',
    category: 'Reference',
    tags: ['printer', 'toner', 'compatibility', 'cartridge'],
  },
  {
    id: '6',
    title: 'Print Quality Issues - Streaks and Lines',
    category: 'Troubleshooting',
    tags: ['printer', 'print-quality', 'streaks', 'lines', 'faded'],
  },
  {
    id: '7',
    title: 'RAM Module Testing and Replacement',
    category: 'Repair Procedures',
    tags: ['desktop', 'ram', 'memory', 'crash', 'freeze', 'blue-screen'],
  },
  {
    id: '8',
    title: 'Network Printer Connection Issues',
    category: 'Troubleshooting',
    tags: ['printer', 'network', 'connection', 'offline', 'wifi'],
  },
];

const calculateRelevance = (symptom: string, article: KBArticle): number => {
  const symptomLower = symptom.toLowerCase();
  const words = symptomLower.split(/\s+/);
  
  let score = 0;
  
  // Check title match
  if (article.title.toLowerCase().includes(symptomLower)) {
    score += 10;
  }
  
  // Check individual word matches in tags
  words.forEach(word => {
    if (word.length > 2) { // Skip very short words
      article.tags.forEach(tag => {
        if (tag.toLowerCase().includes(word) || word.includes(tag.toLowerCase())) {
          score += 5;
        }
      });
      
      // Also check title
      if (article.title.toLowerCase().includes(word)) {
        score += 3;
      }
    }
  });
  
  return score;
};

export function KBArticleSuggestions({ symptom, compact = false }: KBArticleSuggestionsProps) {
  const navigate = useNavigate();
  
  // Calculate relevance scores and sort
  const suggestedArticles = kbArticles
    .map(article => ({
      ...article,
      relevanceScore: calculateRelevance(symptom, article),
    }))
    .filter(article => article.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, compact ? 3 : 5);

  if (suggestedArticles.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No KB articles found for this issue
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate('/knowledge-base')}
              className="mt-2"
            >
              Browse all articles
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Related KB Articles</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/knowledge-base')}
          >
            View All
          </Button>
        </div>
        {suggestedArticles.map((article) => (
          <div
            key={article.id}
            className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-sm"
            onClick={() => navigate('/knowledge-base')}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{article.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {article.category}
                  </Badge>
                  {article.relevanceScore && article.relevanceScore > 10 && (
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                      High Match
                    </Badge>
                  )}
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Recommended Knowledge Base Articles
        </CardTitle>
        <CardDescription>
          Technical guides related to: "{symptom}"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestedArticles.map((article) => (
            <div
              key={article.id}
              className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate('/knowledge-base')}
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{article.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {article.category}
                  </Badge>
                  {article.relevanceScore && article.relevanceScore > 10 && (
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                      High Match ({article.relevanceScore} pts)
                    </Badge>
                  )}
                  {article.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/knowledge-base')}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Browse All Knowledge Base
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
