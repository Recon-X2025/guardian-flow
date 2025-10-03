import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, DollarSign, Shield, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GenerateSaPOSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  customerId?: string;
}

export function GenerateSaPOSDialog({ open, onOpenChange, workOrderId, customerId }: GenerateSaPOSDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);

  const generateOffers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sapos-offers', {
        body: { workOrderId, customerId }
      });

      if (error) throw error;

      setOffers(data.offers || []);

      toast({
        title: 'SaPOS Offers Generated',
        description: `${data.offers?.length || 0} contextual offers created`,
      });
    } catch (error: any) {
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getOfferIcon = (type: string) => {
    switch (type) {
      case 'extended_warranty': return Shield;
      case 'upgrade': return Sparkles;
      case 'accessory': return Package;
      default: return DollarSign;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sales at Point of Service (SaPOS)</DialogTitle>
        </DialogHeader>

        {!offers.length && !loading && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Generate AI-powered contextual offers based on:
            </p>
            <ul className="space-y-2 text-sm">
              <li>✓ Customer warranty status</li>
              <li>✓ Current service history</li>
              <li>✓ Unit model and age</li>
              <li>✓ Seasonal opportunities</li>
            </ul>
            <p className="text-sm font-medium">
              Powered by Lovable AI (Google Gemini 2.5 Flash)
            </p>
            <Button onClick={generateOffers} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Offers
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Generating AI-powered offers...</p>
          </div>
        )}

        {offers.length > 0 && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">{offers.length} Offers Generated</span>
            </div>

            {offers.map((offer, idx) => {
              const Icon = getOfferIcon(offer.offer_type);
              return (
                <Card key={idx} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{offer.title}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">${offer.price}</div>
                      <Badge variant="outline" className="mt-1">{offer.offer_type.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{offer.description}</p>
                  {offer.warranty_conflicts && (
                    <Badge variant="destructive" className="text-xs">
                      ⚠️ Conflicts with existing warranty
                    </Badge>
                  )}
                </Card>
              );
            })}

            <div className="flex gap-2 mt-6">
              <Button onClick={() => setOffers([])} variant="outline">
                Generate New Offers
              </Button>
              <Button onClick={() => onOpenChange(false)} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
