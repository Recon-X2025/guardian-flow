import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { invokeEdgeFunction, handleApiError } from '@/lib/apiClient';
import { Loader2, Database } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function CreateDemoDataButton({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createDemoData = async () => {
    setLoading(true);
    console.log('[CreateDemo] Starting creation of 2000 demo work orders...');
    
    try {
      const data = await invokeEdgeFunction<{
        success: boolean;
        created: number;
        total_in_db: number;
        message: string;
      }>('create-demo-workorders', {
        body: {}
      });

      console.log('[CreateDemo] Success:', data);

      toast({
        title: 'Demo Data Created',
        description: `${data.created} work orders created successfully. Total in DB: ${data.total_in_db}`,
      });

      // Refresh the page
      onSuccess();
    } catch (error: any) {
      console.error('[CreateDemo] Failed:', error);
      handleApiError(error, toast);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Database className="mr-2 h-4 w-4" />
          )}
          Create 2000 Demo Work Orders
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create Demo Data</AlertDialogTitle>
          <AlertDialogDescription>
            This will create 2000 demo work orders distributed across tenants with:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>20 different PC & Printer issues</li>
              <li>Varied statuses (draft, pending, released, in progress, completed)</li>
              <li>Dates spread over past 90 days</li>
              <li>Assigned to existing technicians by tenant</li>
              <li>Realistic costs and part statuses</li>
              <li><strong>Tenant isolation enforced</strong> - each user sees only their org's data</li>
            </ul>
            <p className="mt-4 font-semibold">This operation takes about 2-3 minutes.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={createDemoData}>
            Create Demo Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
