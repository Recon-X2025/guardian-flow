import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from '@/components/ui/sonner';
import { FileText, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function DisputeManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [resolution, setResolution] = useState('');

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['disputes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disputes' as any)
        .select(`
          *,
          invoices(invoice_number, total_amount),
          profiles(full_name, email)
        `)
        .order('created_at', { ascending: false });
      if (result.error) throw result.error;
      return data as any[];
    },
  });

  const updateDisputeMutation = useMutation({
    mutationFn: async ({ id, status, resolution }: any) => {
      const result = await apiClient.functions.invoke('dispute-manager', {
        body: { action: 'update', dispute_id: id, status, resolution },
      });
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      toast.success('Dispute updated successfully');
      setSelectedDispute(null);
      setResolution('');
    },
    onError: () => {
      toast.error('Failed to update dispute');
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'resolved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dispute Management</h1>
          <p className="text-muted-foreground">Review and resolve customer disputes</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading disputes...</div>
      ) : (
        <div className="grid gap-4">
          {disputes?.map((dispute) => (
            <Card key={dispute.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Dispute #{dispute.id.slice(0, 8)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Invoice: {dispute.invoices?.invoice_number} - ${dispute.invoices?.total_amount}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Customer: {dispute.profiles?.full_name} ({dispute.profiles?.email})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(dispute.status)}
                    <Badge variant={getStatusVariant(dispute.status)}>
                      {dispute.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Dispute Reason:</Label>
                  <p className="mt-1 text-sm">{dispute.reason}</p>
                </div>

                {dispute.evidence && (
                  <div>
                    <Label className="text-sm font-semibold">Evidence:</Label>
                    <p className="mt-1 text-sm text-muted-foreground">{dispute.evidence}</p>
                  </div>
                )}

                {dispute.resolution && (
                  <div>
                    <Label className="text-sm font-semibold">Resolution:</Label>
                    <p className="mt-1 text-sm">{dispute.resolution}</p>
                  </div>
                )}

                {dispute.status === 'pending' && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button onClick={() => setSelectedDispute(dispute)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Respond to Dispute
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Resolve Dispute</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Resolution Notes</Label>
                          <Textarea
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value)}
                            placeholder="Explain the resolution..."
                            rows={4}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            onClick={() =>
                              updateDisputeMutation.mutate({
                                id: dispute.id,
                                status: 'resolved',
                                resolution,
                              })
                            }
                          >
                            Resolve
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={() =>
                              updateDisputeMutation.mutate({
                                id: dispute.id,
                                status: 'rejected',
                                resolution,
                              })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
