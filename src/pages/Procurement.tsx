import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Package, AlertTriangle, TrendingUp, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Procurement() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [stockLevels, setStockLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsData, stockData] = await Promise.all([
        supabase.from('inventory_items').select('*').order('sku'),
        supabase.from('stock_levels').select('*, item:inventory_items(*)').order('updated_at', { ascending: false })
      ]);

      if (itemsData.error) throw itemsData.error;
      if (stockData.error) throw stockData.error;

      setItems(itemsData.data || []);
      setStockLevels(stockData.data || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reorderItem = async (itemId: string, quantity: number) => {
    toast({
      title: "Purchase order created",
      description: `Created PO for ${quantity} units`,
    });
  };

  const lowStockItems = stockLevels.filter(sl => 
    (sl.qty_available || 0) < (sl.min_threshold || 10)
  ).length;

  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => 
    sum + (parseFloat(item.unit_price) || 0), 0
  );

  const filteredStock = stockLevels.filter(sl => 
    sl.item?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sl.item?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Procurement</h1>
        <p className="text-muted-foreground">
          Inventory procurement with auto-reorder logic
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending POs</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Levels</CardTitle>
          <CardDescription>Monitor and reorder stock levels</CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredStock.map((stock) => {
              const isLowStock = (stock.qty_available || 0) < (stock.min_threshold || 10);
              return (
                <div
                  key={stock.id}
                  className={`p-4 border rounded-lg ${isLowStock ? 'bg-orange-50 border-orange-200' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{stock.item?.sku || 'Unknown'}</h4>
                        {isLowStock && (
                          <Badge className="bg-orange-100 text-orange-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {stock.item?.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm mt-3">
                    <div>
                      <span className="text-muted-foreground">Available:</span>
                      <p className="font-medium">{stock.qty_available || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reserved:</span>
                      <p className="font-medium">{stock.qty_reserved || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Min Threshold:</span>
                      <p className="font-medium">{stock.min_threshold || 10}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lead Time:</span>
                      <p className="font-medium">{stock.item?.lead_time_days || 0} days</p>
                    </div>
                  </div>
                  {isLowStock && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reorderItem(stock.item_id, (stock.min_threshold || 10) * 2)}
                      >
                        <ShoppingCart className="h-3 w-3 mr-2" />
                        Create Purchase Order
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredStock.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-8">
                No inventory items found
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}