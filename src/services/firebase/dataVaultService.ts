/**
 * Data Vault & Zero-Overwrite Shield Service
 *
 * Implements the 5-Pillar Data Protection Architecture:
 * 1. Strict Real-Data Mode (rejects synthetic/sample records from cloud persistence)
 * 2. Optimistic Concurrency Control (`runTransaction` + monotonic `_rev` lock)
 * 3. Mandatory Soft-Delete & 90-Day Recycle Bin (`_recycle_bin`)
 * 4. Immutable Append-Only Snapshot Vault (`{collection}/{docId}/_snapshots`)
 * 5. Offline Mutation Outbox Queue & Sync Epoch Guard
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  runTransaction,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import {
  COLLECTION_SCHEMA_VERSIONS,
  VersionedCollectionName,
  handleFirestoreError,
  OperationType,
} from './schemaMigrationService';
import { getModuleData, setModuleData } from './cloudStorageVaultService';

export const STRICT_REAL_DATA_ONLY = true;
export const RECYCLE_BIN_COLLECTION = '_recycle_bin';

export type DataOriginType = 'USER_CREATED' | 'IMPORTED' | 'SYSTEM_MIGRATED';

export interface ImmutableSnapshotRecord<T = Record<string, any>> {
  id: string;
  collectionName: string;
  docId: string;
  rev: number;
  snapshotAt: string;
  actor: string;
  reason: 'CREATE' | 'UPDATE' | 'PRE_OVERWRITE' | 'PRE_RESTORE' | 'SOFT_DELETE' | 'MANUAL_BACKUP';
  summaryLabel?: string;
  data: T;
}

export interface RecycleBinEntry {
  id: string; // `${collectionName}__${docId}`
  collectionName: VersionedCollectionName | string;
  docId: string;
  displayName: string;
  secondaryLabel?: string;
  deletedAt: string;
  deletedBy: string;
  restoreBefore: string;
  rev: number;
  snapshotData: Record<string, any>;
}

export interface OfflineOutboxItem {
  id: string;
  collectionName: string;
  docId: string;
  payload: Record<string, any>;
  queuedAt: string;
  retryCount: number;
  lastError?: string;
  label?: string;
}

export interface ConcurrencyConflictErrorDetail {
  collectionName: string;
  docId: string;
  localRev: number;
  remoteRev: number;
  localData: Record<string, any>;
  remoteData: Record<string, any>;
}

// Sync Epoch Guard: prevents stale devices from pushing Storage backups before finishing initial Cloud pull
let cloudPullCompletedFlag = false;
let cloudPullCompletedAt: string | null = null;

export function markCloudPullCompleted(): void {
  cloudPullCompletedFlag = true;
  cloudPullCompletedAt = new Date().toISOString();
}

export function getSyncEpochStatus(): {
  hasCompletedInitialCloudPull: boolean;
  pulledAt: string | null;
  strictRealDataOnly: boolean;
} {
  return {
    hasCompletedInitialCloudPull: cloudPullCompletedFlag,
    pulledAt: cloudPullCompletedAt,
    strictRealDataOnly: STRICT_REAL_DATA_ONLY,
  };
}

/**
 * 1. STRICT REAL-DATA GUARD
 * Rejects synthetic/sample documents from ever entering Firestore or Cloud Storage.
 */
export function isSyntheticRecord(record: Record<string, any> | null | undefined): boolean {
  if (!record || typeof record !== 'object') return false;
  if (record._isSample === true || record._isSynthetic === true) return true;
  const id = String(record.id || '').toLowerCase();
  if (
    id.startsWith('sample-') ||
    id.startsWith('rfq_sample_') ||
    id.startsWith('gh-lead-00') ||
    id.startsWith('rr-00') ||
    id.startsWith('tender-sample-')
  ) {
    return true;
  }
  return false;
}

