import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, Navigation, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  current_location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export function TechnicianMap({ technicians }: { technicians: Technician[] }) {
  const [center, setCenter] = useState({ lat: 28.6139, lng: 77.2090 }); // Default: Delhi

  useEffect(() => {
    // Calculate center based on technician locations
    if (technicians.length > 0) {
      const validLocations = technicians.filter(t => t.current_location);
      if (validLocations.length > 0) {
        const avgLat = validLocations.reduce((sum, t) => sum + (t.current_location?.latitude || 0), 0) / validLocations.length;
        const avgLng = validLocations.reduce((sum, t) => sum + (t.current_location?.longitude || 0), 0) / validLocations.length;
        setCenter({ lat: avgLat, lng: avgLng });
      }
    }
  }, [technicians]);

  const activeTechs = technicians.filter(t => t.status === 'active' && t.current_location);
  const idleTechs = technicians.filter(t => t.status === 'available' && t.current_location);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Technician Locations</h3>
          <div className="flex gap-2">
            <Badge variant="default" className="flex items-center gap-1">
              <Navigation className="h-3 w-3" />
              {activeTechs.length} Active
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {idleTechs.length} Available
            </Badge>
          </div>
        </div>

        {/* Simple Map Visualization */}
        <div className="relative h-96 bg-muted rounded-lg overflow-hidden border">
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-background to-muted">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-primary opacity-50" />
              <p className="text-sm text-muted-foreground">
                Interactive map with {technicians.length} technician{technicians.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Center: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
              </p>
            </div>
          </div>

          {/* Simple marker positions */}
          {technicians.slice(0, 10).map((tech, idx) => {
            if (!tech.current_location) return null;
            
            // Simple positioning logic for demo
            const x = 10 + (idx % 5) * 18;
            const y = 10 + Math.floor(idx / 5) * 40;
            
            return (
              <div
                key={tech.id}
                className="absolute flex flex-col items-center"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className={`h-3 w-3 rounded-full ${tech.status === 'active' ? 'bg-primary' : 'bg-secondary'} border-2 border-background shadow-lg`} />
                <div className="mt-1 text-xs bg-background/90 px-1 rounded shadow">
                  {tech.first_name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Technician List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {technicians.map(tech => (
            <div key={tech.id} className="flex items-center gap-2 p-2 rounded border">
              <div className={`h-2 w-2 rounded-full ${tech.status === 'active' ? 'bg-primary' : 'bg-secondary'}`} />
              <span className="text-sm">{tech.first_name} {tech.last_name}</span>
              {tech.current_location && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {tech.current_location.latitude.toFixed(2)}, {tech.current_location.longitude.toFixed(2)}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}