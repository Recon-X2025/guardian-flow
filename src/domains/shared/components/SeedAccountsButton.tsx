import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/integrations/api/client';
import { toast } from '@/components/ui/sonner';
import { Loader2, Users, Check, AlertCircle, LogIn } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MODULE_RELEVANT_ROLES, type AuthModule } from '@/domains/auth/lib/authRedirects';

interface SeedResult {
  created: string[];
  existing: string[];
  errors: { email: string; error: string }[];
}

interface TestAccount {
  email: string;
  password: string;
  role: string;
  name: string;
}

interface SeedAccountsButtonProps {
  onSelectAccount?: (email: string, password: string) => void;
  module?: AuthModule;
}

const ALL_TEST_ACCOUNTS: TestAccount[] = [
  // Platform Core Accounts
  { email: 'admin@techcorp.com', password: 'Admin123!', role: 'sys_admin', name: 'System Admin' },
  { email: 'tenant.admin@techcorp.com', password: 'Admin123!', role: 'tenant_admin', name: 'Tenant Admin' },
  { email: 'ops@techcorp.com', password: 'Ops123!', role: 'ops_manager', name: 'Operations Manager' },
  
  // Finance & Analytics
  { email: 'finance@techcorp.com', password: 'Finance123!', role: 'finance_manager', name: 'Finance Manager' },
  { email: 'analyst@techcorp.com', password: 'Analyst123!', role: 'data_analyst', name: 'Data Analyst' },
  
  // Fraud & Compliance
  { email: 'fraud@techcorp.com', password: 'Fraud123!', role: 'fraud_investigator', name: 'Fraud Investigator' },
  { email: 'auditor@techcorp.com', password: 'Auditor123!', role: 'auditor', name: 'Compliance Auditor' },
  
  // Field Service
  { email: 'dispatch@techcorp.com', password: 'Dispatch123!', role: 'dispatcher', name: 'Service Dispatcher' },
  { email: 'tech1@servicepro.com', password: 'Tech123!', role: 'technician', name: 'Field Technician' },
  
  // Partner & Marketplace
  { email: 'partner.admin@servicepro.com', password: 'Partner123!', role: 'partner_admin', name: 'Partner Admin' },
  { email: 'developer@techcorp.com', password: 'Dev123!', role: 'developer', name: 'Platform Developer' },
  
  // AI & ML
  { email: 'mlops@techcorp.com', password: 'MLOps123!', role: 'ml_ops', name: 'ML Operations' },
  
  // Customer & Support
  { email: 'customer@example.com', password: 'Customer123!', role: 'customer', name: 'Customer User' },
  { email: 'support@techcorp.com', password: 'Support123!', role: 'support_agent', name: 'Support Agent' },
  
  // Training
  { email: 'trainer@techcorp.com', password: 'Trainer123!', role: 'trainer', name: 'Training Coordinator' },
];

