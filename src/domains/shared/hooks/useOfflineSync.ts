import { useEffect, useState } from 'react';
import { apiClient } from '@/integrations/api/client';
import { useAuth } from '@/domains/auth/contexts/AuthContext';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export function useOfflineSync() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue(); // Auto-sync when coming back online
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check pending count periodically
  useEffect(() => {
    const checkPending = async () => {
      try {
        const result = await apiClient.functions.invoke('offline-sync-processor', {
          body: { action: 'get_pending' }
        });
        setPendingCount(result.data?.queueItems?.length || 0);
      } catch (_) {
        // Silent fail
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 30000); // Every 30s
    return () => clearInterval(interval);
  }, []);

  const queueOperation = async (
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    payload: any
  ) => {
    try {
      if (!user) throw new Error('Not authenticated');

      const result = await apiClient.from('offline_sync_queue').insert({
        user_id: user.id,
        tenant_id: (user as any).user_metadata?.tenant_id,
        entity_type: entityType,
        entity_id: entityId,
        operation,
        payload,
      });

      if (result.error) throw result.error;
      setPendingCount(prev => prev + 1);

      // Auto-sync if online
      if (isOnline) {
        await syncQueue();
      }
    } catch (error) {
      console.error('Queue operation error:', error);
      throw error;
    }
  };

  const syncQueue = async () => {
    if (!isOnline || status === 'syncing') return;

    try {
      setStatus('syncing');

      const pendingResult = await apiClient.functions.invoke('offline-sync-processor', {
        body: { action: 'get_pending' }
      });
      const pending = pendingResult.data;

      if (!pending?.queueItems?.length) {
        setStatus('synced');
        setPendingCount(0);
        return;
      }

      const resultsResult = await apiClient.functions.invoke('offline-sync-processor', {
        body: {
          action: 'sync',
          queueItems: pending.queueItems
        }
      });
      const results = resultsResult.data;

      const failedCount = results?.results?.filter((r: any) => r.status === 'failed').length || 0;
      setPendingCount(failedCount);
      
      setStatus(failedCount > 0 ? 'error' : 'synced');
      
      // Reset to idle after 2s
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error('Sync error:', error);
      setStatus('error');
    }
  };

  return {
    isOnline,
    status,
    pendingCount,
    queueOperation,
    syncQueue,
  };
}
