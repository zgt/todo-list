import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

export class NetworkMonitor {
  private unsubscribe: (() => void) | null = null;
  private wasOffline = false;
  private syncCallback: (() => Promise<void>) | null = null;

  /**
   * Set sync callback to be called when device comes back online
   */
  setSyncCallback(callback: () => Promise<void>): void {
    this.syncCallback = callback;
  }

  /**
   * Start monitoring network state
   */
  start(): void {
    console.log("Starting network monitor...");

    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      this.handleNetworkChange(state);
    });

    // Check initial state
    NetInfo.fetch().then((state) => {
      console.log(
        `Initial network state: ${state.isConnected ? "online" : "offline"}`,
      );
      this.wasOffline = !state.isConnected;
    });
  }

  /**
   * Stop monitoring network state
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      console.log("Network monitor stopped");
    }
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange(state: NetInfoState): void {
    const isOnline = state.isConnected ?? false;

    console.log(`Network state changed: ${isOnline ? "online" : "offline"}`);

    // Trigger sync when coming back online
    if (isOnline && this.wasOffline && this.syncCallback) {
      console.log("Device came back online, triggering sync...");
      this.syncCallback().catch((error) => {
        console.error("Auto-sync failed:", error);
      });
    }

    this.wasOffline = !isOnline;
  }

  /**
   * Get current network state
   */
  async getState(): Promise<NetInfoState> {
    return await NetInfo.fetch();
  }
}

// Export singleton instance
export const networkMonitor = new NetworkMonitor();
