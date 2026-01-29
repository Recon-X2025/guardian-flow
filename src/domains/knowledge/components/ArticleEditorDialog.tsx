import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, Save, Eye } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { apiClient } from '@/integrations/api/client';
import { ArticleDocumentUpload } from './ArticleDocumentUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Article {
  id?: string;
  title: string;
  summary?: string;
  content?: string;
  category_id?: string;
  status: 'draft' | 'published' | 'archived';
  tag_names?: string[];
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface ArticleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: Article | null;
  onSuccess: () => void;
}

export function ArticleEditorDialog({ open, onOpenChange, article, onSuccess }: ArticleEditorDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<Article>({
    title: '',
    summary: '',
    content: '',
    category_id: '',
    status: 'draft',
    tag_names: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [createdArticleId, setCreatedArticleId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (article) {
        setFormData({
          title: article.title || '',
          summary: article.summary || '',
          content: article.content || '',
          category_id: article.category_id || '',
          status: article.status || 'draft',
          tag_names: article.tag_names || [],
        });
      } else {
        setFormData({
          title: '',
          summary: '',
          content: '',
          category_id: '',
          status: 'draft',
          tag_names: [],
        });
      }
        setTagInput('');
        setPreviewMode(false);
        setCreatedArticleId(null);
    }
  }, [open, article]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.request('/api/knowledge-base/categories', {
        method: 'GET',
      });
      if (response.error) throw response.error;
      setCategories(response.data?.categories || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tag_names?.includes(tag)) {
      setFormData({
        ...formData,
        tag_names: [...(formData.tag_names || []), tag],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tag_names: formData.tag_names?.filter(tag => tag !== tagToRemove) || [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      toast({
        title: 'Validation Error',
        description: 'Title and content are required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (article?.id) {
        // Update existing article
        const response = await apiClient.request(`/api/knowledge-base/articles/${article.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.error) throw response.error;

        toast({
          title: 'Article Updated',
          description: 'Article has been successfully updated',
        });
      } else {
        // Create new article
        const response = await apiClient.request('/api/knowledge-base/articles', {
          method: 'POST',
          body: JSON.stringify(formData),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.error) throw response.error;

        // Store the created article ID to show document upload
        const createdArticle = response.data?.article;
        if (createdArticle?.id) {
          setCreatedArticleId(createdArticle.id);
        }

        toast({
          title: 'Article Created',
          description: 'Article has been successfully created',
        });
      }

      // Don't close dialog if article was just created (allow upload)
      if (article?.id) {
        onSuccess();
        onOpenChange(false);
      } else {
        // For new articles, stay open to allow document upload
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error saving article:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save article',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{article?.id ? 'Edit Article' : 'Create Article'}</DialogTitle>
          <DialogDescription>
            {article?.id ? 'Update the article details' : 'Create a new knowledge base article'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Article title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id || ''}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Brief summary of the article"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Content *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="h-4 w-4 mr-1" />
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
            </div>
            {previewMode ? (
              <div className="min-h-[300px] p-4 border rounded-md bg-muted/50 prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: formData.content?.replace(/\n/g, '<br />') || '' }} />
              </div>
            ) : (
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Article content (supports markdown-style formatting)"
                rows={12}
                required
                className="font-mono text-sm"
              />
            )}
            <p className="text-xs text-muted-foreground">
              Use line breaks for paragraphs. HTML formatting will be preserved.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'draft' | 'published' | 'archived') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag and press Enter"
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {formData.tag_names && formData.tag_names.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tag_names.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Document Upload - show for existing or newly created articles */}
          {(article?.id || createdArticleId) && (
            <div className="pt-4 border-t">
              <ArticleDocumentUpload 
                articleId={createdArticleId || article?.id || ''} 
                onUploadSuccess={() => {
                  // Refresh article data if needed
                }} 
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {article?.id ? 'Update Article' : 'Create Article'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

