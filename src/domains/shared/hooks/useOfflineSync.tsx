import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '@/integrations/api/client';
import { useAuth } from '@/domains/auth/contexts/AuthContext';

export interface QueuedAction {
  id: string;
  action_type: 'create' | 'update' | 'delete';
  resource_type: string;
  payload: Record<string, unknown>;
  created_at: string;
  sync_attempts: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

// ── IndexedDB helpers ──────────────────────────────────────────────────────────

const DB_NAME = 'guardian-flow-offline';
const DB_VERSION = 1;
const STORE = 'offline_queue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll(): Promise<QueuedAction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).index('created_at').getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(action: QueuedAction): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(action);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useOfflineSync() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const syncingRef = useRef(false);

  // Load queue from IndexedDB on mount
  useEffect(() => {
    idbGetAll().then(setQueue).catch(console.warn);
  }, []);

  // Network status tracking
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setStatus('idle');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when we come back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      syncQueue();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Listen for service worker SYNC_OFFLINE_QUEUE message
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_OFFLINE_QUEUE') {
        syncQueue();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const queueAction = useCallback(async (
    action_type: 'create' | 'update' | 'delete',
    resource_type: string,
    payload: Record<string, unknown>,
  ) => {
    if (!user) return;

    const action: QueuedAction = {
      id: crypto.randomUUID(),
      action_type,
      resource_type,
      payload,
      created_at: new Date().toISOString(),
      sync_attempts: 0,
    };

    // Persist to IndexedDB immediately
    await idbPut(action);
    setQueue(prev => [...prev, action]);

    // If online, attempt immediate sync
    if (isOnline) {
      syncQueue();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOnline]);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setStatus('syncing');

    try {
      const pending = await idbGetAll();
      if (pending.length === 0) {
        setStatus('synced');
        return;
      }

      let hasError = false;
      for (const action of pending) {
        try {
          await processAction(action);
          await idbDelete(action.id);
          setQueue(prev => prev.filter(a => a.id !== action.id));
        } catch (err) {
          hasError = true;
          // Update sync_attempts in IndexedDB
          await idbPut({ ...action, sync_attempts: action.sync_attempts + 1 });
          console.warn('Offline sync: failed action', action.id, err);
        }
      }

      setStatus(hasError ? 'error' : 'synced');
    } catch (err) {
      console.error('Offline sync error:', err);
      setStatus('error');
    } finally {
      syncingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isOnline,
    queueAction,
    queueMutation: queueAction,
    syncQueue,
    queue,
    pendingCount: queue.length,
    syncing: status === 'syncing',
    status,
  };
}

// ── Action processor ───────────────────────────────────────────────────────────

async function processAction(action: QueuedAction) {
  const { action_type, resource_type, payload } = action;
  const path = `/api/${resource_type}`;

  switch (action_type) {
    case 'create': {
      const res = await apiClient.request(path, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.error) throw new Error(res.error.message);
      break;
    }
    case 'update': {
      const { id, ...data } = payload as { id: string } & Record<string, unknown>;
      const res = await apiClient.request(`${path}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (res.error) throw new Error(res.error.message);
      break;
    }
    case 'delete': {
      const { id } = payload as { id: string };
      const res = await apiClient.request(`${path}/${id}`, { method: 'DELETE' });
      if (res.error) throw new Error(res.error.message);
      break;
    }
    default:
      throw new Error(`Unknown action type: ${action_type}`);
  }
}

