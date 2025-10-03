import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Check, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SeedResult {
  created: string[];
  existing: string[];
  errors: { email: string; error: string }[];
}

export function SeedAccountsButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const { toast } = useToast();

  const handleSeedAccounts = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('seed-test-accounts');

      if (error) throw error;

      setResult(data.results);
      toast({
        title: 'Test accounts seeded',
        description: `Created ${data.results.created.length} new accounts. ${data.results.existing.length} already existed.`,
      });
    } catch (error) {
      console.error('Error seeding accounts:', error);
      toast({
        title: 'Error seeding accounts',
        description: error instanceof Error ? error.message : 'Failed to create test accounts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Test Accounts Setup
        </CardTitle>
        <CardDescription>
          Create 15 test accounts with different roles for testing the RBAC system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleSeedAccounts}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Accounts...
            </>
          ) : (
            <>
              <Users className="mr-2 h-4 w-4" />
              Create Test Accounts
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-2">
            {result.created.length > 0 && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  <strong>Created ({result.created.length}):</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    {result.created.map((email) => (
                      <li key={email} className="text-muted-foreground">• {email}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {result.existing.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Already Existed ({result.existing.length}):</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    {result.existing.map((email) => (
                      <li key={email} className="text-muted-foreground">• {email}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Errors ({result.errors.length}):</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    {result.errors.map((err) => (
                      <li key={err.email}>
                        • {err.email}: {err.error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="mt-4 p-4 bg-muted rounded-lg text-sm space-y-2">
          <p className="font-medium">Test Account Credentials:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• admin@techcorp.com - Password: Admin123!</li>
            <li>• tenant.admin@techcorp.com - Password: Admin123!</li>
            <li>• ops@techcorp.com - Password: Ops123!</li>
            <li>• finance@techcorp.com - Password: Finance123!</li>
            <li>• fraud@techcorp.com - Password: Fraud123!</li>
            <li>• partner.admin@servicepro.com - Password: Partner123!</li>
            <li>• tech1@servicepro.com - Password: Tech123!</li>
            <li>• customer@example.com - Password: Customer123!</li>
            <li className="text-xs mt-2">...and 7 more accounts</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
