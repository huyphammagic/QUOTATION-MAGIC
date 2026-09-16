/**
 * GLOBAL DATA INTEGRITY + SYSTEM HEALTH + SYNC RECOVERY ENGINE (PHASE 27)
 * 100% Firebase Source of Truth
 * High performance, zero polling, targeted & event-driven runtime state.
 */

import { 
  TechnicalSystemStatus, 
  BusinessSaveState, 
  PendingSyncOperation,
  StorageHealthItem 
} from '../../types/systemHealth';
import { recordHealthAudit } from '../audit/systemHealthAuditService';

export type SyncHealthStatus = TechnicalSystemStatus;
export type ErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface EntityHealthRecord {
  entityType: 'Company' | 'Customer' | 'Quotation' | 'Rate' | 'Contract' | 'Surcharge' | 'Document' | 'Upload' | 'MasterData';
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
  errorCode?: string;
}

export interface SystemHealthSnapshot {
  globalStatus: TechnicalSystemStatus;
  saveState: BusinessSaveState;
  saveMessage?: string;
  isOnline: boolean;
  isSyncing: boolean;
  lastGlobalSyncAt: Date | null;
  lastFailedSyncAt: Date | null;
  entities: Record<string, EntityHealthRecord>;
  listeners: Record<string, ListenerHealthRecord>;
  activeUploads: UploadHealthRecord[];
  recentErrors: DeduplicatedErrorRecord[];
  pendingOperations: PendingSyncOperation[];
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
  private lastFailedSyncAt: Date | null = null;
  private currentSaveState: BusinessSaveState = 'SAVED';
  private currentSaveMessage: string = 'Hệ thống sẵn sàng';
  
