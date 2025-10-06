import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { AddInventoryItemDialog } from '@/components/AddInventoryItemDialog';

export default function Inventory() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          stock_levels(*)
        `)
        .order('description', { ascending: true });

      if (error) throw error;
      setInventoryItems(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading inventory',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalStock = (item: any) => {
    if (!item.stock_levels) return 0;
    return item.stock_levels.reduce((total: number, level: any) => 
      total + (level.qty_available - level.qty_reserved), 0
    );
  };

  const isLowStock = (item: any) => {
    const totalStock = getTotalStock(item);
    const minThreshold = item.stock_levels?.[0]?.min_threshold || 10;
    return totalStock < minThreshold;
  };

  const lowStockCount = inventoryItems.filter(isLowStock).length;
  const totalValue = inventoryItems.reduce((sum, item) => {
    const stock = getTotalStock(item);
    return sum + (stock * (item.unit_price || 0));
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">Track parts, stock levels, and reservations</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{lowStockCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Consumables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryItems.filter(item => item.consumable).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>Parts catalog with stock levels</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search inventory..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading inventory...</div>
          ) : inventoryItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No inventory items found</div>
          ) : (
            <div className="space-y-3">
              {inventoryItems.map((item) => {
                const totalStock = getTotalStock(item);
                const lowStock = isLowStock(item);
                
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.sku}</span>
                        {item.consumable && (
                          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                            Consumable
                          </Badge>
                        )}
                        {lowStock && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{item.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Stock: {totalStock}</span>
                        <span>•</span>
                        <span>Price: {formatCurrency(item.unit_price || 0)}</span>
                        <span>•</span>
                        <span>Lead Time: {item.lead_time_days || 0} days</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Package className="h-4 w-4 mr-1" />
                        Reserve
                      </Button>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Inventory Cascade Logic
          </CardTitle>
          <CardDescription>Pre-WO part availability checking sequence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">1</div>
              <span>Hub Stock (Main)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">2</div>
              <span>OEM Warehouse</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">3</div>
              <span>Partner Network</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">4</div>
              <span>Engineer Buffer Stock</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-warning/20 flex items-center justify-center text-warning font-semibold">5</div>
              <span>Procurement (if none available)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddInventoryItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchInventory}
      />
    </div>
  );
}
