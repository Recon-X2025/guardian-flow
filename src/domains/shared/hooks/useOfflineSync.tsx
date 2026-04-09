import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/integrations/api/client';
import { useAuth } from '@/domains/auth/contexts/AuthContext';

interface QueuedAction {
  id: string;
  action_type: string;
  resource_type: string;
  payload: Record<string, unknown>;
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

  const queueAction = useCallback(async (actionType: string, resourceType: string, payload: Record<string, unknown>) => {
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

    // Also store in offline_queue table
    if (isOnline) {
      await apiClient.from('offline_queue').insert({
        user_id: user.id,
        action_type: actionType,
        resource_type: resourceType,
        payload,
      }).then();
    }
  }, [user, isOnline]);

  const syncQueue = useCallback(async () => {
    if (!user || syncing || queue.length === 0) return;

    setSyncing(true);
    try {
      // Fetch unsynced actions from offline_queue
      const { data: unsyncedActions } = await apiClient
        .from('offline_queue')
        .select('*')
        .eq('user_id', user.id)
        .eq('synced', false)
        .order('created_at')
        .then();

      if (!unsyncedActions || unsyncedActions.length === 0) {
        setSyncing(false);
        return;
      }

      // Process each action
      for (const action of unsyncedActions) {
        try {
          await processAction(action);
          
          // Mark as synced
          await apiClient
            .from('offline_queue')
            .update({ synced: true })
            .eq('id', action.id)
            .then();

        } catch (error) {
          console.error('Failed to sync action:', error);
          
          // Increment sync attempts
          await apiClient
            .from('offline_queue')
            .update({
              sync_attempts: (action.sync_attempts || 0) + 1,
              last_sync_attempt: new Date().toISOString(),
            })
            .eq('id', action.id)
            .then();
        }
      }

      // Refresh queue state
      setQueue([]);
    } finally {
      setSyncing(false);
    }
  }, [user, syncing, queue]);

  const processAction = async (action: { action_type: string; resource_type: string; payload: { id?: string; data?: Record<string, unknown> } & Record<string, unknown> }) => {
    const { action_type, resource_type, payload } = action;

    switch (action_type) {
      case 'create':
        await apiClient.from(resource_type).insert(payload).then();
        break;
      case 'update':
        await apiClient.from(resource_type).update(payload.data).eq('id', payload.id).then();
        break;
      case 'delete':
        await apiClient.from(resource_type).delete().eq('id', payload.id).then();
        break;
      default:
        throw new Error(`Unknown action type: ${action_type}`);
    }
  };

  return {
    isOnline,
    queueAction,
    queueMutation: queueAction,
    syncQueue,
    queue,
    pendingCount: queue.length,
    syncing,
  };
}