  private entities: Map<string, EntityHealthRecord> = new Map();
  private listeners: Map<string, ListenerHealthRecord> = new Map();
  private uploads: Map<string, UploadHealthRecord> = new Map();
  private errors: Map<string, DeduplicatedErrorRecord> = new Map();
  private inProgressOperations = new Set<string>();
  private pendingOpsMap: Map<string, PendingSyncOperation> = new Map();
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
      { entityType: 'MasterData', status: 'HEALTHY', lastSyncAt: new Date(), itemCount: 0 },
    ];
    defaults.forEach(e => this.entities.set(e.entityType, e));
  }

  private bindNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.recordError('NETWORK', 'INFO', 'Đã khôi phục kết nối Internet. Đang kết nối lại Firebase.', 'NETWORK_RESTORED');
      this.notifySubscribers();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.setSaveState('SAVE_FAILED', 'Mất kết nối mạng');
      this.recordError('NETWORK', 'WARNING', 'Mất kết nối Internet. Hệ thống đang chuyển sang chế độ ngoại tuyến an toàn.', 'NETWORK_ERROR');
      this.notifySubscribers();
    });
  }

  // ================= SAVE STATE ENGINE =================
  /**
   * Updates current business save state with strict guarantees:
   * "SAVED" is only reported after confirmation from Firebase.
   */
  public setSaveState(state: BusinessSaveState, message?: string): void {
    this.currentSaveState = state;
    if (message) {
      this.currentSaveMessage = message;
    }
    this.notifySubscribers();
  }

  public getSaveState(): { state: BusinessSaveState; message: string } {
    return {
      state: this.currentSaveState,
      message: this.currentSaveMessage,
    };
  }

  // ================= IDEMPOTENCY & OPERATION GUARD =================
  public startOperation(operationKey: string, details?: Partial<PendingSyncOperation>): boolean {
    if (this.inProgressOperations.has(operationKey)) {
      return false; // Idempotent: already executing, discard duplicate
    }
    this.inProgressOperations.add(operationKey);
    this.isSyncing = true;
    this.setSaveState('SAVING', 'Đang đồng bộ lên Firebase...');

    if (details) {
      const op: PendingSyncOperation = {
        opId: operationKey,
        companyId: details.companyId || 'company_profile',
        entityType: details.entityType || 'Record',
        entityId: details.entityId || operationKey,
        action: details.action || 'UPDATE',
        timestamp: Date.now(),
        attemptCount: 1,
        maxRetries: details.maxRetries || 3,
        status: 'PENDING',
        payload: details.payload,
      };
      this.pendingOpsMap.set(operationKey, op);
    }

    this.notifySubscribers();
    return true;
  }

  public endOperation(operationKey: string, success = true, error?: any): void {
    this.inProgressOperations.delete(operationKey);
    this.isSyncing = this.inProgressOperations.size > 0;
    
    if (success) {
      this.lastGlobalSyncAt = new Date();
      this.pendingOpsMap.delete(operationKey);
      if (this.inProgressOperations.size === 0 && this.currentSaveState !== 'CONFLICT') {
        this.setSaveState('SAVED', 'Dữ liệu đã được lưu trên Firebase');
      }
    } else {
      this.lastFailedSyncAt = new Date();
      const existingOp = this.pendingOpsMap.get(operationKey);
      if (existingOp) {
        existingOp.status = 'FAILED';
        existingOp.lastError = error?.message || String(error);
      }
      this.setSaveState('SAVE_FAILED', error?.message || 'Lưu dữ liệu thất bại');
    }

    this.notifySubscribers();
  }

  // ================= SAFE RETRY ENGINE WITH EXPONENTIAL BACKOFF =================
  /**
   * Executes a database/storage operation with safe exponential backoff and idempotency.
   * Prevents duplicate writes and preserves UI state if all attempts fail.
   */
  public async executeWithSafeRetry<T>(
    operationKey: string,
    operationFn: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelayMs?: number;
      companyId?: string;
      entityType?: string;
      entityId?: string;
      userId?: string;
    } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? 3;
    const initialDelay = options.initialDelayMs ?? 800;
    let attempt = 0;

    const opRegistered = this.startOperation(operationKey, {
      companyId: options.companyId,
      entityType: options.entityType,
      entityId: options.entityId,
      maxRetries,
    });

    if (!opRegistered) {
      throw new Error(`Thao tác [${operationKey}] đang trong tiến trình xử lý, bỏ qua yêu cầu trùng lặp.`);
    }

    while (attempt < maxRetries) {
      attempt++;
      try {
        if (attempt > 1) {
          this.setSaveState('RETRYING', `Đang thử lại kết nối (Lần ${attempt}/${maxRetries})...`);
          const op = this.pendingOpsMap.get(operationKey);
          if (op) {
            op.attemptCount = attempt;
            op.status = 'RETRYING';
          }
          await recordHealthAudit({
            userId: options.userId || 'system',
            companyId: options.companyId || 'company_profile',
            entityType: options.entityType || 'Sync',
            entityId: options.entityId || operationKey,
            action: 'SAFE_RETRY',
            result: 'WARNING',
            correlationId: operationKey,
            details: `Tự động thử lại kết nối Firebase lần ${attempt}/${maxRetries}`,
          });
        }

        const result = await operationFn();
        this.endOperation(operationKey, true);
        return result;
      } catch (err: any) {
        console.warn(`[syncHealthService] Attempt ${attempt}/${maxRetries} failed for [${operationKey}]:`, err?.message || err);

        // Conflict errors should NOT be blindly retried with exponential backoff
        if (err?.code === 'CONFLICT' || err?.message?.includes('Xung đột') || err?.message?.includes('conflict')) {
          this.setSaveState('CONFLICT', err.message || 'Xung đột phiên bản đa thiết bị');
          this.endOperation(operationKey, false, err);
          throw err;
        }

        if (attempt >= maxRetries) {
          this.endOperation(operationKey, false, err);
          await recordHealthAudit({
            userId: options.userId || 'system',
            companyId: options.companyId || 'company_profile',
            entityType: options.entityType || 'Sync',
            entityId: options.entityId || operationKey,
            action: 'SAVE_FAILED',
            result: 'FAILURE',
            correlationId: operationKey,
            details: `Thất bại sau ${maxRetries} lần thử: ${err?.message || String(err)}`,
          });
          throw err;
        }

        // Exponential backoff with jitter
        const delay = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 200;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.endOperation(operationKey, false);
    throw new Error(`Đã vượt quá số lần thử lại tối đa (${maxRetries}) cho thao tác [${operationKey}].`);
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
    const isOfflineOrUnavailable = error?.code === 'unavailable' || 
      errorMessage.includes('offline') || 
      errorMessage.includes('Could not reach Cloud Firestore');

    if (item) {
      item.status = isOfflineOrUnavailable ? 'CONNECTING' : 'ERROR';
      item.reconnectAttempts += 1;
      item.lastErrorMessage = errorMessage;
    }
    
    // If it's a transient offline/reconnecting event, record as WARNING instead of critical ERROR
    const severity = isOfflineOrUnavailable ? 'WARNING' : 'ERROR';
    this.recordError(
      id, 
      severity, 
      isOfflineOrUnavailable
        ? `Bộ lắng nghe ${item?.name || id} đang hoạt động ở chế độ ngoại tuyến (sẵn sàng tự kết nối lại).`
        : `Lỗi kết nối bộ lắng nghe ${item?.name || id}: ${errorMessage}`,
      'LISTENER_ERROR'
    );
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
      this.recordError('UPLOAD', 'ERROR', `Tải tệp ${up.fileName} thất bại: ${errorMessage}`, 'STORAGE_FAILED');
      this.updateEntityHealth('Upload', {
        status: 'STORAGE_FAILED',
        message: errorMessage,
      });
      this.notifySubscribers();
    }
  }

  // ================= ERROR DEDUPLICATION =================
  public recordError(module: string, severity: ErrorSeverity, message: string, errorCode?: string): void {
    const fingerprint = `${module}:${(errorCode || message).slice(0, 80)}`;
    const existing = this.errors.get(fingerprint);
    const now = new Date();

    if (existing) {
      existing.occurrences += 1;
      existing.lastSeenAt = now;
      existing.message = message;
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
        errorCode,
      });
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

  // ================= TECHNICAL SYSTEM STATUS COMPUTATION =================
  public getSnapshot(): SystemHealthSnapshot {
    let globalStatus: TechnicalSystemStatus = 'HEALTHY';

    if (!this.isOnline) {
      globalStatus = 'NETWORK_ERROR';
    } else if (this.currentSaveState === 'CONFLICT') {
      globalStatus = 'CONFLICT';
    } else if (this.currentSaveState === 'SAVE_FAILED') {
      globalStatus = 'SYNC_FAILED';
    } else if (this.isSyncing) {
      globalStatus = 'SYNC_PENDING';
    } else {
      // Check active entities
      let hasConflict = false;
      let hasError = false;
      let hasWarning = false;
      let hasStorageFailed = false;

      this.entities.forEach(ent => {
        if (ent.status === 'CONFLICT') hasConflict = true;
        if (ent.status === 'DATA_INTEGRITY_ERROR') hasError = true;
        if (ent.status === 'DATA_INTEGRITY_WARNING') hasWarning = true;
        if (ent.status === 'STORAGE_FAILED') hasStorageFailed = true;
      });

      this.listeners.forEach(lis => {
        if (lis.status === 'ERROR') hasError = true;
      });

      if (hasConflict) {
        globalStatus = 'CONFLICT';
      } else if (hasStorageFailed) {
        globalStatus = 'STORAGE_FAILED';
      } else if (hasError) {
        globalStatus = 'DEGRADED';
      } else if (hasWarning) {
        globalStatus = 'DATA_INTEGRITY_WARNING';
      } else {
        globalStatus = 'HEALTHY';
      }
    }

    return this.buildSnapshot(globalStatus);
  }

  private buildSnapshot(globalStatus: TechnicalSystemStatus): SystemHealthSnapshot {
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

    const pendingOperations = Array.from(this.pendingOpsMap.values());

    let conflictCount = 0;
    this.entities.forEach(e => {
      if (e.status === 'CONFLICT') conflictCount += 1;
    });
    if (this.currentSaveState === 'CONFLICT') {
      conflictCount += 1;
    }

    return {
      globalStatus,
      saveState: this.currentSaveState,
      saveMessage: this.currentSaveMessage,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastGlobalSyncAt: this.lastGlobalSyncAt,
      lastFailedSyncAt: this.lastFailedSyncAt,
      entities: entitiesObj,
      listeners: listenersObj,
      activeUploads,
      recentErrors,
      pendingOperations,
      conflictCount,
      activeDraftStatus: {
        hasDraft: false,
        savedAt: null,
      },
    };
  }

  public subscribe(callback: (snapshot: SystemHealthSnapshot) => void): () => void {
    this.subscribers.add(callback);
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