export function stampRealDataOrigin<T extends Record<string, any>>(
  record: T,
  origin: DataOriginType = 'USER_CREATED'
): T & { _dataOrigin: DataOriginType } {
  if (STRICT_REAL_DATA_ONLY && isSyntheticRecord(record)) {
    throw new Error('STRICT_REAL_DATA_GUARD: Dữ liệu giả lập/mẫu không được phép ghi lên cơ sở dữ liệu thật.');
  }
  return {
    ...record,
    _dataOrigin: (record._dataOrigin as DataOriginType) || origin,
  };
}

/**
 * 2. IMMUTABLE SNAPSHOT VAULT (Append-Only Time-Travel)
 * Stores non-deletable point-in-time snapshots under `{collection}/{docId}/_snapshots`.
 */
const memorySnapshotCache = new Map<string, ImmutableSnapshotRecord[]>();

export async function createImmutableSnapshot(
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  reason: ImmutableSnapshotRecord['reason'] = 'UPDATE',
  actor?: string,
  summaryLabel?: string
): Promise<ImmutableSnapshotRecord | null> {
  if (!docId || !data || isSyntheticRecord(data)) return null;

  const nowIso = new Date().toISOString();
  const rev = typeof data._rev === 'number' ? data._rev : typeof data.version === 'number' ? data.version : 1;
  const resolvedActor =
    actor || auth?.currentUser?.email || auth?.currentUser?.uid || data._updatedBy || 'Operator';
  const snapId = `snap_${Date.now()}_v${rev}_${Math.random().toString(36).slice(2, 6)}`;

  // Strip Firestore FieldValue sentinels so JSON/Firestore snapshot data is pure serializable data
  const cleanData: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === '_updatedAt' || k === '_createdAt') continue;
    if (v !== undefined) cleanData[k] = v;
  }

  const snapshotRecord: ImmutableSnapshotRecord = {
    id: snapId,
    collectionName,
    docId,
    rev,
    snapshotAt: nowIso,
    actor: String(resolvedActor),
    reason,
    summaryLabel: summaryLabel || data.quoteNumber || data.companyName || data.customerName || data.rateCode || docId,
    data: cleanData,
  };

  // Update fast in-memory cache immediately
  const cacheKey = `${collectionName}__${docId}`;
  const existingMem = memorySnapshotCache.get(cacheKey) || [];
  memorySnapshotCache.set(cacheKey, [snapshotRecord, ...existingMem].slice(0, 30));

  if (!db) return snapshotRecord;

  try {
    const snapRef = doc(db, collectionName, docId, '_snapshots', snapId);
    await setDoc(snapRef, {
      ...snapshotRecord,
      _immutable: true,
      _serverCreatedAt: serverTimestamp(),
    });
    return snapshotRecord;
  } catch (err: any) {
    if (String(err?.message || '').toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.CREATE, `${collectionName}/${docId}/_snapshots/${snapId}`);
    }
    console.warn(`[dataVault] Snapshot write notice for ${collectionName}/${docId}:`, err);
    return snapshotRecord;
  }
}

export async function fetchDocumentSnapshots(
  collectionName: string,
  docId: string,
  maxItems = 25
): Promise<ImmutableSnapshotRecord[]> {
  const cacheKey = `${collectionName}__${docId}`;
  if (!db) {
    return memorySnapshotCache.get(cacheKey) || [];
  }

  try {
    const q = query(
      collection(db, collectionName, docId, '_snapshots'),
      orderBy('snapshotAt', 'desc'),
      limit(maxItems)
    );
    const snap = await getDocs(q);
    const items: ImmutableSnapshotRecord[] = [];
    snap.forEach((d) => {
      items.push({ ...(d.data() as ImmutableSnapshotRecord), id: d.id });
    });
    if (items.length > 0) {
      memorySnapshotCache.set(cacheKey, items);
      return items;
    }
    return memorySnapshotCache.get(cacheKey) || [];
  } catch (err: any) {
    if (String(err?.message || '').toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.LIST, `${collectionName}/${docId}/_snapshots`);
    }
    console.warn(`[dataVault] Snapshot fetch notice for ${collectionName}/${docId}:`, err);
    return memorySnapshotCache.get(cacheKey) || [];
  }
}

