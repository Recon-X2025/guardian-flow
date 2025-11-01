import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export function useOfflineSync() {
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
        const { data } = await supabase.functions.invoke('offline-sync-processor', {
          body: { action: 'get_pending' }
        });
        setPendingCount(data?.queueItems?.length || 0);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('offline_sync_queue').insert({
        user_id: user.id,
        tenant_id: user.user_metadata.tenant_id,
        entity_type: entityType,
        entity_id: entityId,
        operation,
        payload,
      });

      if (error) throw error;
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

      const { data: pending } = await supabase.functions.invoke('offline-sync-processor', {
        body: { action: 'get_pending' }
      });

      if (!pending?.queueItems?.length) {
        setStatus('synced');
        setPendingCount(0);
        return;
      }

      const { data: results } = await supabase.functions.invoke('offline-sync-processor', {
        body: {
          action: 'sync',
          queueItems: pending.queueItems
        }
      });

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
