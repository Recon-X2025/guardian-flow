import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, HelpCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { FAQ, FaqCategory } from './types';

interface FaqTabProps {
  faqs: FAQ[];
  faqCategories: FaqCategory[];
  faqSearch: string;
  selectedFaqCategory: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (category: string) => void;
  onFeedback: (faqId: string, isHelpful: boolean) => void;
}

export function FaqTab({
  faqs,
  faqCategories,
  faqSearch,
  selectedFaqCategory,
  onSearchChange,
  onCategoryChange,
  onFeedback,
}: FaqTabProps) {
  const filteredFaqs = faqs.filter(faq => {
    if (selectedFaqCategory && faq.category_name !== selectedFaqCategory) return false;
    if (faqSearch) {
      const query = faqSearch.toLowerCase();
      return (
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Frequently Asked Questions</CardTitle>
        <CardDescription>Find answers to common questions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search FAQs..."
            className="pl-10"
            value={faqSearch}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Categories */}
        {faqCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedFaqCategory === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCategoryChange('')}
            >
              All
            </Button>
            {faqCategories.map((category) => (
              <Button
                key={category.id}
                variant={selectedFaqCategory === category.name ? 'default' : 'outline'}
                size="sm"
                onClick={() => onCategoryChange(
                  selectedFaqCategory === category.name ? '' : category.name
                )}
              >
                {category.name} ({category.faq_count || 0})
              </Button>
            ))}
          </div>
        )}

        {/* FAQ List */}
        {filteredFaqs.length > 0 ? (
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
                          onClick={() => onFeedback(faq.id, true)}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Helpful ({faq.helpful_count})
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFeedback(faq.id, false)}
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
          <div className="text-center py-8 text-muted-foreground">
            <HelpCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No FAQs found. Try a different search term.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
