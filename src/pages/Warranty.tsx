import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Shield, CheckCircle2, XCircle, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WarrantyDialog } from '@/components/WarrantyDialog';

export default function Warranty() {
  const { toast } = useToast();
  const [warranties, setWarranties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchSerial, setSearchSerial] = useState('');
  const [warrantyDialogOpen, setWarrantyDialogOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<any>(null);

  useEffect(() => {
    fetchWarranties();
  }, []);

  const fetchWarranties = async () => {
    try {
      const { data, error } = await supabase
        .from('warranty_records')
        .select('*')
        .order('warranty_end', { ascending: false });

      if (error) throw error;
      setWarranties(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading warranties',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkWarranty = async () => {
    if (!searchSerial.trim()) {
      toast({
        title: 'Serial number required',
        description: 'Please enter a unit serial number',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await supabase.functions.invoke('check-warranty', {
        body: { unitSerial: searchSerial, parts: ['PC-PSU-550W', 'PR-TONER-BK', 'PC-FAN-120MM'] }
      });

      if (response.error) throw response.error;

      toast({
        title: 'Warranty Check Complete',
        description: response.data.covered 
          ? `Coverage: ${response.data.reason}` 
          : `Not covered: ${response.data.reason}`,
        variant: response.data.covered ? 'default' : 'destructive',
      });
    } catch (error: any) {
      toast({
        title: 'Warranty check failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const isActive = (warrantyEnd: string) => {
    return new Date(warrantyEnd) > new Date();
  };

  const activeCount = warranties.filter(w => isActive(w.warranty_end)).length;
  const expiredCount = warranties.length - activeCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Warranty & RMA Management</h1>
          <p className="text-muted-foreground">Track warranty coverage and manage RMA requests</p>
        </div>
        <Button onClick={() => { setSelectedWarranty(null); setWarrantyDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Register Warranty
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Warranties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warranties.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{expiredCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Warranty Coverage Checker
          </CardTitle>
          <CardDescription>Check warranty status and part coverage for any unit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter unit serial number..."
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && checkWarranty()}
            />
            <Button onClick={checkWarranty}>
              Check Coverage
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Warranty Records</CardTitle>
              <CardDescription>All registered warranty records</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search warranties..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading warranties...</div>
          ) : warranties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No warranty records found</div>
          ) : (
            <div className="space-y-3">
              {warranties.map((warranty) => {
                const active = isActive(warranty.warranty_end);
                
                return (
                  <div
                    key={warranty.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{warranty.unit_serial}</span>
                        <Badge variant="outline" className={active 
                          ? 'bg-success/10 text-success border-success/20'
                          : 'bg-muted text-muted-foreground border-border'
                        }>
                          {active ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Expired
                            </>
                          )}
                        </Badge>
                        {warranty.coverage_type && (
                          <Badge variant="outline">
                            {warranty.coverage_type}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground">Model: {warranty.model || 'N/A'}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Start: {new Date(warranty.warranty_start).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          End: {new Date(warranty.warranty_end).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => { setSelectedWarranty(warranty); setWarrantyDialogOpen(true); }}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm">
                        Create RMA
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-warning/5 border-warning/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Warranty-Driven Pricing Rule
          </CardTitle>
          <CardDescription>Critical business logic for cost calculation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
              <div>
                <p className="font-medium">Non-Consumable Parts</p>
                <p className="text-xs text-muted-foreground">
                  If warranty covers AND part is non-consumable → NO charge to customer
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-warning mt-0.5" />
              <div>
                <p className="font-medium">Consumable Parts</p>
                <p className="text-xs text-muted-foreground">
                  Consumables may be excluded from warranty coverage (tenant rules apply)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Provenance Required</p>
                <p className="text-xs text-muted-foreground">
                  All warranty checks must include policy_id, warranty clause citations, and timestamps
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <WarrantyDialog
        open={warrantyDialogOpen}
        onOpenChange={setWarrantyDialogOpen}
        warranty={selectedWarranty}
        onSuccess={fetchWarranties}
      />
    </div>
  );
}
