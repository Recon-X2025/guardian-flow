import { Button } from '@/components/ui/button';
import { Database, Loader2, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
}

export function SeedDemoDataButton() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [results, setResults] = useState<SeedResults | null>(null);
  const { toast } = useToast();

  const seedDemoData = async () => {
    setIsSeeding(true);
    setResults(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('seed-demo-data', {
        body: {},
      });

      if (error) throw error;

      setResults(data.results);
      toast({
        title: 'Demo data seeded successfully!',
        description: 'Created customers, technicians, equipment, invoices, penalties, and photo validations',
      });
    } catch (error: any) {
      console.error('Seed demo data error:', error);
      toast({
        title: 'Failed to seed demo data',
        description: error.message,
        variant: 'destructive',
      });
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
          Populate the database with realistic test data for customers, technicians, equipment, and transactions
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
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Note:</strong> Make sure test accounts are seeded first using the "Seed Test Accounts" button above. 
            This seeder requires existing users with technician roles.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
