import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface QueuedAction {
  id: string;
  action_type: string;
  resource_type: string;
  payload: any;
  synced: boolean;
}

export function useOfflineSync() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && queue.length > 0) {
      syncQueue();
    }
  }, [isOnline, queue]);

  const queueAction = useCallback(async (actionType: string, resourceType: string, payload: any) => {
    if (!user) return;

    const action: QueuedAction = {
      id: crypto.randomUUID(),
      action_type: actionType,
      resource_type: resourceType,
      payload,
      synced: false,
    };

    // Store in IndexedDB or local queue
    setQueue(prev => [...prev, action]);

    // Also store in Supabase offline_queue table
    if (isOnline) {
      await (supabase as any).from('offline_queue').insert({
        user_id: user.id,
        action_type: actionType,
        resource_type: resourceType,
        payload,
      });
    }
  }, [user, isOnline]);

  const syncQueue = useCallback(async () => {
    if (!user || syncing || queue.length === 0) return;

    setSyncing(true);
    try {
      // Fetch unsynced actions from Supabase
      const { data: unsyncedActions } = await (supabase as any)
        .from('offline_queue')
        .select('*')
        .eq('user_id', user.id)
        .eq('synced', false)
        .order('created_at', { ascending: true });

      if (!unsyncedActions || unsyncedActions.length === 0) {
        setSyncing(false);
        return;
      }

      // Process each action
      for (const action of unsyncedActions) {
        try {
          await processAction(action);
          
          // Mark as synced
          await (supabase as any)
            .from('offline_queue')
            .update({ synced: true })
            .eq('id', action.id);

        } catch (error) {
          console.error('Failed to sync action:', error);
          
          // Increment sync attempts
          await (supabase as any)
            .from('offline_queue')
            .update({
              sync_attempts: (action.sync_attempts || 0) + 1,
              last_sync_attempt: new Date().toISOString(),
            })
            .eq('id', action.id);
        }
      }

      // Refresh queue state
      setQueue([]);
    } finally {
      setSyncing(false);
    }
  }, [user, syncing, queue]);

  const processAction = async (action: any) => {
    const { action_type, resource_type, payload } = action;

    switch (action_type) {
      case 'create':
        await (supabase as any).from(resource_type).insert(payload);
        break;
      case 'update':
        await (supabase as any).from(resource_type).update(payload.data).eq('id', payload.id);
        break;
      case 'delete':
        await (supabase as any).from(resource_type).delete().eq('id', payload.id);
        break;
      default:
        throw new Error(`Unknown action type: ${action_type}`);
    }
  };

  return {
    isOnline,
    queueAction,
    syncQueue,
    queue,
    syncing,
  };
}
