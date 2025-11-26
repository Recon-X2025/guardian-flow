import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Upload, FileText, Book, AlertCircle, Plus, Eye, Loader2, Edit, Trash2, Settings, MoreVertical } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/contexts/RBACContext';
import { ArticleEditorDialog } from '@/components/ArticleEditorDialog';
import { ArticleDocumentUpload } from '@/components/ArticleDocumentUpload';

interface Article {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  status: string;
  views_count: number;
  helpful_count: number;
  not_helpful_count: number;
  category_name?: string;
  category_id?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  published_at?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  article_count: number;
}

interface Tag {
  id: string;
  name: string;
  article_count: number;
}

export default function KnowledgeBase() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasPermission } = useRBAC();
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [allArticles, setAllArticles] = useState<Article[]>([]); // For admin view
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);
  const [activeTab, setActiveTab] = useState('browse');

  const canCreateArticle = hasPermission('admin.config') || hasPermission('article.create');
  const canManageArticles = hasPermission('admin.config') || hasPermission('article.edit');
  const isAdmin = hasPermission('admin.config');

  useEffect(() => {
    if (activeTab === 'browse') {
      fetchArticles('published');
    } else if (activeTab === 'admin') {
      fetchAllArticles();
    }
    fetchCategories();
    fetchTags();
  }, [selectedCategory, selectedTag, activeTab]);

  const fetchArticles = async (status = 'published') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status,
        limit: '100',
      });
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      if (selectedTag) {
        params.append('tag', selectedTag);
      }

      const response = await apiClient.request(`/api/knowledge-base/articles?${params.toString()}`, {
        method: 'GET',
      });

      if (response.error) throw response.error;
      setArticles(response.data?.articles || []);
    } catch (error: any) {
      console.error('Error fetching articles:', error);
      toast({
        title: 'Error loading articles',
        description: error.message || 'Failed to load knowledge base articles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllArticles = async () => {
    try {
      setLoading(true);
      // Fetch all statuses - get published, draft, and archived
      const allStatusResponses = await Promise.all([
        apiClient.request('/api/knowledge-base/articles?status=published&limit=200', { method: 'GET' }),
        apiClient.request('/api/knowledge-base/articles?status=draft&limit=200', { method: 'GET' }),
        apiClient.request('/api/knowledge-base/articles?status=archived&limit=200', { method: 'GET' }),
      ]);

      const allArticles = [];
      for (const response of allStatusResponses) {
        if (!response.error && response.data?.articles) {
          allArticles.push(...response.data.articles);
        }
      }

      setAllArticles(allArticles);
    } catch (error: any) {
      console.error('Error fetching all articles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load all articles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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

  const fetchTags = async () => {
    try {
      const response = await apiClient.request('/api/knowledge-base/tags', {
        method: 'GET',
      });

      if (response.error) throw response.error;
      setTags(response.data?.tags || []);
    } catch (error: any) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchArticle = async (articleId: string) => {
    try {
      const response = await apiClient.request(`/api/knowledge-base/articles/${articleId}`, {
        method: 'GET',
      });

      if (response.error) throw response.error;
      setSelectedArticle(response.data?.article);
    } catch (error: any) {
      toast({
        title: 'Error loading article',
        description: error.message || 'Failed to load article',
        variant: 'destructive',
      });
    }
  };

  const handleSearch = () => {
    if (activeTab === 'browse') {
      fetchArticles('published');
    } else {
      fetchAllArticles();
    }
  };

  const handleArticleClick = (article: Article) => {
    fetchArticle(article.id);
  };

  const handleCreateArticle = () => {
    setEditingArticle(null);
    setEditorOpen(true);
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setEditorOpen(true);
  };

  const handleDeleteArticle = async () => {
    if (!articleToDelete) return;

    try {
      const response = await apiClient.request(`/api/knowledge-base/articles/${articleToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.error) throw response.error;

      toast({
        title: 'Article Deleted',
        description: 'Article has been successfully deleted',
      });

      setDeleteDialogOpen(false);
      setArticleToDelete(null);
      fetchAllArticles();
      fetchArticles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete article',
        variant: 'destructive',
      });
    }
  };

  const handleEditorSuccess = () => {
    fetchArticles();
    fetchAllArticles();
    setEditorOpen(false);
    setEditingArticle(null);
  };

  const filteredArticles = (activeTab === 'admin' ? allArticles : articles).filter(article => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      article.title.toLowerCase().includes(query) ||
      article.summary?.toLowerCase().includes(query) ||
      article.category_name?.toLowerCase().includes(query) ||
      article.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Knowledge Base</h1>
          <p className="text-muted-foreground">PC & Print technical documentation and service guides</p>
        </div>
        {canCreateArticle && (
          <Button onClick={handleCreateArticle}>
            <Plus className="mr-2 h-4 w-4" />
            Create Article
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="browse">Browse Articles</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Admin Management</TabsTrigger>}
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
                <Button 
                  className="absolute right-2 top-2" 
                  size="sm"
                  onClick={handleSearch}
                >
                  Search
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Loading articles...</p>
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No articles found. Try a different search term.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredArticles.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div 
                        className="flex-1 space-y-2 cursor-pointer"
                        onClick={() => handleArticleClick(article)}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="font-semibold">{article.title}</span>
                        </div>
                        {article.summary && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {article.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          {article.category_name && (
                            <Badge variant="outline" className="text-xs">
                              {article.category_name}
                            </Badge>
                          )}
                          {article.tags?.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          <span className="text-xs text-muted-foreground">
                            {article.views_count} views
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Last updated: {new Date(article.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArticleClick(article);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManageArticles && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditArticle(article)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setArticleToDelete(article);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Article Management</CardTitle>
                <CardDescription>Manage all articles including drafts and archived</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : allArticles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No articles found.</p>
                    </div>
                  ) : (
                    allArticles.map((article) => (
                      <div
                        key={article.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{article.title}</span>
                            <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                              {article.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {article.views_count} views • Updated {new Date(article.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditArticle(article)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setArticleToDelete(article);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

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
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No categories found</p>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCategory === category.name ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setSelectedCategory(selectedCategory === category.name ? '' : category.name);
                      handleSearch();
                    }}
                  >
                    <span className="text-sm font-medium">{category.name}</span>
                    <Badge variant="outline">
                      {category.article_count}
                    </Badge>
                  </div>
                ))
              )}
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
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tags found</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 20).map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTag === tag.name ? 'default' : 'secondary'}
                    className={`cursor-pointer hover:bg-primary/10 ${
                      selectedTag === tag.name ? 'bg-primary' : ''
                    }`}
                    onClick={() => {
                      setSelectedTag(selectedTag === tag.name ? '' : tag.name);
                      handleSearch();
                    }}
                  >
                    {tag.name} ({tag.article_count})
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Article Editor Dialog */}
      <ArticleEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        article={editingArticle}
        onSuccess={handleEditorSuccess}
      />

      {/* Article View Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle>{selectedArticle.title}</DialogTitle>
                    <DialogDescription>
                      {selectedArticle.category_name && (
                        <Badge variant="outline" className="mr-2">
                          {selectedArticle.category_name}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {selectedArticle.views_count} views • Last updated {new Date(selectedArticle.updated_at).toLocaleDateString()}
                      </span>
                    </DialogDescription>
                  </div>
                  {canManageArticles && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedArticle(null);
                        handleEditArticle(selectedArticle);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </DialogHeader>
              <div className="space-y-4">
                {selectedArticle.summary && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="font-medium mb-2">Summary</p>
                    <p className="text-sm text-muted-foreground">{selectedArticle.summary}</p>
                  </div>
                )}
                <div className="prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: selectedArticle.content?.replace(/\n/g, '<br />') || '' }} />
                </div>
                {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    {selectedArticle.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{articleToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteArticle}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
