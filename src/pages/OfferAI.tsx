import { useState, useEffect } from "react";
import { apiClient } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ShoppingCart, TrendingUp } from "lucide-react";

export default function OfferAI() {
  const [offers, setOffers] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [selectedWO, setSelectedWO] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sapos_offers')
        .select('*, work_orders(wo_number)')
        .order('created_at', { ascending: false })
        .limit(20);

      if (result.error) throw result.error;
      setOffers(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading offers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, wo_number, status')
        .in('status', ['in_progress', 'pending_validation'])
        .order('created_at', { ascending: false });

      if (result.error) throw result.error;
      setWorkOrders(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading work orders",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateOffers = async (workOrderId: string) => {
    setGenerating(true);
    try {
      const result = await apiClient.functions.invoke('generate-offers', {
        body: { workOrderId, customerId: 'demo-customer' }
      });

      if (result.error) throw result.error;

      toast({
        title: "Offers generated",
        description: `${data.offers.length} contextual offers created`,
      });

      fetchOffers();
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const acceptOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('sapos_offers')
        .update({ status: 'accepted' })
        .eq('id', offerId);

      if (result.error) throw result.error;

      toast({ title: "Offer accepted", description: "Quote will be generated" });
      fetchOffers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      generated: "bg-blue-100 text-blue-800",
      presented: "bg-purple-100 text-purple-800",
      accepted: "bg-green-100 text-green-800",
      declined: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800",
    };
    return colors[status] || colors.generated;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Offer AI - Sales at Point of Service</h1>
          <p className="text-muted-foreground">
            AI-powered contextual sales offers during service events
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-2 border rounded-md"
            value={selectedWO}
            onChange={(e) => setSelectedWO(e.target.value)}
            disabled={generating}
          >
            <option value="">Select Work Order...</option>
            {workOrders.map(wo => (
              <option key={wo.id} value={wo.id}>
                {wo.wo_number} ({wo.status})
              </option>
            ))}
          </select>
          <Button 
            onClick={() => {
              if (!selectedWO) {
                toast({ title: "Select a work order first", variant: "destructive" });
                return;
              }
              generateOffers(selectedWO);
            }} 
            disabled={generating || !selectedWO}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Offers
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Offers</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {offers.filter(o => o.status === 'accepted').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {offers.length > 0
                ? Math.round((offers.filter(o => o.status === 'accepted').length / offers.length) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Offers</CardTitle>
          <CardDescription>AI-generated contextual offers with provenance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{offer.title}</h3>
                    <Badge className={getStatusColor(offer.status)}>{offer.status}</Badge>
                    {offer.warranty_conflicts && (
                      <Badge variant="destructive">Warranty Conflict</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{offer.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Type: {offer.offer_type}</span>
                    <span>Price: ${offer.price}</span>
                    <span>WO: {offer.work_orders?.wo_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <Badge variant="outline" className="text-xs">
                      Model: {offer.model_version || 'N/A'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Confidence: {((offer.confidence_score || 0) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>

                {offer.status === 'generated' && !offer.warranty_conflicts && (
                  <div className="flex gap-2">
                    <Button onClick={() => acceptOffer(offer.id)}>
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await supabase
                          .from('sapos_offers')
                          .update({ status: 'declined' })
                          .eq('id', offer.id);
                        fetchOffers();
                      }}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {offers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No offers yet. Generate offers for a work order to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Provenance & Compliance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Model Transparency</p>
              <p className="text-muted-foreground">
                All offers include model_version and prompt_template_id for full provenance
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Warranty Conflict Detection</p>
              <p className="text-muted-foreground">
                Offers that conflict with warranty coverage are automatically flagged
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Context-Aware Generation</p>
              <p className="text-muted-foreground">
                Offers are tailored based on customer profile, unit status, and service history
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
