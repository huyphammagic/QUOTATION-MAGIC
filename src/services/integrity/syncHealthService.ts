/**
 * GLOBAL DATA INTEGRITY + SYNC HEALTH ENGINE (PHASE 24)
 * 100% Firebase Source of Truth
 * Non-polling, event-driven runtime state for system & entity health.
 */

export type SyncHealthStatus = 
  | 'HEALTHY' 
  | 'SYNCING' 
  | 'STALE' 
  | 'CONFLICT' 
  | 'ERROR' 
  | 'OFFLINE' 
  | 'UNKNOWN';

export type ErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface EntityHealthRecord {
  entityType: 'Company' | 'Customer' | 'Quotation' | 'Rate' | 'Contract' | 'Surcharge' | 'Document' | 'Upload';
  status: SyncHealthStatus;
  version?: number;
  itemCount?: number;
  lastSyncAt: Date | null;
  message?: string;
  updatedBy?: string;
}

export interface ListenerHealthRecord {
  id: string;
  name: string;
  collectionName: string;
  status: 'CONNECTED' | 'CONNECTING' | 'ERROR' | 'DISCONNECTED';
  lastEventAt: Date | null;
  reconnectAttempts: number;
  lastErrorMessage?: string;
}

export type UploadJobStatus = 
  | 'QUEUED' 
  | 'UPLOADING' 
  | 'PROCESSING' 
  | 'SUCCESS' 
  | 'FAILED' 
  | 'CANCELLED' 
  | 'PARTIAL_FAILURE';

export interface UploadHealthRecord {
  uploadId: string;
  fileName: string;
  fileSizeBytes: number;
  status: UploadJobStatus;
  progressPercent: number;
  storagePath?: string;
  downloadUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  errorMessage?: string;
}

export interface DeduplicatedErrorRecord {
  id: string;
  fingerprint: string;
  severity: ErrorSeverity;
  module: string;
  message: string;
  timestamp: Date;
  occurrences: number;
  lastSeenAt: Date;
}

export interface SystemHealthSnapshot {
  globalStatus: SyncHealthStatus;
  isOnline: boolean;
  isSyncing: boolean;
  lastGlobalSyncAt: Date | null;
  entities: Record<string, EntityHealthRecord>;
  listeners: Record<string, ListenerHealthRecord>;
  activeUploads: UploadHealthRecord[];
  recentErrors: DeduplicatedErrorRecord[];
  conflictCount: number;
  activeDraftStatus: {
    hasDraft: boolean;
    savedAt: string | null;
  };
}

