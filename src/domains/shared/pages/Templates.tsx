import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Eye, Download, History, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Template {
  id: string;
  template_name: string;
  template_type: string;
  version?: number;
  file_format?: string;
  is_active?: boolean;
  placeholders: string[];
  created_at: string;
  template_versions?: { count: number }[];
}

export default function Templates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // Upload form state
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [placeholders, setPlaceholders] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      // Fetch templates and versions separately (apiClient doesn't support joins)
      const templatesResult = await apiClient
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (templatesResult.error) throw templatesResult.error;
      const templatesData = templatesResult.data || [];
      
      // Fetch template versions separately and merge
      const versionsResult = await apiClient.from('template_versions').select('*');
      const versions = (versionsResult.data || []) as { template_id: string }[];

      const templatesWithCounts: Template[] = templatesData.map((template) => ({
        ...template,
        placeholders: template.placeholders || [],
        template_versions: [{ count: versions.filter((v) => v.template_id === template.id).length }]
      }));

      setTemplates(templatesWithCounts);
    } catch (error: unknown) {
      toast({
        title: 'Error loading templates',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['docx', 'pdf', 'html'].includes(ext || '')) {
        toast({
          title: 'Invalid file format',
          description: 'Only DOCX, PDF, and HTML files are supported',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !templateName || !templateType || !placeholders) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill all fields before uploading',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Parse placeholders
      const placeholderArray = placeholders
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      if (placeholderArray.length === 0) {
        throw new Error('At least one placeholder is required');
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('template_name', templateName);
      formData.append('template_type', templateType);
      formData.append('placeholders', JSON.stringify(placeholderArray));
      formData.append('preview_data', JSON.stringify({}));

      // Upload via API endpoint
      const result = await apiClient.functions.invoke('template-upload', {
        body: formData,
      });

      if (result.error) throw result.error;

      toast({
        title: 'Template uploaded',
        description: data.message || 'Template uploaded successfully',
      });

      setUploadOpen(false);
      setTemplateName('');
      setTemplateType('');
      setSelectedFile(null);
      setPlaceholders('');
      fetchTemplates();
    } catch (error: unknown) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      invoice: 'bg-blue-100 text-blue-800',
      quotation: 'bg-purple-100 text-purple-800',
      service_order: 'bg-green-100 text-green-800',
      work_order: 'bg-orange-100 text-orange-800',
      warranty_certificate: 'bg-pink-100 text-pink-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Templates</h1>
          <p className="text-muted-foreground">Manage customizable templates for invoices, quotes, and service orders</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Upload Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload New Template</DialogTitle>
              <DialogDescription>
                Upload a DOCX, PDF, or HTML template with placeholders like {'{{customer_name}}'}, {'{{invoice_date}}'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Standard Invoice Template"
                />
              </div>
              <div>
                <Label htmlFor="template-type">Template Type</Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="quotation">Quotation</SelectItem>
                    <SelectItem value="service_order">Service Order</SelectItem>
                    <SelectItem value="work_order">Work Order</SelectItem>
                    <SelectItem value="warranty_certificate">Warranty Certificate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="placeholders">Placeholders (comma-separated)</Label>
                <Input
                  id="placeholders"
                  value={placeholders}
                  onChange={(e) => setPlaceholders(e.target.value)}
                  placeholder="e.g., customer_name, invoice_date, total_amount"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use these in your template as {'{{placeholder_name}}'}
                </p>
              </div>
              <div>
                <Label htmlFor="file">Template File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".docx,.pdf,.html"
                  onChange={handleFileSelect}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Supported formats:</strong> DOCX, PDF, HTML<br />
                  <strong>Max file size:</strong> 10MB<br />
                  <strong>Placeholder syntax:</strong> Use double curly braces {'{{placeholder}}'}<br />
                  <strong>Version control:</strong> Uploading a new template automatically versions it
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={uploading} className="flex-1">
                  {uploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-pulse" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Template
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setUploadOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Templates</TabsTrigger>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="usage">Usage Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : templates.filter(t => t.is_active).length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active templates found</p>
                  <p className="text-sm mt-2">Upload your first template to get started</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.filter(t => t.is_active).map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.template_name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-2">
                          <Badge className={getTypeColor(template.template_type)}>
                            {template.template_type}
                          </Badge>
                          <Badge variant="outline">v{template.version}</Badge>
                          <Badge variant="outline">{template.file_format.toUpperCase()}</Badge>
                        </CardDescription>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Placeholders:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(template.placeholders as string[]).map((p: string) => (
                            <Badge key={p} variant="secondary" className="text-xs">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(template.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <History className="h-4 w-4 mr-1" />
                        Versions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Templates</CardTitle>
              <CardDescription>View all templates including inactive versions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">All templates list will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Usage Analytics</CardTitle>
              <CardDescription>Template usage logs and rendering statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Usage statistics will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}