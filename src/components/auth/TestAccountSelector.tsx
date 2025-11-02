import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestAccount {
  email: string;
  password: string;
  role: string;
  module?: string;
  userStory?: string;
  description: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  // Operations Manager
  { email: 'ops@techcorp.com', password: 'Ops123!', role: 'ops_manager', module: 'field-service', userStory: 'US-OP-001', description: 'Create work orders, dispatch, SLA monitoring' },
  { email: 'ops.sla@techcorp.com', password: 'Ops123!', role: 'ops_manager', module: 'field-service', userStory: 'US-OP-002', description: 'Monitor SLA compliance in real-time' },
  { email: 'ops.dispatch@techcorp.com', password: 'Ops123!', role: 'ops_manager', module: 'field-service', userStory: 'US-OP-003', description: 'Dispatch technicians with route optimization' },
  { email: 'ops.reports@techcorp.com', password: 'Ops123!', role: 'ops_manager', module: 'field-service', userStory: 'US-OP-004', description: 'Generate operational performance reports' },
  
  // Finance Manager
  // Note: Finance Managers use Platform login to access Finance dashboard
  // They may use analytics-bi for reporting, but should NOT appear on Analytics Platform login
  { email: 'finance@techcorp.com', password: 'Finance123!', role: 'finance_manager', module: 'platform', userStory: 'US-FIN-001', description: 'Automated penalty calculation' },
  { email: 'finance.invoicing@techcorp.com', password: 'Finance123!', role: 'finance_manager', module: 'platform', userStory: 'US-FIN-002', description: 'Generate accurate invoices' },
  { email: 'finance.forecast@techcorp.com', password: 'Finance123!', role: 'finance_manager', module: 'ai-forecasting', userStory: 'US-FIN-003', description: 'Revenue forecasting dashboard' },
  { email: 'finance.disputes@techcorp.com', password: 'Finance123!', role: 'finance_manager', module: 'platform', userStory: 'US-FIN-004', description: 'Handle billing disputes' },
  
  // Compliance/Audit
  { email: 'auditor@techcorp.com', password: 'Auditor123!', role: 'auditor', module: 'compliance-automation', userStory: 'US-COMP-001', description: 'Conduct quarterly access reviews' },
  { email: 'auditor.evidence@techcorp.com', password: 'Auditor123!', role: 'auditor', module: 'compliance-automation', userStory: 'US-COMP-002', description: 'Collect compliance evidence' },
  { email: 'auditor.vuln@techcorp.com', password: 'Auditor123!', role: 'auditor', module: 'compliance-automation', userStory: 'US-COMP-003', description: 'Monitor vulnerability remediation SLAs' },
  { email: 'auditor.logs@techcorp.com', password: 'Auditor123!', role: 'auditor', module: 'compliance-automation', userStory: 'US-COMP-004', description: 'Review immutable audit logs' },
  
  // Fraud Investigator
  { email: 'fraud@techcorp.com', password: 'Fraud123!', role: 'fraud_investigator', module: 'fraud-compliance', userStory: 'US-FRAUD-001', description: 'Detect document forgery' },
  { email: 'fraud.anomaly@techcorp.com', password: 'Fraud123!', role: 'fraud_investigator', module: 'fraud-compliance', userStory: 'US-FRAUD-002', description: 'Investigate anomalous behavior' },
  { email: 'fraud.cases@techcorp.com', password: 'Fraud123!', role: 'fraud_investigator', module: 'fraud-compliance', userStory: 'US-FRAUD-003', description: 'Manage fraud cases' },
  
  // Technician
  { email: 'tech.mobile@techcorp.com', password: 'Tech123!', role: 'technician', module: 'field-service', userStory: 'US-TECH-001', description: 'View work orders on mobile' },
  { email: 'tech.photos@techcorp.com', password: 'Tech123!', role: 'technician', module: 'field-service', userStory: 'US-TECH-002', description: 'Capture photos and upload' },
  { email: 'tech.complete@techcorp.com', password: 'Tech123!', role: 'technician', module: 'field-service', userStory: 'US-TECH-003', description: 'Mark work orders complete' },
  
  // System Admin
  { email: 'admin.rbac@techcorp.com', password: 'Admin123!', role: 'sys_admin', module: 'platform', userStory: 'US-ADMIN-001', description: 'Manage user roles and permissions' },
  { email: 'admin.jit@techcorp.com', password: 'Admin123!', role: 'sys_admin', module: 'platform', userStory: 'US-ADMIN-002', description: 'Grant JIT privileged access' },
  { email: 'admin.health@techcorp.com', password: 'Admin123!', role: 'sys_admin', module: 'platform', userStory: 'US-ADMIN-003', description: 'Monitor system health' },
  
  // Product Owner
  { email: 'product.api@techcorp.com', password: 'Product123!', role: 'product_owner', module: 'marketplace', userStory: 'US-DEV-001', description: 'Access API documentation' },
  { email: 'product.webhooks@techcorp.com', password: 'Product123!', role: 'product_owner', module: 'marketplace', userStory: 'US-DEV-002', description: 'Create webhooks' },
  { email: 'product.marketplace@techcorp.com', password: 'Product123!', role: 'product_owner', module: 'marketplace', userStory: 'US-DEV-003', description: 'Deploy extension to marketplace' },
  
  // ========== CLIENT ROLES (Enterprise Customers) ==========
  
  // Technology Manufacturing - OEM Client 1
  { email: 'oem1.admin@client.com', password: 'Client123!', role: 'client_admin', module: 'field-service', userStory: 'UC-CLIENT-FSM-001', description: 'OEM Client 1: Manage multi-vendor field service' },
  { email: 'oem1.ops@client.com', password: 'Client123!', role: 'client_operations_manager', module: 'field-service', userStory: 'UC-CLIENT-FSM-002', description: 'OEM Client 1: Monitor vendor service quality' },
  { email: 'oem1.finance@client.com', password: 'Client123!', role: 'client_finance_manager', module: 'platform', userStory: 'UC-CLIENT-FSM-003', description: 'OEM Client 1: Vendor cost analysis & billing' },
  { email: 'oem1.procurement@client.com', password: 'Client123!', role: 'client_procurement_manager', module: 'marketplace', userStory: 'UC-CLIENT-ASSET-002', description: 'OEM Client 1: Vendor selection & contracts' },
  
  // Consumer Electronics - OEM Client 2
  { email: 'oem2.admin@client.com', password: 'Client123!', role: 'client_admin', module: 'asset-lifecycle', userStory: 'UC-CLIENT-ASSET-001', description: 'OEM Client 2: Manage production line equipment' },
  { email: 'oem2.ops@client.com', password: 'Client123!', role: 'client_operations_manager', module: 'asset-lifecycle', userStory: 'UC-CLIENT-ASSET-001', description: 'OEM Client 2: Track equipment maintenance' },
  { email: 'oem2.compliance@client.com', password: 'Client123!', role: 'client_compliance_officer', module: 'compliance-automation', userStory: 'UC-CLIENT-FRAUD-002', description: 'OEM Client 2: Quality & safety compliance' },
  
  // Insurance - Insurance Client 1
  { email: 'insurance1.admin@client.com', password: 'Client123!', role: 'client_admin', module: 'fraud-compliance', userStory: 'UC-CLIENT-FRAUD-001', description: 'Insurance Client 1: Manage fraud detection vendors' },
  { email: 'insurance1.fraud@client.com', password: 'Client123!', role: 'client_fraud_manager', module: 'fraud-compliance', userStory: 'UC-CLIENT-FRAUD-002', description: 'Insurance Client 1: Coordinate investigations' },
  { email: 'insurance1.compliance@client.com', password: 'Client123!', role: 'client_compliance_officer', module: 'compliance-automation', userStory: 'UC-CLIENT-ASSET-002', description: 'Insurance Client 1: Regulatory compliance monitoring' },
  
  // Tech Manufacturing - OEM Client 2 (Executive)
  // Note: Client Executives use Platform login to access executive dashboards
  { email: 'oem2.executive@client.com', password: 'Client123!', role: 'client_executive', module: 'platform', userStory: 'UC-CLIENT-ANALYTICS-001', description: 'OEM Client 2: Executive vendor dashboards' },
  
  // Telecom - Telecom Client 1
  { email: 'telecom1.admin@client.com', password: 'Client123!', role: 'client_admin', module: 'field-service', userStory: 'UC-CLIENT-FSM-001', description: 'Telecom Client 1: Network maintenance vendors' },
  { email: 'telecom1.ops@client.com', password: 'Client123!', role: 'client_operations_manager', module: 'field-service', userStory: 'UC-CLIENT-FSM-003', description: 'Telecom Client 1: Tower & fiber vendor management' },
  { email: 'telecom1.finance@client.com', password: 'Client123!', role: 'client_finance_manager', module: 'platform', userStory: 'UC-CLIENT-ANALYTICS-002', description: 'Telecom Client 1: Vendor cost optimization' },
  
  // Retail - Retail Client 1
  { email: 'retail1.admin@client.com', password: 'Client123!', role: 'client_admin', module: 'field-service', userStory: 'UC-CLIENT-FSM-001', description: 'Retail Client 1: Supply chain vendor management' },
  { email: 'retail1.ops@client.com', password: 'Client123!', role: 'client_operations_manager', module: 'field-service', userStory: 'UC-CLIENT-FSM-003', description: 'Retail Client 1: Delivery partner oversight' },
  { email: 'retail1.procurement@client.com', password: 'Client123!', role: 'client_procurement_manager', module: 'marketplace', userStory: 'UC-CLIENT-ASSET-002', description: 'Retail Client 1: Logistics vendor selection' },
  
  // Healthcare - Healthcare Client 1
  { email: 'healthcare1.admin@client.com', password: 'Client123!', role: 'client_admin', module: 'asset-lifecycle', userStory: 'UC-CLIENT-ASSET-001', description: 'Healthcare Client 1: Medical equipment maintenance' },
  { email: 'healthcare1.compliance@client.com', password: 'Client123!', role: 'client_compliance_officer', module: 'compliance-automation', userStory: 'UC-CLIENT-FRAUD-002', description: 'Healthcare Client 1: Regulatory compliance & audits' },
  { email: 'healthcare1.executive@client.com', password: 'Client123!', role: 'client_executive', module: 'platform', userStory: 'UC-CLIENT-ANALYTICS-001', description: 'Healthcare Client 1: Healthcare vendor dashboard' },
];

