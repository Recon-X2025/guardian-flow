import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus } from "lucide-react";

export default function Procurement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Procurement</h1>
          <p className="text-muted-foreground">
            Automated purchase orders and supplier management
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create PO
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Procurement Module
          </CardTitle>
          <CardDescription>Coming Soon - Automated Procurement Features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>• Automatic PO generation when inventory falls below threshold</p>
          <p>• Multi-vendor quote comparison and approval workflows</p>
          <p>• Lead time forecasting based on historical data</p>
          <p>• Supplier performance tracking (delivery time, quality, cost)</p>
          <p>• EDI integration for automated order processing</p>
          <p>• Budget tracking and spend analytics</p>
          <p>• Integration with accounting systems for 3-way matching</p>
        </CardContent>
      </Card>
    </div>
  );
}