class SyncHealthService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private lastGlobalSyncAt: Date | null = new Date();
  
  private entities: Map<string, EntityHealthRecord> = new Map();
  private listeners: Map<string, ListenerHealthRecord> = new Map();
  private uploads: Map<string, UploadHealthRecord> = new Map();
  private errors: Map<string, DeduplicatedErrorRecord> = new Map();
  private inProgressOperations = new Set<string>();
  private subscribers = new Set<(snapshot: SystemHealthSnapshot) => void>();

  constructor() {
    this.initDefaultEntities();
    this.bindNetworkListeners();
  }

  private initDefaultEntities() {
    const defaults: EntityHealthRecord[] = [
      { entityType: 'Company', status: 'HEALTHY', lastSyncAt: new Date(), version: 1 },
      { entityType: 'Customer', status: 'HEALTHY', lastSyncAt: new Date(), itemCount: 0 },
      { entityType: 'Quotation', status: 'HEALTHY', lastSyncAt: new Date(), itemCount: 0 },
      { entityType: 'Rate', status: 'HEALTHY', lastSyncAt: new Date(), itemCount: 0 },
      { entityType: 'Contract', status: 'HEALTHY', lastSyncAt: new Date(), itemCount: 0 },
      { entityType: 'Surcharge', status: 'HEALTHY', lastSyncAt: new Date(), itemCount: 0 },
      { entityType: 'Document', status: 'HEALTHY', lastSyncAt: new Date(), itemCount: 0 },
      { entityType: 'Upload', status: 'HEALTHY', lastSyncAt: new Date(), itemCount: 0 },
    ];
    defaults.forEach(e => this.entities.set(e.entityType, e));
  }

  private bindNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.recordError('NETWORK', 'INFO', 'Đã khôi phục kết nối Internet. Đang kết nối lại Firebase.');
      this.notifySubscribers();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.recordError('NETWORK', 'WARNING', 'Mất kết nối Internet. Hệ thống đang chuyển sang chế độ ngoại tuyến an toàn.');
      this.notifySubscribers();
    });
  }

  // ================= IDEMPOTENCY GUARD =================
  public startOperation(operationKey: string): boolean {
    if (this.inProgressOperations.has(operationKey)) {
      return false; // Already running, ignore duplicate
    }
    this.inProgressOperations.add(operationKey);
    this.isSyncing = true;
    this.notifySubscribers();
    return true;
  }

  public endOperation(operationKey: string): void {
    this.inProgressOperations.delete(operationKey);
    this.isSyncing = this.inProgressOperations.size > 0;
    this.lastGlobalSyncAt = new Date();
    this.notifySubscribers();
  }

  // ================= LISTENER HEALTH =================
  public registerListener(id: string, name: string, collectionName: string): void {
    this.listeners.set(id, {
      id,
      name,
      collectionName,
      status: 'CONNECTING',
      lastEventAt: null,
      reconnectAttempts: 0,
    });
    this.notifySubscribers();
  }

  public reportListenerConnected(id: string): void {
    const item = this.listeners.get(id);
    if (item) {
      item.status = 'CONNECTED';
      item.lastEventAt = new Date();
      item.reconnectAttempts = 0;
      item.lastErrorMessage = undefined;
      this.notifySubscribers();
    }
  }

  public reportListenerEvent(id: string, entityType?: string, count?: number): void {
    const item = this.listeners.get(id);
    const now = new Date();
    if (item) {
      item.status = 'CONNECTED';
      item.lastEventAt = now;
      item.lastErrorMessage = undefined;
    }
    if (entityType && this.entities.has(entityType)) {
      const entity = this.entities.get(entityType)!;
      entity.lastSyncAt = now;
      entity.status = 'HEALTHY';
      if (typeof count === 'number') {
        entity.itemCount = count;
      }
    }
    this.lastGlobalSyncAt = now;
    this.notifySubscribers();
  }

  public reportListenerError(id: string, error: any): void {
    const item = this.listeners.get(id);
    const errorMessage = error?.message || String(error);
    if (item) {
      item.status = 'ERROR';
      item.reconnectAttempts += 1;
      item.lastErrorMessage = errorMessage;
    }
    this.recordError(id, 'ERROR', `Lỗi kết nối bộ lắng nghe ${item?.name || id}: ${errorMessage}`);
    this.notifySubscribers();
  }

  public unregisterListener(id: string): void {
    this.listeners.delete(id);
    this.notifySubscribers();
  }

  // ================= ENTITY HEALTH =================
  public updateEntityHealth(
    entityType: EntityHealthRecord['entityType'],
    updates: Partial<EntityHealthRecord>
  ): void {
    const current = this.entities.get(entityType) || {
      entityType,
      status: 'HEALTHY',
      lastSyncAt: new Date(),
    };
    this.entities.set(entityType, {
      ...current,
      ...updates,
      lastSyncAt: updates.lastSyncAt || new Date(),
    });
    this.notifySubscribers();
  }

  // ================= UPLOAD TRACKING =================
  public startUpload(uploadId: string, fileName: string, fileSizeBytes: number): void {
    const now = new Date();
    this.uploads.set(uploadId, {
      uploadId,
      fileName,
      fileSizeBytes,
      status: 'UPLOADING',
      progressPercent: 10,
      createdAt: now,
      updatedAt: now,
    });
    this.notifySubscribers();
  }

  public updateUploadProgress(uploadId: string, percent: number): void {
    const up = this.uploads.get(uploadId);
    if (up) {
      up.progressPercent = percent;
      up.updatedAt = new Date();
      this.notifySubscribers();
    }
  }

  public finishUploadSuccess(uploadId: string, downloadUrl: string, storagePath: string): void {
    const up = this.uploads.get(uploadId);
    if (up) {
      up.status = 'SUCCESS';
      up.progressPercent = 100;
      up.downloadUrl = downloadUrl;
      up.storagePath = storagePath;
      up.updatedAt = new Date();
      this.updateEntityHealth('Upload', {
        status: 'HEALTHY',
        lastSyncAt: new Date(),
      });
      this.notifySubscribers();
    }
  }

  public finishUploadFailed(uploadId: string, errorMessage: string, isPartial = false): void {
    const up = this.uploads.get(uploadId);
    if (up) {
      up.status = isPartial ? 'PARTIAL_FAILURE' : 'FAILED';
      up.errorMessage = errorMessage;
      up.updatedAt = new Date();
      this.recordError('UPLOAD', 'ERROR', `Tải tệp ${up.fileName} thất bại: ${errorMessage}`);
      this.updateEntityHealth('Upload', {
        status: 'ERROR',
        message: errorMessage,
      });
      this.notifySubscribers();
    }
  }

  // ================= ERROR DEDUPLICATION =================
  public recordError(module: string, severity: ErrorSeverity, message: string): void {
    const fingerprint = `${module}:${message.slice(0, 80)}`;
    const existing = this.errors.get(fingerprint);
    const now = new Date();

    if (existing) {
      // Group occurrences within 1 minute
      existing.occurrences += 1;
      existing.lastSeenAt = now;
    } else {
      this.errors.set(fingerprint, {
        id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        fingerprint,
        severity,
        module,
        message,
        timestamp: now,
        occurrences: 1,
        lastSeenAt: now,
      });
      // Cap at 50 errors in memory
      if (this.errors.size > 50) {
        const oldestKey = this.errors.keys().next().value;
        if (oldestKey) this.errors.delete(oldestKey);
      }
    }
    this.notifySubscribers();
  }

  public clearErrors(): void {
    this.errors.clear();
    this.notifySubscribers();
  }

  // ================= OVERALL SYSTEM HEALTH COMPUTATION =================
  public getSnapshot(): SystemHealthSnapshot {
    if (!this.isOnline) {
      return this.buildSnapshot('OFFLINE');
    }

    if (this.isSyncing) {
      return this.buildSnapshot('SYNCING');
    }

    // Check entity health for any conflict or error
    let hasConflict = false;
    let hasError = false;
    let hasStale = false;

    this.entities.forEach(ent => {
      if (ent.status === 'CONFLICT') hasConflict = true;
      if (ent.status === 'ERROR') hasError = true;
      if (ent.status === 'STALE') hasStale = true;
    });

    this.listeners.forEach(lis => {
      if (lis.status === 'ERROR') hasError = true;
    });

    if (hasConflict) return this.buildSnapshot('CONFLICT');
    if (hasError) return this.buildSnapshot('ERROR');
    if (hasStale) return this.buildSnapshot('STALE');

    return this.buildSnapshot('HEALTHY');
  }

  private buildSnapshot(globalStatus: SyncHealthStatus): SystemHealthSnapshot {
    const entitiesObj: Record<string, EntityHealthRecord> = {};
    this.entities.forEach((val, key) => { entitiesObj[key] = { ...val }; });

    const listenersObj: Record<string, ListenerHealthRecord> = {};
    this.listeners.forEach((val, key) => { listenersObj[key] = { ...val }; });

    const activeUploads = Array.from(this.uploads.values())
      .slice(-10)
      .reverse();

    const recentErrors = Array.from(this.errors.values())
      .slice(-20)
      .reverse();

    let conflictCount = 0;
    this.entities.forEach(e => {
      if (e.status === 'CONFLICT') conflictCount += 1;
    });

    return {
      globalStatus,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastGlobalSyncAt: this.lastGlobalSyncAt,
      entities: entitiesObj,
      listeners: listenersObj,
      activeUploads,
      recentErrors,
      conflictCount,
      activeDraftStatus: {
        hasDraft: false,
        savedAt: null,
      },
    };
  }

  public subscribe(callback: (snapshot: SystemHealthSnapshot) => void): () => void {
    this.subscribers.add(callback);
    // Send immediate initial state
    callback(this.getSnapshot());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    const snap = this.getSnapshot();
    this.subscribers.forEach(cb => {
      try {
        cb(snap);
      } catch (err) {
        console.error('[syncHealthService] Subscriber notification error:', err);
      }
    });
  }
}

export const syncHealthService = new SyncHealthService();
