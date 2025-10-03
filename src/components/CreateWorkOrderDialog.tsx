import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface CreateWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  onSuccess: () => void;
}

export function CreateWorkOrderDialog({ open, onOpenChange, ticketId, onSuccess }: CreateWorkOrderDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTech, setSelectedTech] = useState('');

  useEffect(() => {
    if (open) {
      fetchTechnicians();
    }
  }, [open]);

  const fetchTechnicians = async () => {
    try {
      // Get users with technician role
      const { data: techRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'technician');

      if (rolesError) throw rolesError;

      const techIds = techRoles?.map(r => r.user_id) || [];

      if (techIds.length === 0) {
        setTechnicians([]);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', techIds)
        .limit(50);

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error: any) {
      console.error('Error fetching technicians:', error);
    }
  };

  const handleCreateWO = async () => {
    if (!selectedTech) {
      toast({
        title: 'Technician required',
        description: 'Please select a technician to assign',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Generate WO number
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true });
      
      const woNumber = `WO-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

      // Create work order
      const { data: woData, error: woError } = await supabase
        .from('work_orders')
        .insert({
          wo_number: woNumber,
          ticket_id: ticketId,
          technician_id: selectedTech,
          status: 'draft',
          warranty_checked: false,
          parts_reserved: false,
          cost_to_customer: 0,
        })
        .select()
        .single();

      if (woError) throw woError;

      // Update ticket status
      await supabase
        .from('tickets')
        .update({ status: 'assigned' })
        .eq('id', ticketId);

      // Create precheck record
      await supabase
        .from('work_order_prechecks')
        .insert({
          work_order_id: woData.id,
          inventory_status: 'pending',
          warranty_status: 'pending',
          photo_status: 'pending',
        });

      // Automatically trigger precheck orchestration
      const { error: precheckError } = await supabase.functions.invoke('precheck-orchestrator', {
        body: { workOrderId: woData.id }
      });

      if (precheckError) {
        console.error('Auto-precheck error:', precheckError);
        toast({
          title: 'Work Order Created',
          description: `${woNumber} created. Precheck will run automatically.`,
        });
      } else {
        toast({
          title: 'Work Order Created',
          description: `${woNumber} created and precheck initiated automatically`,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error creating work order',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Work Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="technician">Assign Technician</Label>
            <Select value={selectedTech} onValueChange={setSelectedTech}>
              <SelectTrigger>
                <SelectValue placeholder="Select technician..." />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.full_name} ({tech.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg text-sm space-y-2">
            <p className="font-medium">Automated Workflow:</p>
            <p className="text-muted-foreground">
              1. Work order created and assigned to technician<br />
              2. <strong>Precheck runs automatically</strong> (inventory, warranty)<br />
              3. Technician captures 4 required photos when ready<br />
              4. Photo validation completes → work order released<br />
              5. Service order auto-generated on completion
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreateWO} disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Work Order
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
