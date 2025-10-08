import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, DollarSign, Package, Users, Clock, BarChart3 } from 'lucide-react';
import { OperationalTab } from '@/components/analytics/OperationalTab';
import { ForecastTab } from '@/components/analytics/ForecastTab';
import { FinancialTab } from '@/components/analytics/FinancialTab';
import { InventoryTab } from '@/components/analytics/InventoryTab';
import { WorkforceTab } from '@/components/analytics/WorkforceTab';
import { SLATab } from '@/components/analytics/SLATab';

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('operational');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reporting</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive insights across operations, forecasting, finance, and workforce
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="operational" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Operational
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Forecast
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="workforce" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Workforce
          </TabsTrigger>
          <TabsTrigger value="sla" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            SLA & Quality
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operational">
          <OperationalTab />
        </TabsContent>

        <TabsContent value="forecast">
          <ForecastTab />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialTab />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryTab />
        </TabsContent>

        <TabsContent value="workforce">
          <WorkforceTab />
        </TabsContent>

        <TabsContent value="sla">
          <SLATab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
