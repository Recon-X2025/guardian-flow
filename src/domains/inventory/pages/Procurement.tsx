import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Package, AlertTriangle, TrendingUp, Search } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { useCurrency } from '@/domains/shared/hooks/useCurrency';
import { PurchaseOrderDialog } from '@/domains/financial/components/PurchaseOrderDialog';

export default function Procurement() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  interface InventoryItem {
    id: string;
    sku?: string;
    description?: string;
    unit_price?: string | number;
    lead_time_days?: number;
  }

  interface StockLevel {
    id: string;
    item_id?: string;
    qty_available?: number;
    qty_reserved?: number;
    min_threshold?: number;
    location_id?: string;
    item?: InventoryItem;
  }

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockLevel | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsResult, stockResult] = await Promise.all([
        apiClient.from('inventory_items').select('*').order('sku'),
        apiClient.from('stock_levels').select('*').order('updated_at', { ascending: false })
      ]);

      if (itemsResult.error) throw itemsResult.error;
      if (stockResult.error) throw stockResult.error;
      
      const itemsData = { data: itemsResult.data || [] };
      const stockData = { data: stockResult.data || [] };
      
      // Merge stock levels with items
      const stockWithItems = stockData.data.map((stock: StockLevel) => ({
        ...stock,
        item: itemsData.data.find((item: InventoryItem) => item.id === stock.item_id)
      }));

      setItems(itemsData.data || []);
      setStockLevels(stockData.data || []);
    } catch (error: unknown) {
      toast({
        title: "Error loading data",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePO = (stock: StockLevel) => {
    setSelectedStock(stock);
    setPoDialogOpen(true);
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
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
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
                        onClick={() => handleCreatePO(stock)}
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

      {selectedStock && (
        <PurchaseOrderDialog
          open={poDialogOpen}
          onOpenChange={setPoDialogOpen}
          item={selectedStock.item}
          stockLevel={selectedStock}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}