import { Button } from '@/components/ui/button';
import { Database, Loader2, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { invokeEdgeFunction, handleApiError } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SeedResults {
  customers: number;
  technicians: number;
  equipment: number;
  partners: number;
  invoices: number;
  penalties: number;
  photos: number;
  forecasts: number;
}

export function SeedDemoDataButton() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [results, setResults] = useState<SeedResults | null>(null);
  const { toast } = useToast();

  const seedDemoData = async () => {
    setIsSeeding(true);
    setResults(null);
    
    try {
      console.log('[SeedDemo] Starting seed operation...');
      
      const data = await invokeEdgeFunction<{
        success: boolean;
        results: SeedResults;
      }>('seed-demo-data', {
        body: {},
      });

      console.log('[SeedDemo] Success:', data);

      setResults(data.results);
      toast({
        title: 'Demo data seeded successfully!',
        description: 'Created customers, technicians, equipment, invoices, penalties, photo validations, and forecasts',
      });
    } catch (error: any) {
      console.error('[SeedDemo] Seed demo data error:', error);
      handleApiError(error, toast);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Demo Data Seeder
        </CardTitle>
        <CardDescription>
          Populate the database with realistic test data distributed across tenants. All data respects RBAC and tenant isolation - users will only see data belonging to their organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={seedDemoData}
          disabled={isSeeding}
          className="w-full"
          variant="default"
        >
          {isSeeding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Seeding Data...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Seed Demo Data
            </>
          )}
        </Button>

        {results && (
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              <strong>Demo Data Created:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• {results.customers} Customers</li>
                <li>• {results.technicians} Technician Profiles</li>
                <li>• {results.equipment} Equipment Items</li>
                <li>• {results.partners} Partner Organizations</li>
                <li>• {results.invoices} Invoices</li>
                <li>• {results.penalties} Penalty Applications</li>
                <li>• {results.photos} Photo Validations</li>
                <li>• {results.forecasts} Forecast Records</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Note:</strong> Make sure test accounts are seeded first using the "Seed Test Accounts" button above. 
            This seeder requires existing users with technician roles and will distribute data across all tenants based on their roles.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
