import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, Cloud, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useOfflineSync } from "@/domains/shared/hooks/useOfflineSync";
import { toast } from "@/domains/shared/hooks/use-toast";

export default function OfflineSyncIndicator() {
  const { isOnline, status, pendingCount, syncQueue } = useOfflineSync();

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (status === 'syncing') return <Loader2 className="w-4 h-4 animate-spin" />;
    if (status === 'synced') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === 'error') return <AlertCircle className="w-4 h-4 text-destructive" />;
    return <Cloud className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (status === 'syncing') return 'Syncing...';
    if (status === 'synced') return 'Synced';
    if (status === 'error') return 'Sync Error';
    return 'Online';
  };

  const handleManualSync = async () => {
    try {
      await syncQueue();
      toast({
        title: "Sync Complete",
        description: "All pending changes synchronized",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={isOnline ? "default" : "secondary"} className="gap-1">
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
      
      {pendingCount > 0 && (
        <Badge variant="destructive">
          {pendingCount} pending
        </Badge>
      )}

      {isOnline && pendingCount > 0 && (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleManualSync}
          disabled={status === 'syncing'}
        >
          Sync Now
        </Button>
      )}
    </div>
  );
}
