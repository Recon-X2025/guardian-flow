import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useRef } from 'react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Upload, FileText, X, Loader2 } from 'lucide-react';

interface Contract {
  id?: string;
  title: string;
  contract_type: string;
  contract_number?: string;
  contract_value?: number;
  currency?: string;
  billing_frequency?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  document_url?: string;
  status?: string;
}

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: Contract | null;
  onSuccess: () => void;
}

export function ContractDialog({ open, onOpenChange, contract, onSuccess }: ContractDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<Contract>>(contract || {
    contract_type: 'maintenance',
    currency: 'USD',
    billing_frequency: 'monthly',
    status: 'draft'
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let documentUrl = formData.document_url;

      // Upload document if one was selected
      if (uploadedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', uploadedFile);
        uploadFormData.append('bucket', 'contracts');
        uploadFormData.append('path', `contracts/${Date.now()}-${uploadedFile.name}`);

        try {
          const uploadResult = await fetch('/api/storage/upload', {
            method: 'POST',
            body: uploadFormData,
          });
          const uploadData = await uploadResult.json();
          if (uploadData.url) {
            documentUrl = uploadData.url;
          }
        } catch (uploadErr) {
          console.error('Document upload error:', uploadErr);
          toast({ title: "Document upload failed", description: "Contract will be saved without document", variant: "destructive" });
        }
      }

      const contractData = {
        ...formData,
        document_url: documentUrl,
        contract_number: formData.contract_number || `SC-${Date.now().toString(36).toUpperCase()}`
      };

      await apiClient.functions.invoke('contract-create', {
        body: { contract: contractData, line_items: [] }
      });

      toast({ title: "Contract saved", description: "Service contract has been saved successfully" });
      onSuccess();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save contract", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contract?.id ? 'Edit Contract' : 'New Service Contract'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Contract Title *</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Annual Maintenance Agreement"
                required
              />
            </div>

            <div>
              <Label htmlFor="contract_number">Contract Number</Label>
              <Input
                id="contract_number"
                value={formData.contract_number || ''}
                onChange={e => setFormData({...formData, contract_number: e.target.value})}
                placeholder="Auto-generated if empty"
              />
            </div>

            <div>
              <Label htmlFor="contract_type">Contract Type *</Label>
              <Select
                value={formData.contract_type || 'maintenance'}
                onValueChange={v => setFormData({...formData, contract_type: v})}
              >
                <SelectTrigger id="contract_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="warranty">Warranty Extension</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contract_value">Contract Value</Label>
              <Input
                id="contract_value"
                type="number"
                value={formData.contract_value || ''}
                onChange={e => setFormData({...formData, contract_value: Number(e.target.value)})}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency || 'USD'}
                onValueChange={v => setFormData({...formData, currency: v})}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="INR">INR</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="billing_frequency">Billing Frequency</Label>
              <Select
                value={formData.billing_frequency || 'monthly'}
                onValueChange={v => setFormData({...formData, billing_frequency: v})}
              >
                <SelectTrigger id="billing_frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-time">One-time</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || 'draft'}
                onValueChange={v => setFormData({...formData, status: v})}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date || ''}
                onChange={e => setFormData({...formData, start_date: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date || ''}
                onChange={e => setFormData({...formData, end_date: e.target.value})}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Contract terms, conditions, and notes..."
                rows={3}
              />
            </div>

            {/* Document Upload Section */}
            <div className="col-span-2">
              <Label>Contract Document</Label>
              <div className="mt-2 border-2 border-dashed rounded-lg p-4">
                {uploadedFile ? (
                  <div className="flex items-center justify-between bg-muted p-3 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{uploadedFile.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(uploadedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : formData.document_url ? (
                  <div className="flex items-center justify-between bg-muted p-3 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">Existing document attached</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(formData.document_url, '_blank')}
                    >
                      View
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload contract document (PDF, DOC, DOCX)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                      id="contract-document"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">Max file size: 10MB</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {contract?.id ? 'Update Contract' : 'Create Contract'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