export async function restoreDocumentSnapshot(
  collectionName: VersionedCollectionName | string,
  docId: string,
  snapshot: ImmutableSnapshotRecord
): Promise<{ success: boolean; restoredData?: Record<string, any>; newRev?: number; message: string }> {
  if (!db) {
    return { success: false, message: 'Firestore đang ngoại tuyến, chưa thể khôi phục phiên bản Cloud.' };
  }

  const docRef = doc(db, collectionName, docId);
  try {
    const restoredResult = await runTransaction(db, async (tx) => {
      const currentSnap = await tx.get(docRef);
      const currentData = currentSnap.exists() ? (currentSnap.data() as Record<string, any>) : null;
      const currentRev = currentData
        ? Math.max(Number(currentData._rev || 0), Number(currentData.version || 0))
        : 0;
      const nextRev = Math.max(currentRev, Number(snapshot.rev || 1)) + 1;

      const restoredPayload: Record<string, any> = {
        ...snapshot.data,
        id: docId,
        _deleted: false,
        _rev: nextRev,
        version: nextRev,
        _restoredFromSnapshotId: snapshot.id,
        _restoredAt: new Date().toISOString(),
        _updatedAt: serverTimestamp(),
      };

      // Remove stale deletion markers if restoring a previously deleted record
      delete restoredPayload._deletedAt;
      delete restoredPayload._deletedBy;
      delete restoredPayload._restoreBefore;

      tx.set(docRef, restoredPayload, { merge: true });
      return { restoredPayload, currentData, nextRev };
    });

    // Save pre-restore safety snapshot asynchronously
    if (restoredResult.currentData) {
      createImmutableSnapshot(
        collectionName,
        docId,
        restoredResult.currentData,
        'PRE_RESTORE',
        undefined,
        `Trước khi khôi phục về ${snapshot.snapshotAt}`
      ).catch(() => {});
    }

    // Create post-restore snapshot marker
    createImmutableSnapshot(
      collectionName,
      docId,
      restoredResult.restoredPayload,
      'UPDATE',
      undefined,
      `Đã khôi phục về v${snapshot.rev}`
    ).catch(() => {});

    return {
      success: true,
      restoredData: restoredResult.restoredPayload,
      newRev: restoredResult.nextRev,
      message: `Đã khôi phục thành công dữ liệu về mốc v${snapshot.rev} (Phiên bản mới: v${restoredResult.nextRev}).`,
    };
  } catch (err: any) {
    if (String(err?.message || '').toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${docId}`);
    }
    return {
      success: false,
      message: err?.message || 'Không thể khôi phục phiên bản.',
    };
  }
}

/**
 * 3. MANDATORY SOFT-DELETE & RECYCLE BIN (90-Day Preservation)
 * Never calls `deleteDoc` on business entities. Marks `_deleted: true` and indexes in `_recycle_bin`.
 */
export async function softDeleteRecord(
  collectionName: VersionedCollectionName | string,
  docId: string,
  fallbackSnapshot?: Record<string, any>,
  actor?: string
): Promise<{ success: boolean; message: string }> {
  if (!docId) return { success: false, message: 'Thiếu mã định danh bản ghi.' };

  const now = new Date();
  const nowIso = now.toISOString();
  const restoreBeforeIso = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const deletedBy = actor || auth?.currentUser?.email || auth?.currentUser?.uid || 'Operator';
  const recycleId = `${collectionName}__${docId}`;

  if (!db) {
    return { success: false, message: 'Firestore đang ngoại tuyến, không thể chuyển vào thùng rác Cloud.' };
  }

  try {
    const docRef = doc(db, collectionName, docId);
    const snap = await getDoc(docRef);
    const existingData = snap.exists() ? (snap.data() as Record<string, any>) : fallbackSnapshot || { id: docId };
    const currentRev = Math.max(Number(existingData._rev || 0), Number(existingData.version || 0), 1);

    // 1. Capture an immutable pre-delete snapshot
    await createImmutableSnapshot(collectionName, docId, existingData, 'SOFT_DELETE', deletedBy);

    // 2. Mark source document as soft-deleted without deleting any fields
    await setDoc(
      docRef,
      {
        _deleted: true,
        _deletedAt: nowIso,
        _deletedBy: deletedBy,
        _restoreBefore: restoreBeforeIso,
        _rev: currentRev + 1,
        _updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 3. Write clean index entry to `_recycle_bin`
    const displayName =
      existingData.quoteNumber ||
      existingData.companyName ||
      existingData.customerName ||
      existingData.rateCode ||
      existingData.code ||
      existingData.name ||
      docId;
    const secondaryLabel =
      existingData.customer?.companyName ||
      existingData.customer?.customerName ||
      existingData.origin ||
      existingData.email ||
      collectionName;

    const recycleEntry: RecycleBinEntry = {
      id: recycleId,
      collectionName,
      docId,
      displayName: String(displayName),
      secondaryLabel: secondaryLabel ? String(secondaryLabel) : undefined,
      deletedAt: nowIso,
      deletedBy: String(deletedBy),
      restoreBefore: restoreBeforeIso,
      rev: currentRev + 1,
      snapshotData: existingData,
    };

    await setDoc(doc(db, RECYCLE_BIN_COLLECTION, recycleId), recycleEntry, { merge: true });

    return {
      success: true,
      message: `Đã chuyển "${displayName}" vào Thùng Rác Khôi Phục (lưu giữ an toàn 90 ngày).`,
    };
  } catch (err: any) {
    if (String(err?.message || '').toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${docId}`);
    }
    return {
      success: false,
      message: err?.message || 'Lỗi khi chuyển bản ghi vào Thùng Rác.',
    };
  }
}

