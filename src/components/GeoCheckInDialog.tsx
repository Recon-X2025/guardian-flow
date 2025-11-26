import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Loader2, CheckCircle } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface GeoCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  mode: 'check-in' | 'check-out';
  onSuccess?: () => void;
}

export function GeoCheckInDialog({
  open,
  onOpenChange,
  workOrderId,
  mode,
  onSuccess,
}: GeoCheckInDialogProps) {
  const { toast } = useToast();
  const { latitude, longitude, accuracy, error, loading, getCurrentLocation, reverseGeocode } = useGeolocation();
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState<string>('');

  const handleCapture = async () => {
    getCurrentLocation();
  };

  const handleSubmit = async () => {
    if (!latitude || !longitude) {
      toast({
        title: 'Location Required',
        description: 'Please capture your location first',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Get address from coordinates
      const geoAddress = await reverseGeocode(latitude, longitude);
      setAddress(geoAddress);

      const updateData = mode === 'check-in' 
        ? {
            check_in_latitude: latitude,
            check_in_longitude: longitude,
            check_in_address: geoAddress,
            check_in_at: new Date().toISOString(),
            status: 'in_progress' as const,
          }
        : {
            check_out_latitude: latitude,
            check_out_longitude: longitude,
            check_out_address: geoAddress,
            check_out_at: new Date().toISOString(),
          };

      const { error: updateError } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', workOrderId);

      if (updateError) throw updateError;

      toast({
        title: `${mode === 'check-in' ? 'Checked In' : 'Checked Out'} Successfully`,
        description: `Location captured: ${geoAddress.substring(0, 50)}...`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {mode === 'check-in' ? 'Check In' : 'Check Out'} at Site
          </DialogTitle>
          <DialogDescription>
            Capture your precise location to {mode === 'check-in' ? 'start' : 'complete'} this work order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!latitude && !loading && !error && (
            <div className="text-center py-6 space-y-3">
              <Navigation className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click below to capture your current location
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-6 space-y-3">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Acquiring GPS location...</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 p-4 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Make sure location services are enabled
              </p>
            </div>
          )}

          {latitude && longitude && (
            <div className="bg-success/10 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-medium text-success">Location Captured</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Latitude:</span>
                  <span className="font-mono">{latitude.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Longitude:</span>
                  <span className="font-mono">{longitude.toFixed(6)}</span>
                </div>
                {accuracy && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Accuracy:</span>
                    <Badge variant={accuracy < 50 ? 'default' : 'secondary'}>
                      ±{accuracy.toFixed(0)}m
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!latitude && (
              <Button
                onClick={handleCapture}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <Navigation className="mr-2 h-4 w-4" />
                    Capture Location
                  </>
                )}
              </Button>
            )}
            
            {latitude && longitude && (
              <>
                <Button
                  variant="outline"
                  onClick={handleCapture}
                  disabled={loading || submitting}
                >
                  Recapture
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {mode === 'check-in' ? 'Check In' : 'Check Out'}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
