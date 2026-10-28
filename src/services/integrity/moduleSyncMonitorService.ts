/**
 * System Sync Health Monitor Service
 * Tracks real-time individual Firebase synchronization status per module:
 * - Customers (Khách Hàng)
 * - Quotes (Báo Giá)
 * - Rates (Biểu Cước Master Rates & Local Charges)
 */

export type ModuleSyncStatus = 'Syncing' | 'Synced' | 'Error';

export interface ModuleSyncInfo {
  id: 'quotes' | 'customers' | 'rates';
  nameVi: string;
  nameEn: string;
  collectionName: string;
  status: ModuleSyncStatus;
  count: number;
  lastSyncedAt: Date | null;
  errorMessage?: string;
  isLiveListenerActive: boolean;
  latencyMs?: number;
}

export interface SystemSyncSnapshot {
  isOnline: boolean;
  overallStatus: ModuleSyncStatus;
  modules: {
    quotes: ModuleSyncInfo;
    customers: ModuleSyncInfo;
    rates: ModuleSyncInfo;
  };
  lastGlobalSyncAt: Date | null;
}

type SyncSubscriber = (snapshot: SystemSyncSnapshot) => void;

class ModuleSyncMonitorService {
  private subscribers = new Set<SyncSubscriber>();
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private lastGlobalSyncAt: Date | null = new Date();

  private modules: {
    quotes: ModuleSyncInfo;
    customers: ModuleSyncInfo;
    rates: ModuleSyncInfo;
  } = {
    quotes: {
      id: 'quotes',
      nameVi: 'Báo Giá',
      nameEn: 'Quotes',
      collectionName: 'quotes',
      status: 'Synced',
      count: 0,
      lastSyncedAt: new Date(),
      isLiveListenerActive: true,
    },
    customers: {
      id: 'customers',
      nameVi: 'Khách Hàng',
      nameEn: 'Customers',
      collectionName: 'customers',
      status: 'Synced',
      count: 0,
      lastSyncedAt: new Date(),
      isLiveListenerActive: true,
    },
    rates: {
      id: 'rates',
      nameVi: 'Biểu Cước',
      nameEn: 'Rates',
      collectionName: 'rateMasters',
      status: 'Synced',
      count: 0,
      lastSyncedAt: new Date(),
      isLiveListenerActive: true,
    },
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notify();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.modules.quotes.status = 'Error';
        this.modules.quotes.errorMessage = 'Mất kết nối Internet';
        this.modules.customers.status = 'Error';
        this.modules.customers.errorMessage = 'Mất kết nối Internet';
        this.modules.rates.status = 'Error';
        this.modules.rates.errorMessage = 'Mất kết nối Internet';
        this.notify();
      });
    }
  }

  public subscribe(callback: SyncSubscriber): () => void {
    this.subscribers.add(callback);
    callback(this.getSnapshot());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(): void {
    const snap = this.getSnapshot();
    this.subscribers.forEach(cb => {
      try {
        cb(snap);
      } catch (err) {
        console.warn('[moduleSyncMonitorService] Subscriber notice:', err);
      }
    });
  }

  public getSnapshot(): SystemSyncSnapshot {
    // Determine overall status
    let overallStatus: ModuleSyncStatus = 'Synced';
    if (!this.isOnline) {
      overallStatus = 'Error';
    } else if (
      this.modules.quotes.status === 'Syncing' ||
      this.modules.customers.status === 'Syncing' ||
      this.modules.rates.status === 'Syncing'
    ) {
      overallStatus = 'Syncing';
    } else if (
      this.modules.quotes.status === 'Error' ||
      this.modules.customers.status === 'Error' ||
      this.modules.rates.status === 'Error'
    ) {
      overallStatus = 'Error';
    }

    return {
      isOnline: this.isOnline,
      overallStatus,
      modules: {
        quotes: { ...this.modules.quotes },
        customers: { ...this.modules.customers },
        rates: { ...this.modules.rates },
      },
      lastGlobalSyncAt: this.lastGlobalSyncAt,
    };
  }

  public setModuleSyncing(moduleId: 'quotes' | 'customers' | 'rates'): void {
    this.modules[moduleId].status = 'Syncing';
    this.modules[moduleId].errorMessage = undefined;
    this.notify();
  }

  public setModuleSynced(
    moduleId: 'quotes' | 'customers' | 'rates', 
    count?: number,
    latencyMs?: number
  ): void {
    const now = new Date();
    this.modules[moduleId].status = 'Synced';
    this.modules[moduleId].lastSyncedAt = now;
    this.modules[moduleId].errorMessage = undefined;
    this.modules[moduleId].isLiveListenerActive = true;
    if (typeof count === 'number') {
      this.modules[moduleId].count = count;
    }
    if (typeof latencyMs === 'number') {
      this.modules[moduleId].latencyMs = latencyMs;
    }
    this.lastGlobalSyncAt = now;
    this.notify();
  }

  public setModuleError(moduleId: 'quotes' | 'customers' | 'rates', error: any): void {
    const msg = error?.message || (typeof error === 'string' ? error : 'Lỗi đồng bộ Firebase');
    this.modules[moduleId].status = 'Error';
    this.modules[moduleId].errorMessage = msg;
    this.notify();
  }

  public setModuleCounts(counts: { quotes?: number; customers?: number; rates?: number }): void {
    if (typeof counts.quotes === 'number') this.modules.quotes.count = counts.quotes;
    if (typeof counts.customers === 'number') this.modules.customers.count = counts.customers;
    if (typeof counts.rates === 'number') this.modules.rates.count = counts.rates;
    this.notify();
  }
}

export const moduleSyncMonitor = new ModuleSyncMonitorService();
