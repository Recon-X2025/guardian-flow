import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { Equipment } from './types';

interface EquipmentTabProps {
  equipment: Equipment[];
  onRequestService: () => void;
}

export function EquipmentTab({ equipment, onRequestService }: EquipmentTabProps) {
  if (equipment.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <p className="text-muted-foreground">
          No equipment registered yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {equipment.map((eq) => (
        <Card key={eq.id} className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{eq.name}</h3>
              <div className="flex gap-2">
                {eq.category && (
                  <Badge variant="outline">{eq.category}</Badge>
                )}
                {eq.status && <Badge>{eq.status}</Badge>}
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {eq.serial_number && <div>Serial #: {eq.serial_number}</div>}
                {(eq.manufacturer || eq.model) && (
                  <div>Model: {eq.manufacturer} {eq.model}</div>
                )}
                {eq.warranty_expiry && (
                  <div>
                    Warranty: {new Date(eq.warranty_expiry) > new Date() ? 'Active' : 'Expired'}
                    ({new Date(eq.warranty_expiry).toLocaleDateString()})
                  </div>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onRequestService}>
              Request Service
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
