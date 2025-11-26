import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, HelpCircle, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category_name?: string;
  views_count: number;
  helpful_count: number;
  not_helpful_count: number;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  faq_count: number;
}

export default function FAQPage() {
  const { toast } = useToast();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    fetchFAQs();
    fetchCategories();
  }, []);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ published_only: 'true' });
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);

      const response = await apiClient.request(`/api/faqs?${params.toString()}`, {
        method: 'GET',
      });

      if (response.error) throw response.error;
      setFaqs(response.data?.faqs || []);
    } catch (error: any) {
      console.error('Error fetching FAQs:', error);
      toast({
        title: 'Error loading FAQs',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.request('/api/faqs/categories', {
        method: 'GET',
      });

      if (response.error) throw response.error;
      setCategories(response.data?.categories || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, [selectedCategory, searchQuery]);

  const handleFeedback = async (faqId: string, isHelpful: boolean) => {
    try {
      const response = await apiClient.request(`/api/faqs/${faqId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ is_helpful: isHelpful }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for your feedback!',
      });

      // Refresh FAQs
      fetchFAQs();
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
    }
  };

  const filteredFaqs = faqs;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mt-1">
          Find answers to common questions about our services
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Browse FAQs</CardTitle>
          <CardDescription>Search and filter frequently asked questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search FAQs..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('')}
              >
                All ({faqs.length})
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.name ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.name ? '' : category.name
                  )}
                >
                  {category.name} ({category.faq_count || 0})
                </Button>
              ))}
            </div>
          )}

          {/* FAQ List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFaqs.length > 0 ? (
            <Accordion type="multiple" className="space-y-2">
              {filteredFaqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-primary" />
                        <span className="font-medium">{faq.question}</span>
                      </div>
                      {faq.category_name && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {faq.category_name}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-4">
                    <div className="space-y-3">
                      <p className="text-sm whitespace-pre-line">{faq.answer}</p>
                      <div className="flex items-center gap-4 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          {faq.views_count} views
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(faq.id, true)}
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            Helpful ({faq.helpful_count})
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(faq.id, false)}
                          >
                            <ThumbsDown className="h-4 w-4 mr-1" />
                            Not Helpful ({faq.not_helpful_count})
                          </Button>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <HelpCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No FAQs found. Try a different search term or category.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