// Module ID mapping - maps auth module IDs to account module IDs
// Note: Finance Managers use analytics-bi for financial reporting but should NOT appear on Analytics Platform login
// They should use Platform login to access Finance dashboard
const MODULE_MAP: Record<string, string[]> = {
  'fsm': ['field-service'],
  'asset': ['asset-lifecycle'],
  'forecasting': ['ai-forecasting'],
  'fraud': ['fraud-compliance', 'compliance-automation'], // Fraud and compliance are related
  'marketplace': ['marketplace'],
  'analytics': ['analytics-platform'], // Only full Analytics Platform users, NOT analytics-bi (that's for Finance)
  'customer': ['customer-portal'],
  'training': ['video-training'],
  'platform': ['platform', 'field-service', 'asset-lifecycle', 'ai-forecasting', 'fraud-compliance', 'marketplace', 'analytics-platform', 'analytics-bi', 'customer-portal', 'video-training'],
};

export default function TestAccountSelector({ 
  onLogin, 
  moduleId 
}: { 
  onLogin?: () => void;
  moduleId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  // Debug: Log moduleId on mount and changes
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[TestAccountSelector] Component mounted/updated with moduleId:', moduleId);
    }
  }, [moduleId]);

  const handleQuickLogin = async (account: TestAccount) => {
    setLoading(account.email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password
      });

      if (error) {
        toast.error(`Login failed: ${error.message}. Account may need to be seeded.`);
        return;
      }

      toast.success(`Signed in as ${account.role}`);
      
      // Trigger the onSuccess callback if provided
      if (onLogin) {
        await new Promise(resolve => setTimeout(resolve, 100));
        onLogin();
      }
    } catch (err: any) {
      toast.error(`Login error: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  // Filter accounts by module if moduleId is provided
  const filteredAccounts = useMemo(() => {
    if (!moduleId) {
      return TEST_ACCOUNTS;
    }

    const moduleMatches = MODULE_MAP[moduleId] || [];
    
    if (import.meta.env.DEV) {
      console.log(`[TestAccountSelector] Filtering for moduleId: "${moduleId}"`);
      console.log(`[TestAccountSelector] MODULE_MAP[${moduleId}]:`, moduleMatches);
      console.log(`[TestAccountSelector] Total accounts: ${TEST_ACCOUNTS.length}`);
    }
    
    // For platform module, show all accounts
    if (moduleId === 'platform') {
      if (import.meta.env.DEV) {
        console.log('[TestAccountSelector] Platform module - showing all accounts');
      }
      return TEST_ACCOUNTS;
    }
    
    // For specific modules, ONLY show accounts that match the module
    const filtered = TEST_ACCOUNTS.filter(account => {
      // Accounts without a module are platform-only and shouldn't appear on module pages
      if (!account.module) {
        return false;
      }
      
      // Check if account's module matches any of the mapped modules for this auth module
      const matches = moduleMatches.includes(account.module);
      
      if (import.meta.env.DEV && moduleId === 'fraud' && !matches) {
        // Only log non-matches for fraud module to reduce noise
      }
      
      return matches;
    });

    if (import.meta.env.DEV) {
      console.log(`[TestAccountSelector] Filtered accounts: ${filtered.length}`);
      console.log(`[TestAccountSelector] Filtered account modules:`, [...new Set(filtered.map(a => a.module))]);
      if (moduleId === 'fraud') {
        console.log(`[TestAccountSelector] Fraud accounts:`, filtered.map(a => ({ email: a.email, module: a.module, role: a.role })));
      }
    }

    return filtered;
  }, [moduleId]);

  // Group accounts by role for better organization
  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    const role = account.role;
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(account);
    return acc;
  }, {} as Record<string, TestAccount[]>);

  return (
    <Card className="border-2 border-dashed border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <LogIn className="w-5 h-5" />
              Quick Test Login
              {moduleId && (
                <Badge variant="secondary" className="ml-2">
                  {moduleId} module
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {filteredAccounts.length > 0 
                ? `Select a test account for ${moduleId || 'this module'} (${filteredAccounts.length} available)`
                : 'No test accounts available for this module'}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>
      </CardHeader>
      
      {isOpen && (
        <CardContent>
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No test accounts configured for this module.</p>
              <p className="text-sm mt-2">Use platform login to access all test accounts.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {Object.entries(groupedAccounts).map(([role, accounts]) => (
                <div key={role}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                    {role.replace('_', ' ')}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {accounts.map((account, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="w-full justify-start h-auto py-3 px-3"
                        onClick={() => handleQuickLogin(account)}
                        disabled={loading === account.email}
                      >
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            {account.module && (
                              <Badge variant="secondary" className="text-xs">
                                {account.module}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 font-medium">
                            {account.email}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {account.description}
                          </div>
                        </div>
                        {loading === account.email && (
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin ml-2" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

