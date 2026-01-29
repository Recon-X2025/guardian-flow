import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { apiClient } from '@/integrations/api/client';

interface ArticleDocumentUploadProps {
  articleId: string;
  onUploadSuccess?: () => void;
}

interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url?: string;
  uploaded_at: string;
}

export function ArticleDocumentUpload({ articleId, onUploadSuccess }: ArticleDocumentUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (articleId) {
      fetchAttachments();
    }
  }, [articleId]);

  const fetchAttachments = async () => {
    try {
      const response = await apiClient.request(`/api/knowledge-base/articles/${articleId}/attachments`, {
        method: 'GET',
      });
      if (response.error) throw response.error;
      setUploadedFiles(response.data?.attachments || []);
    } catch (error: any) {
      console.error('Error fetching attachments:', error);
      // Don't show error toast - attachments might not exist yet
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Only PDF, Word documents, images, and text files are allowed',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'File size must be less than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Convert file to base64 for upload
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result as string;
          const fileData = base64Data.split(',')[1]; // Remove data:type;base64, prefix

          // Upload via storage endpoint
          const response = await apiClient.request('/api/functions/upload-image', {
            method: 'POST',
            body: JSON.stringify({
              file: {
                name: file.name,
                type: file.type,
                size: file.size,
                data: fileData,
              },
              bucket: 'knowledge-base',
              fileName: `${articleId}/${Date.now()}-${file.name}`,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.error) throw response.error;

          // Create attachment record
          const attachmentResponse = await apiClient.request('/api/knowledge-base/articles/attachments', {
            method: 'POST',
            body: JSON.stringify({
              article_id: articleId,
              file_name: file.name,
              file_type: file.type.split('/')[1] || 'unknown',
              file_size: file.size,
              file_path: response.data?.filePath,
              file_url: response.data?.filePath,
              mime_type: file.type,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (attachmentResponse.error) throw attachmentResponse.error;

          toast({
            title: 'File Uploaded',
            description: `${file.name} has been successfully uploaded`,
          });

          // Refresh attachments list
          await fetchAttachments();

          if (onUploadSuccess) {
            onUploadSuccess();
          }
        } catch (error: any) {
          console.error('Upload error:', error);
          toast({
            title: 'Upload Failed',
            description: error.message || 'Failed to upload file',
            variant: 'destructive',
          });
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('File read error:', error);
      toast({
        title: 'Error',
        description: 'Failed to read file',
        variant: 'destructive',
      });
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const deleteFile = async (fileId: string) => {
    try {
      const response = await apiClient.request(`/api/knowledge-base/articles/attachments/${fileId}`, {
        method: 'DELETE',
      });

      if (response.error) throw response.error;

      setUploadedFiles(uploadedFiles.filter(f => f.id !== fileId));
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      toast({
        title: 'File Deleted',
        description: 'File has been successfully removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete file',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Attachments</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Upload documents, images, or PDFs to accompany this article (Max 10MB per file)
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm font-medium mb-2">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          PDF, Word, Images, Text files (Max 10MB)
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Select Files
            </>
          )}
        </Button>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <Label>Uploaded Files</Label>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.file_size / 1024).toFixed(2)} KB • {file.file_type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {file.file_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(file.file_url, '_blank')}
                    >
                      View
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