export async function fetchRecycleBinItems(): Promise<RecycleBinEntry[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, RECYCLE_BIN_COLLECTION), orderBy('deletedAt', 'desc'), limit(150));
    const snap = await getDocs(q);
    const items: RecycleBinEntry[] = [];
    snap.forEach((d) => {
      items.push({ ...(d.data() as RecycleBinEntry), id: d.id });
    });
    return items;
  } catch (err: any) {
    if (String(err?.message || '').toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.LIST, RECYCLE_BIN_COLLECTION);
    }
    console.warn('[dataVault] Recycle bin list notice:', err);
    return [];
  }
}

export async function restoreFromRecycleBin(
  entry: RecycleBinEntry
): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: 'Firestore đang ngoại tuyến.' };
  }

  try {
    const docRef = doc(db, entry.collectionName, entry.docId);
    const nowIso = new Date().toISOString();

    await runTransaction(db, async (tx) => {
      const currentSnap = await tx.get(docRef);
      const currentData = currentSnap.exists() ? (currentSnap.data() as Record<string, any>) : entry.snapshotData;
      const currentRev = Math.max(Number(currentData?._rev || 0), Number(entry.rev || 1));

      tx.set(
        docRef,
        {
          ...entry.snapshotData,
          ...(currentData || {}),
          id: entry.docId,
          _deleted: false,
          _deletedAt: null,
          _deletedBy: null,
          _restoreBefore: null,
          _restoredAt: nowIso,
          _rev: currentRev + 1,
          _updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    await deleteDoc(doc(db, RECYCLE_BIN_COLLECTION, entry.id));
    return {
      success: true,
      message: `Đã khôi phục nguyên vẹn "${entry.displayName}" về hệ thống!`,
    };
  } catch (err: any) {
    if (String(err?.message || '').toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.WRITE, `${entry.collectionName}/${entry.docId}`);
    }
    return {
      success: false,
      message: err?.message || 'Lỗi khi khôi phục từ Thùng Rác.',
    };
  }
}

/**
 * 4. OPTIMISTIC CONCURRENCY TRANSACTION GUARD
 * Atomically checks remote `_rev` vs local `_rev` before writing to prevent silent overwrites.
 */
export async function saveWithConcurrencyGuard<T extends Record<string, any>>(
  collectionName: VersionedCollectionName | string,
  docId: string,
  data: T,
  options: { forceOverwrite?: boolean; actor?: string; createSnapshot?: boolean } = {}
): Promise<
  | { success: true; savedData: T & { _rev: number; version: number }; remoteBeforeOverwrite?: Record<string, any> }
  | { success: false; conflict: true; detail: ConcurrencyConflictErrorDetail }
  | { success: false; conflict: false; error: string; queuedOffline?: boolean }
> {
  if (STRICT_REAL_DATA_ONLY && isSyntheticRecord(data)) {
    return {
      success: false,
      conflict: false,
      error: 'STRICT_REAL_DATA_GUARD: Từ chối lưu bản ghi mẫu/giả lập lên hệ thống.',
    };
  }

  const stamped = stampRealDataOrigin(data);
  const schemaVer =
    collectionName in COLLECTION_SCHEMA_VERSIONS
      ? COLLECTION_SCHEMA_VERSIONS[collectionName as VersionedCollectionName]
      : 1;

  if (!db || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    enqueueOfflineMutation({
      collectionName,
      docId,
      payload: {
        ...stamped,
        _schemaVersion: schemaVer,
      },
      label: data.quoteNumber || data.companyName || data.customerName || docId,
    });
    return {
      success: false,
      conflict: false,
      queuedOffline: true,
      error: 'Thiết bị đang ngoại tuyến. Thay đổi đã được đưa vào Hàng Đợi Đồng Bộ An Toàn.',
    };
  }

  const docRef = doc(db, collectionName, docId);
  const localRev = Math.max(Number(data._rev || 0), Number(data.version || 0), 0);

  try {
    const txResult = await runTransaction(db, async (tx) => {
      const remoteSnap = await tx.get(docRef);
      const remoteData = remoteSnap.exists() ? (remoteSnap.data() as Record<string, any>) : null;
      const remoteRev = remoteData
        ? Math.max(Number(remoteData._rev || 0), Number(remoteData.version || 0), 1)
        : 0;

      if (remoteData && !options.forceOverwrite && localRev > 0 && remoteRev > localRev) {
        return {
          conflict: true as const,
          remoteData,
          remoteRev,
        };
      }

      const nextRev = Math.max(remoteRev, localRev) + 1;
      const payloadToWrite = {
        ...stamped,
        id: docId,
        _deleted: false,
        _rev: nextRev,
        version: nextRev,
        _schemaVersion: schemaVer,
        _updatedBy: options.actor || auth?.currentUser?.email || data._updatedBy || 'Operator',
        _updatedAt: serverTimestamp(),
      };

      tx.set(docRef, payloadToWrite, { merge: true });
      return {
        conflict: false as const,
        savedData: payloadToWrite as unknown as T & { _rev: number; version: number },
        remoteData,
      };
    });

    if (txResult.conflict) {
      return {
        success: false,
        conflict: true,
        detail: {
          collectionName,
          docId,
          localRev,
          remoteRev: txResult.remoteRev,
          localData: data,
          remoteData: txResult.remoteData,
        },
      };
    }

    // Fire-and-forget immutable snapshot creation (zero UI lag)
    if (options.createSnapshot !== false) {
      if (options.forceOverwrite && txResult.remoteData) {
        createImmutableSnapshot(
          collectionName,
          docId,
          txResult.remoteData,
          'PRE_OVERWRITE',
          options.actor,
          'Lưu dự phòng trước khi ghi đè thủ công'
        ).catch(() => {});
      }
      createImmutableSnapshot(
        collectionName,
        docId,
        txResult.savedData,
        txResult.remoteData ? 'UPDATE' : 'CREATE',
        options.actor
      ).catch(() => {});
    }

    return {
      success: true,
      savedData: txResult.savedData,
      remoteBeforeOverwrite: txResult.remoteData || undefined,
    };
  } catch (err: any) {
    if (String(err?.message || '').toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${docId}`);
    }
    const errMsg = String(err?.message || '').toLowerCase();
    if (errMsg.includes('offline') || errMsg.includes('network') || errMsg.includes('unavailable')) {
      enqueueOfflineMutation({
        collectionName,
        docId,
        payload: { ...stamped, _schemaVersion: schemaVer },
        label: data.quoteNumber || data.companyName || data.customerName || docId,
      });
      return {
        success: false,
        conflict: false,
        queuedOffline: true,
        error: 'Mất kết nối tạm thời. Dữ liệu đã được xếp vào Hàng Đợi Offline an toàn.',
      };
    }
    return {
      success: false,
      conflict: false,
      error: err?.message || 'Lỗi giao dịch Firestore.',
    };
  }
}

/**
 * 5. OFFLINE MUTATION OUTBOX QUEUE (Zero-LocalStorage: RAM + Firebase Storage Sync)
 * Guarantees zero lost edits during network drops; auto-flushes sequentially when online.
 */
export function getOfflineOutboxQueue(): OfflineOutboxItem[] {
  try {
    return [...getModuleData<OfflineOutboxItem[]>('offline_outbox', [])];
  } catch {
    return [];
  }
}

export function enqueueOfflineMutation(input: {
  collectionName: string;
  docId: string;
  payload: Record<string, any>;
  label?: string;
}): OfflineOutboxItem[] {
  if (STRICT_REAL_DATA_ONLY && isSyntheticRecord(input.payload)) return getOfflineOutboxQueue();

  const current = getOfflineOutboxQueue();
  const existingIdx = current.findIndex(
    (item) => item.collectionName === input.collectionName && item.docId === input.docId
  );

  // Clean non-serializable Firestore sentinels before queueing
  const cleanPayload: Record<string, any> = {};
  for (const [k, v] of Object.entries(input.payload)) {
    if (k === '_updatedAt' || k === '_createdAt') continue;
    if (v !== undefined) cleanPayload[k] = v;
  }

  const nextItem: OfflineOutboxItem = {
    id: `${input.collectionName}__${input.docId}`,
    collectionName: input.collectionName,
    docId: input.docId,
    payload: cleanPayload,
    queuedAt: new Date().toISOString(),
    retryCount: existingIdx >= 0 ? current[existingIdx].retryCount : 0,
    label: input.label,
  };

  const updated =
    existingIdx >= 0
      ? current.map((item, idx) => (idx === existingIdx ? nextItem : item))
      : [nextItem, ...current];

  try {
    setModuleData('offline_outbox', updated);
  } catch (e) {
    console.warn('[dataVault] Failed saving offline outbox:', e);
  }
  return updated;
}

export function removeOfflineOutboxItem(id: string): OfflineOutboxItem[] {
  const updated = getOfflineOutboxQueue().filter((i) => i.id !== id);
  try {
    setModuleData('offline_outbox', updated);
  } catch {}
  return updated;
}

let isFlushingOutbox = false;

export async function flushOfflineOutboxQueue(): Promise<{
  flushedCount: number;
  remainingCount: number;
  conflictsCount: number;
}> {
  if (isFlushingOutbox || !db) {
    return { flushedCount: 0, remainingCount: getOfflineOutboxQueue().length, conflictsCount: 0 };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { flushedCount: 0, remainingCount: getOfflineOutboxQueue().length, conflictsCount: 0 };
  }

  const queue = getOfflineOutboxQueue();
  if (queue.length === 0) {
    return { flushedCount: 0, remainingCount: 0, conflictsCount: 0 };
  }

  isFlushingOutbox = true;
  let flushedCount = 0;
  let conflictsCount = 0;
  const remaining: OfflineOutboxItem[] = [];

  try {
    for (const item of queue) {
      const res = await saveWithConcurrencyGuard(item.collectionName, item.docId, item.payload, {
        createSnapshot: true,
      });

      if (res.success) {
        flushedCount++;
      } else if ('conflict' in res && res.conflict) {
        conflictsCount++;
        remaining.push({
          ...item,
          retryCount: item.retryCount + 1,
          lastError: `Xung đột phiên bản Cloud v${res.detail.remoteRev} > Local v${res.detail.localRev}`,
        });
      } else {
        remaining.push({
          ...item,
          retryCount: item.retryCount + 1,
          lastError: 'error' in res ? res.error : 'Lỗi đồng bộ',
        });
      }
    }

    setModuleData('offline_outbox', remaining, { immediate: true });
  } finally {
    isFlushingOutbox = false;
  }

  return {
    flushedCount,
    remainingCount: remaining.length,
    conflictsCount,
  };
}
