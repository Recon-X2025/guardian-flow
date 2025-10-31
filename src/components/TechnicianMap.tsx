import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

export function TechnicianMap({ technicians }: any) {
  return (
    <div className="text-center py-12">
      <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      <p className="text-muted-foreground">Map visualization coming soon...</p>
      <p className="text-sm text-muted-foreground mt-2">Showing {technicians.length} technicians</p>
    </div>
  );
}