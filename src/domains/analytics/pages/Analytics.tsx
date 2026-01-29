import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, DollarSign, Package, Users, Clock, BarChart3 } from 'lucide-react';
import { OperationalTab } from '@/domains/analytics/components/analytics/OperationalTab';
import { ForecastTab } from '@/domains/analytics/components/analytics/ForecastTab';
import { FinancialTab } from '@/domains/analytics/components/analytics/FinancialTab';
import { InventoryTab } from '@/domains/analytics/components/analytics/InventoryTab';
import { WorkforceTab } from '@/domains/analytics/components/analytics/WorkforceTab';
import { SLATab } from '@/domains/analytics/components/analytics/SLATab';

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('operational');

  return (
    <div className="container mx-auto py-3 sm:py-4 md:py-6 px-3 sm:px-4 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Analytics & Reporting</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Comprehensive insights across operations, forecasting, finance, and workforce
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 w-full gap-1">
          <TabsTrigger value="operational" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Operational</span>
            <span className="sm:hidden">Ops</span>
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Forecast</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Financial</span>
            <span className="sm:hidden">Finance</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Package className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Inventory</span>
            <span className="sm:hidden">Stock</span>
          </TabsTrigger>
          <TabsTrigger value="workforce" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Workforce</span>
            <span className="sm:hidden">Staff</span>
          </TabsTrigger>
          <TabsTrigger value="sla" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden lg:inline">SLA & Quality</span>
            <span className="lg:hidden">SLA</span>
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
