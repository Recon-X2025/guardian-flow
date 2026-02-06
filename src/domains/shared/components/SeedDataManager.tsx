import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/integrations/api/client';
import { toast } from '@/components/ui/sonner';
import { Loader2 } from 'lucide-react';

export function SeedDataManager() {
  const [loading, setLoading] = useState(false);
  const [seedType, setSeedType] = useState<'demo' | 'test' | 'performance'>('demo');
  const [counts, setCounts] = useState({
    customers: 10,
    technicians: 5,
    equipment: 20,
    tickets: 15,
    workOrders: 10,
    assets: 25,
  });

  const handleSeed = async () => {
    setLoading(true);
    try {
      const { data: profileList } = await apiClient
        .from('profiles')
        .select('tenant_id')
        .limit(1)
        .then();

      const profile = profileList?.[0];
      const tenantId = profile?.tenant_id || null;

      if (!tenantId) {
        toast.error('No tenant found');
        return;
      }

      const result = await apiClient.functions.invoke('seed-validated-data', {
        body: {
          tenantId,
          seedType,
          counts,
          includeCompliance: true,
        },
      });

      if (result.error) throw result.error;

      const data = result.data;
      if (data?.success) {
        toast.success('Data seeded successfully', {
          description: `Created ${Object.entries(data.entitiesCreated || {})
            .map(([k, v]) => `${v} ${k}`)
            .join(', ')}`,
        });

        if (data.validation?.warnings?.length > 0) {
          toast.warning('Validation warnings', {
            description: data.validation.warnings.join(', '),
          });
        }
      } else {
        toast.error('Seeding failed', {
          description: data?.validation?.errors?.join(', ') || 'Unknown error',
        });
      }
    } catch (error: unknown) {
      toast.error('Failed to seed data', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seed Data Manager</CardTitle>
        <CardDescription>
          Generate validated test data for your tenant. All data will be isolated to your organization and only visible to users with appropriate roles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Seed Type</Label>
          <Select value={seedType} onValueChange={(v: 'demo' | 'test' | 'performance') => setSeedType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="demo">Demo (sample data)</SelectItem>
              <SelectItem value="test">Test (QA data)</SelectItem>
              <SelectItem value="performance">Performance (large dataset)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Customers</Label>
            <Input
              type="number"
              value={counts.customers}
              onChange={(e) => setCounts({ ...counts, customers: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label>Technicians</Label>
            <Input
              type="number"
              value={counts.technicians}
              onChange={(e) => setCounts({ ...counts, technicians: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label>Equipment</Label>
            <Input
              type="number"
              value={counts.equipment}
              onChange={(e) => setCounts({ ...counts, equipment: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label>Assets</Label>
            <Input
              type="number"
              value={counts.assets}
              onChange={(e) => setCounts({ ...counts, assets: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <Button onClick={handleSeed} disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Seed Data with Validation
        </Button>
      </CardContent>
    </Card>
  );
}