export function SeedAccountsButton({ onSelectAccount, module = 'platform' }: SeedAccountsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [showAccounts, setShowAccounts] = useState(false);

  // Filter accounts based on module using centralized role mapping
  const relevantRoles = MODULE_RELEVANT_ROLES[module];
  const TEST_ACCOUNTS = ALL_TEST_ACCOUNTS.filter(account => 
    relevantRoles.includes(account.role)
  );

  const handleDeleteAccounts = async () => {
    if (!confirm('Are you sure you want to delete ALL test accounts? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    try {
      console.log('Deleting test accounts...');
      const response = await apiClient.functions.invoke('delete-test-accounts');
      console.log('Delete response:', response);
      
      if (response.error) {
        console.error('Delete error:', response.error);
        throw new Error(response.error.message || 'Failed to delete test accounts');
      }
      
      // Handle different response structures
      const deletedCount = response.data?.results?.deleted?.length || 
                           response.data?.deleted?.length || 
                           (Array.isArray(response.data?.deleted) ? response.data.deleted.length : 0) ||
                           0;
      
      console.log('Deleted count:', deletedCount, 'Response data:', response.data);
      
      toast.success('Test accounts deleted', {
        description: `Deleted ${deletedCount} accounts.`,
      });
      
      // Clear the result state
      setResult(null);
    } catch (error: any) {
      console.error('Delete accounts error:', error);
      toast.error('Error deleting accounts', {
        description: error.message || 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetRBAC = async () => {
    if (!confirm('Are you sure you want to clear ALL RBAC roles? This will remove all user role assignments.')) {
      return;
    }
    
    setLoading(true);
    try {
      console.log('Resetting RBAC...');
      const response = await apiClient.functions.invoke('reset-rbac');
      console.log('Reset RBAC response:', response);
      
      if (response.error) {
        console.error('Reset RBAC error:', response.error);
        throw new Error(response.error.message || 'Failed to reset RBAC');
      }
      
      toast.success('RBAC reset', {
        description: response.data?.message || 'All user roles have been cleared.',
      });
    } catch (error: any) {
      console.error('Reset RBAC error:', error);
      toast.error('Error resetting RBAC', {
        description: error.message || 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedAccounts = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('Invoking seed-test-accounts...');
      const response = await apiClient.functions.invoke('seed-test-accounts');

      if (response.error) {
        console.error('API error:', response.error);
        throw new Error(response.error.message || 'Failed to invoke seed-test-accounts function');
      }

      if (!response.data) {
        throw new Error('No data returned from seed-test-accounts');
      }

      console.log('Seed result:', response.data);
      
      // Handle response structure: backend returns { success, message, results, accounts }
      const results = response.data?.results || response.data;
      console.log('Setting result:', results);
      
      const createdCount = results?.created?.length || 0;
      const existingCount = results?.existing?.length || 0;
      
      console.log('Created:', createdCount, 'Existing:', existingCount);
      
      // Set result state
      setResult(results);
      
      // Show toast notification
      toast.success('Test accounts seeded', {
        description: `Created ${createdCount} new accounts. ${existingCount} already existed.`,
      });
    } catch (error) {
      console.error('Error seeding accounts:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error('Error seeding accounts', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Test Accounts - {module === 'platform' ? 'All Roles' : module.toUpperCase()}
        </CardTitle>
        <CardDescription>
          {module === 'platform' 
            ? 'Create all test accounts or select any role below' 
            : `Showing ${TEST_ACCOUNTS.length} ${module} module accounts`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleDeleteAccounts}
            disabled={loading}
            variant="destructive"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete All Test Accounts'
            )}
          </Button>
          <Button
            onClick={handleResetRBAC}
            disabled={loading}
            variant="destructive"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Clear RBAC'
            )}
          </Button>
          <Button
            onClick={handleSeedAccounts}
            disabled={loading}
            className="flex-1"
            variant="default"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                Seed New Accounts
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowAccounts(!showAccounts)}
            variant="outline"
            size="sm"
          >
            {showAccounts ? 'Hide' : 'Show'} Accounts
          </Button>
        </div>

        {result && (
          <div className="space-y-2">
            {result.created && Array.isArray(result.created) && result.created.length > 0 && (
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

            {result.existing && Array.isArray(result.existing) && result.existing.length > 0 && (
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

            {result.errors && Array.isArray(result.errors) && result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Errors ({result.errors.length}):</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    {result.errors.map((err, idx) => (
                      <li key={err.email || idx}>
                        • {err.email || 'Unknown'}: {err.error || 'Unknown error'}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {showAccounts && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Click any account to auto-fill login:</p>
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {TEST_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => {
                    if (onSelectAccount) {
                      onSelectAccount(account.email, account.password);
                      toast.success('Login credentials filled', {
                        description: `Click "Sign In" to login as ${account.name}`,
                      });
                    }
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    <LogIn className="h-4 w-4" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{account.name}</div>
                      <div className="text-xs text-muted-foreground">{account.email}</div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {account.role.replace('_', ' ')}
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Note: Accounts must be created first using the "Create All Accounts" button
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
