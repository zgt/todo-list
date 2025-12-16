import type { NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

import { syncManager } from "~/sync/manager";

export interface UseSyncResult {
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncAt: Date | null;
  queuedCount: number;
  sync: () => Promise<void>;
  error: Error | null;
}

export function useSync(): UseSyncResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  // Monitor network state
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? false);
    });

    // Get initial state
    void NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  // Update queue count periodically
  useEffect(() => {
    const updateQueueCount = async () => {
      const stats = await syncManager.queueStats.getQueueStats();
      setQueuedCount(stats.pending);
    };

    void updateQueueCount();
    const interval = setInterval(() => {
      void updateQueueCount();
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Manual sync
  const sync = async () => {
    if (isSyncing) {
      console.log("Sync already in progress");
      return;
    }

    if (!isOnline) {
      setError(new Error("No network connection"));
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      await syncManager.fullSync();
      setLastSyncAt(new Date());
    } catch (err) {
      console.error("Sync failed:", err);
      setError(err instanceof Error ? err : new Error("Sync failed"));
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    isOnline,
    lastSyncAt,
    queuedCount,
    sync,
    error,
  };
}
