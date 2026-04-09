import { WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';

export function OfflineBanner() {
  const { isOnline, pendingCount, syncing } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !syncing) return null;

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-yellow-400 px-4 py-2 text-sm font-medium text-yellow-900">
        <WifiOff className="h-4 w-4" />
        <span>You're offline. Changes will sync when reconnected.</span>
      </div>
    );
  }

  if (syncing || pendingCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-blue-500 px-4 py-2 text-sm font-medium text-white">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>
          {syncing
            ? 'Syncing your changes...'
            : `${pendingCount} change${pendingCount !== 1 ? 's' : ''} pending sync`}
        </span>
      </div>
    );
  }

  return null;
}
