/**
 * Modular Firebase Storage Cloud Vault Service (Zero-LocalStorage Architecture)
 *
 * Implements all 5 layers of cross-device cloud persistence:
 * 1. Modular Firebase Storage Vault (`cloudVault/{workspaceId}/modules/{moduleName}.json`)
 * 2. Unified In-Memory RAM Cache (0ms synchronous reads) + Debounced (800ms) Smart Cloud Upload
 * 3. Real-Time `_vault_manifest/{workspaceId}` Sync Bell + Selective Module Pull & ID Merge
 * 4. One-Click Legacy `localStorage` Scanner & Firebase Storage Migrator
 * 5. Workspace Scoping & Pure Cloud-Backed Offline Outbox / UI Preferences
 */

import { ref, uploadBytes, getBytes } from 'firebase/storage';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { storage, db, auth } from './firebaseConfig';

export type VaultModuleKey =
  | 'debit_notes'
  | 'soa_records'
  | 'payments'
  | 'carrier_audits'
  | 'parsed_documents'
  | 'customer_dna'
  | 'competitor_intel'
  | 'route_presets'
  | 'route_preset_favorites'
  | 'multi_options'
  | 'exchange_rate'
  | 'exchange_config'
  | 'ui_preferences'
  | 'offline_outbox';

export interface VaultUiPreferencesData {
  pinnedNavIds?: string[];
  expandedGroups?: Record<string, boolean>;
  sidebarCollapsed?: boolean;
  sidebarMinimalMode?: boolean;
  workbenchLayout?: 'SPLIT' | 'STACKED';
  salesHudCollapsed?: boolean;
  activeCompanyId?: string;
  updatedAt?: string;
}

export interface VaultModuleDescriptor {
  key: VaultModuleKey;
  labelVi: string;
  category: 'FINANCE' | 'OPERATIONS' | 'PRICING' | 'SYSTEM';
  isArray: boolean;
}

export const VAULT_MODULE_CATALOG: VaultModuleDescriptor[] = [
  { key: 'debit_notes', labelVi: 'Giấy Báo Nợ (Debit Notes)', category: 'FINANCE', isArray: true },
  { key: 'soa_records', labelVi: 'Đối Soát Công Nợ (SOA)', category: 'FINANCE', isArray: true },
  { key: 'payments', labelVi: 'Theo Dõi Thanh Toán & Công Nợ', category: 'FINANCE', isArray: true },
  { key: 'carrier_audits', labelVi: 'Đối Soát Hóa Đơn Hãng Tàu', category: 'FINANCE', isArray: true },
  { key: 'parsed_documents', labelVi: 'Chứng Từ AI Document Parser', category: 'OPERATIONS', isArray: true },
  { key: 'customer_dna', labelVi: 'Customer DNA & Power Map', category: 'OPERATIONS', isArray: true },
  { key: 'competitor_intel', labelVi: 'Hồ Sơ Đối Thủ Cạnh Tranh', category: 'PRICING', isArray: true },
  { key: 'route_presets', labelVi: 'Mẫu Tuyến Đường Tùy Chỉnh', category: 'PRICING', isArray: true },
  { key: 'route_preset_favorites', labelVi: 'Tuyến Đường Yêu Thích', category: 'PRICING', isArray: true },
  { key: 'multi_options', labelVi: 'Gói Báo Giá Đa Phương Án', category: 'PRICING', isArray: true },
  { key: 'exchange_rate', labelVi: 'Tỷ Giá USD/VND Live', category: 'SYSTEM', isArray: false },
  { key: 'exchange_config', labelVi: 'Cấu Hình Đồng Bộ Tỷ Giá', category: 'SYSTEM', isArray: false },
  { key: 'ui_preferences', labelVi: 'Tùy Chọn Giao Diện & Ghim Menu', category: 'SYSTEM', isArray: false },
  { key: 'offline_outbox', labelVi: 'Hàng Đợi Đồng Bộ Offline', category: 'SYSTEM', isArray: true },
];

export interface VaultManifestModuleEntry {
  rev: number;
  updatedAt: string;
  hash: string;
  count: number;
  updatedBy?: string;
}

export interface VaultManifestDoc {
  workspaceId: string;
  schemaVersion: number;
  updatedAt: string;
  modules: Partial<Record<VaultModuleKey, VaultManifestModuleEntry>>;
}

interface StoredModuleEnvelope<T = any> {
  moduleKey: VaultModuleKey;
  workspaceId: string;
  schemaVersion: number;
  rev: number;
  hash: string;
  updatedAt: string;
  updatedBy?: string;
  data: T;
}

interface MemoryModuleEntry<T = any> {
  data: T;
  rev: number;
  hash: string;
  updatedAt: string;
  isDirty: boolean;
}

export interface CloudVaultModuleStatus {
  key: VaultModuleKey;
  labelVi: string;
  category: VaultModuleDescriptor['category'];
  rev: number;
  count: number;
  updatedAt: string | null;
  isDirty: boolean;
  isHydrated: boolean;
}

export interface LegacyLocalStorageItemFound {
  moduleKey: VaultModuleKey;
  legacyKeys: string[];
  labelVi: string;
  recordCount: number;
  hasData: boolean;
}

export interface LegacyScanReport {
  totalLegacyKeysFound: number;
  totalRecordsFound: number;
  items: LegacyLocalStorageItemFound[];
}

export interface LegacyMigrationResult {
  success: boolean;
  migratedModulesCount: number;
  migratedRecordsCount: number;
  clearedKeysCount: number;
  errors: string[];
  message: string;
}

const VAULT_MANIFEST_COLLECTION = '_vault_manifest';
const DEFAULT_WORKSPACE_ID = 'company_profile';
const UPLOAD_DEBOUNCE_MS = 800;

const KNOWN_SYNTHETIC_SAMPLE_IDS = new Set([
  'audit-maersk-rotterdam-01',
  'audit-one-newyork-02',
  'audit-cmacgm-longbeach-03',
  'audit-msc-singapore-04',
  'dna-seafood-biendong',
  'pay_rec_001',
  'pay_rec_002',
  'pay_rec_003',
  'pay_rec_004',
]);

// ============================================================================
// IN-MEMORY RAM CACHE (0ms synchronous read/write across all 14+ modules)
// ============================================================================
let activeWorkspaceId: string = DEFAULT_WORKSPACE_ID;
const memoryModuleStore = new Map<VaultModuleKey, MemoryModuleEntry>();
const hydratedWorkspaces = new Set<string>();
const inFlightHydrations = new Map<string, Promise<void>>();
const uploadTimers = new Map<VaultModuleKey, ReturnType<typeof setTimeout>>();
const pendingUploadPromises = new Map<VaultModuleKey, Promise<boolean>>();
const dirtyModules = new Set<VaultModuleKey>();
let isOnlineListenerBound = false;

function sanitizeWorkspaceId(id?: string): string {
  const raw = (id || activeWorkspaceId || DEFAULT_WORKSPACE_ID).trim();
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_') || DEFAULT_WORKSPACE_ID;
}

function fastHash(str: string): string {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36) + '_' + str.length;
}

function getItemCount(data: any): number {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === 'object') return Object.keys(data).length;
  return data ? 1 : 0;
}

function isSyntheticVaultRecord(record: any): boolean {
  if (!record || typeof record !== 'object') return false;
  if (record._isSample === true || record._isSynthetic === true || record.isDemo === true) {
    return true;
  }
  const id = String(record.id || '').trim();
  if (KNOWN_SYNTHETIC_SAMPLE_IDS.has(id)) {
    return true;
  }
  return false;
}

function filterRealArrayItems<T>(arr: T[], filterSynthetic: boolean): T[] {
  if (!Array.isArray(arr)) return [];
  if (!filterSynthetic) return arr;
  return arr.filter((item) => !isSyntheticVaultRecord(item));
}

function shouldFilterSyntheticForModule(key: VaultModuleKey): boolean {
  return (
    key === 'debit_notes' ||
    key === 'soa_records' ||
    key === 'payments' ||
    key === 'carrier_audits' ||
    key === 'parsed_documents' ||
    key === 'customer_dna' ||
    key === 'multi_options'
  );
}

function dispatchVaultEvent(eventName: string, detail?: any): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }
}

function ensureOnlineRetryListener(): void {
  if (isOnlineListenerBound || typeof window === 'undefined') return;
  isOnlineListenerBound = true;
  window.addEventListener('online', () => {
    if (dirtyModules.size > 0) {
      const keys = Array.from(dirtyModules);
      keys.forEach((k) => {
        flushModuleUpload(k, activeWorkspaceId).catch(() => {});
      });
    }
  });
}

// ============================================================================
// ACTIVE WORKSPACE / COMPANY SCOPING (ZERO LOCALSTORAGE)
// ============================================================================

export function getVaultActiveCompanyId(): string {
  return activeWorkspaceId || DEFAULT_WORKSPACE_ID;
}

export function setVaultActiveCompanyId(companyId: string): string {
  const next = (companyId || DEFAULT_WORKSPACE_ID).trim() || DEFAULT_WORKSPACE_ID;
  const changed = next !== activeWorkspaceId;
  activeWorkspaceId = next;

  // Persist inside ui_preferences Vault module
  const prefs = getModuleData<VaultUiPreferencesData>('ui_preferences', {});
  if (prefs.activeCompanyId !== next) {
    setModuleData<VaultUiPreferencesData>('ui_preferences', {
      ...prefs,
      activeCompanyId: next,
      updatedAt: new Date().toISOString(),
    });
  }

  if (changed) {
    dispatchVaultEvent('cloud-vault-workspace-changed', { workspaceId: next });
  }
  return next;
}

export function getUiPreferences(): VaultUiPreferencesData {
  return getModuleData<VaultUiPreferencesData>('ui_preferences', {});
}

export function updateUiPreferences(patch: Partial<VaultUiPreferencesData>): VaultUiPreferencesData {
  const current = getUiPreferences();
  const next: VaultUiPreferencesData = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  setModuleData<VaultUiPreferencesData>('ui_preferences', next);
  return next;
}

// ============================================================================
// CORE SYNCHRONOUS RAM READ / WRITE API (0ms UI DELAY)
// ============================================================================

export function getModuleData<T>(key: VaultModuleKey, fallback: T): T {
  const entry = memoryModuleStore.get(key);
  if (!entry || entry.data === undefined || entry.data === null) {
    return fallback;
  }
  return entry.data as T;
}

export function setModuleData<T>(
  key: VaultModuleKey,
  data: T,
  options?: {
    immediate?: boolean;
    workspaceId?: string;
    skipUpload?: boolean;
  }
): T {
  ensureOnlineRetryListener();
  const wsId = sanitizeWorkspaceId(options?.workspaceId);

  const sanitizedData = (
    Array.isArray(data) && shouldFilterSyntheticForModule(key)
      ? filterRealArrayItems(data, true)
      : data
  ) as T;

  const jsonStr = JSON.stringify(sanitizedData);
  const nextHash = fastHash(jsonStr);
  const existing = memoryModuleStore.get(key);

  if (existing && existing.hash === nextHash && !options?.immediate) {
    return existing.data as T;
  }

  // Zero-overwrite guard: if browser hasn't completed initial hydration AND incoming is empty [],
  // do not wipe Cloud data with empty state on boot.
  const isEmptyArray = Array.isArray(sanitizedData) && sanitizedData.length === 0;
  const allowUpload =
    !options?.skipUpload &&
    !(isEmptyArray && !hydratedWorkspaces.has(wsId));

  const nextRev = (existing?.rev || 0) + 1;
  const nowIso = new Date().toISOString();

  memoryModuleStore.set(key, {
    data: sanitizedData,
    rev: nextRev,
    hash: nextHash,
    updatedAt: nowIso,
    isDirty: allowUpload,
  });

  if (allowUpload) {
    dirtyModules.add(key);
  }

  dispatchVaultEvent('cloud-vault-module-updated', {
    key,
    workspaceId: wsId,
    data: sanitizedData,
    rev: nextRev,
  });

  // Notify legacy custom listeners cleanly
  if (key === 'parsed_documents') {
    dispatchVaultEvent('logistics_parsed_documents_changed', sanitizedData);
  } else if (key === 'offline_outbox') {
    dispatchVaultEvent('data-vault-outbox-changed', sanitizedData);
  }

  if (allowUpload) {
    if (options?.immediate) {
      const prevTimer = uploadTimers.get(key);
      if (prevTimer) clearTimeout(prevTimer);
      uploadTimers.delete(key);
      flushModuleUpload(key, wsId).catch(() => {});
    } else {
      scheduleDebouncedModuleUpload(key, wsId);
    }
  }

  return sanitizedData;
}

function scheduleDebouncedModuleUpload(key: VaultModuleKey, workspaceId: string): void {
  const existingTimer = uploadTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    uploadTimers.delete(key);
    flushModuleUpload(key, workspaceId).catch(() => {});
  }, UPLOAD_DEBOUNCE_MS);

  uploadTimers.set(key, timer);
}

export async function flushModuleUpload(key: VaultModuleKey, workspaceId?: string): Promise<boolean> {
  const wsId = sanitizeWorkspaceId(workspaceId);
  const entry = memoryModuleStore.get(key);
  if (!entry) return true;
  if (!storage) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;

  const existingInFlight = pendingUploadPromises.get(key);
  if (existingInFlight) {
    await existingInFlight.catch(() => false);
  }

  const runUpload = async (): Promise<boolean> => {
    try {
      const latestEntry = memoryModuleStore.get(key);
      if (!latestEntry) return true;

      const actor = auth?.currentUser?.email || auth?.currentUser?.uid || 'workspace_user';
      const envelope: StoredModuleEnvelope = {
        moduleKey: key,
        workspaceId: wsId,
        schemaVersion: 1,
        rev: latestEntry.rev,
        hash: latestEntry.hash,
        updatedAt: latestEntry.updatedAt,
        updatedBy: actor,
        data: latestEntry.data,
      };

      const storagePath = `cloudVault/${wsId}/modules/${key}.json`;
      const storageRef = ref(storage!, storagePath);
      const jsonBlob = new Blob([JSON.stringify(envelope)], { type: 'application/json' });

      await uploadBytes(storageRef, jsonBlob, {
        contentType: 'application/json',
        customMetadata: {
          workspaceId: wsId,
          moduleKey: key,
          rev: String(latestEntry.rev),
          hash: latestEntry.hash,
          updatedAt: latestEntry.updatedAt,
        },
      });

      // Mark clean if hash hasn't changed while uploading
      const currentAfter = memoryModuleStore.get(key);
      if (currentAfter && currentAfter.hash === latestEntry.hash) {
        currentAfter.isDirty = false;
        dirtyModules.delete(key);
      }

      // Bump lightweight Firestore manifest so all other devices receive instant notification
      if (db) {
        const manifestRef = doc(db, VAULT_MANIFEST_COLLECTION, wsId);
        const manifestPatch: Record<string, any> = {
          workspaceId: wsId,
          schemaVersion: 1,
          updatedAt: latestEntry.updatedAt,
          [`modules.${key}`]: {
            rev: latestEntry.rev,
            updatedAt: latestEntry.updatedAt,
            hash: latestEntry.hash,
            count: getItemCount(latestEntry.data),
            updatedBy: actor,
          },
        };
        await setDoc(manifestRef, manifestPatch, { merge: true }).catch((err) => {
          console.warn(`[cloudStorageVault] Manifest bump notice for ${key}:`, err);
        });
      }

      return true;
    } catch (err) {
      console.warn(`[cloudStorageVault] Upload deferred/failed for ${key}:`, err);
      return false;
    }
  };

  const promise = runUpload();
  pendingUploadPromises.set(key, promise);
  try {
    return await promise;
  } finally {
    if (pendingUploadPromises.get(key) === promise) {
      pendingUploadPromises.delete(key);
    }
  }
}

// ============================================================================
// SMART MERGE ENGINE (NEVER LET EMPTY/STALE DEVICES WIPE CLOUD DATA)
// ============================================================================

function mergeArraysById<T extends Record<string, any>>(
  remoteArr: T[],
  localArr: T[]
): T[] {
  const byId = new Map<string, T>();

  for (const item of remoteArr) {
    if (item && typeof item === 'object' && item.id) {
      byId.set(String(item.id), item);
    }
  }

  for (const localItem of localArr) {
    if (!localItem || typeof localItem !== 'object') continue;
    const id = localItem.id ? String(localItem.id) : '';
    if (!id) continue;

    const remoteItem = byId.get(id);
    if (!remoteItem) {
      byId.set(id, localItem);
    } else {
      const localTs = new Date(localItem.updatedAt || localItem.updatedDate || localItem.createdAt || 0).getTime();
      const remoteTs = new Date(remoteItem.updatedAt || remoteItem.updatedDate || remoteItem.createdAt || 0).getTime();
      if (localTs > remoteTs) {
        byId.set(id, localItem);
      }
    }
  }

  // Fallback for arrays without IDs (e.g. string arrays like route_preset_favorites)
  if (byId.size === 0 && (remoteArr.length > 0 || localArr.length > 0)) {
    const mergedSet = new Set<any>([...remoteArr, ...localArr]);
    return Array.from(mergedSet) as T[];
  }

  return Array.from(byId.values());
}

function mergeModulePayload(key: VaultModuleKey, remoteData: any, localData: any, localIsDirty: boolean): any {
  // Clean un-edited device always adopts Cloud truth directly
  if (!localIsDirty || localData === undefined || localData === null) {
    return remoteData;
  }

  if (Array.isArray(remoteData) && Array.isArray(localData)) {
    if (key === 'route_preset_favorites') {
      return Array.from(new Set([...remoteData, ...localData]));
    }
    return mergeArraysById(remoteData, localData);
  }

  if (remoteData && typeof remoteData === 'object' && localData && typeof localData === 'object') {
    return {
      ...remoteData,
      ...localData,
    };
  }

  return localData ?? remoteData;
}

// ============================================================================
// HYDRATION & SELECTIVE PULL FROM FIREBASE STORAGE
// ============================================================================

async function downloadModuleFromStorage(
  key: VaultModuleKey,
  workspaceId: string
): Promise<StoredModuleEnvelope | null> {
  if (!storage) return null;
  try {
    const storageRef = ref(storage, `cloudVault/${workspaceId}/modules/${key}.json`);
    const bytes = await getBytes(storageRef);
    const decoded = new TextDecoder('utf-8').decode(bytes);
    const parsed = JSON.parse(decoded);

    if (parsed && typeof parsed === 'object' && 'data' in parsed && 'moduleKey' in parsed) {
      return parsed as StoredModuleEnvelope;
    }

    // Legacy raw payload fallback
    return {
      moduleKey: key,
      workspaceId,
      schemaVersion: 1,
      rev: 1,
      hash: fastHash(decoded),
      updatedAt: new Date().toISOString(),
      data: parsed,
    };
  } catch (err: any) {
    const msg = String(err?.code || err?.message || '');
    if (msg.includes('object-not-found') || msg.includes('404')) {
      return null;
    }
    console.warn(`[cloudStorageVault] Download notice for ${key}:`, err);
    return null;
  }
}

function applyDownloadedModuleToMemory(key: VaultModuleKey, workspaceId: string, env: StoredModuleEnvelope): boolean {
  const existing = memoryModuleStore.get(key);
  const rawRemote = Array.isArray(env.data) && shouldFilterSyntheticForModule(key)
    ? filterRealArrayItems(env.data, true)
    : env.data;

  // Skip if identical hash and already clean
  if (existing && !existing.isDirty && existing.hash === env.hash) {
    return false;
  }

  const merged = mergeModulePayload(key, rawRemote, existing?.data, Boolean(existing?.isDirty));
  const mergedStr = JSON.stringify(merged);
  const mergedHash = fastHash(mergedStr);
  const finalRev = Math.max(env.rev || 1, existing?.rev || 0);

  memoryModuleStore.set(key, {
    data: merged,
    rev: finalRev,
    hash: mergedHash,
    updatedAt: env.updatedAt || new Date().toISOString(),
    isDirty: Boolean(existing?.isDirty && mergedHash !== env.hash),
  });

  if (key === 'ui_preferences' && merged && typeof merged === 'object') {
    const uiPrefs = merged as VaultUiPreferencesData;
    if (uiPrefs.activeCompanyId && uiPrefs.activeCompanyId !== activeWorkspaceId) {
      activeWorkspaceId = uiPrefs.activeCompanyId;
    }
    if (Array.isArray(uiPrefs.pinnedNavIds)) {
      dispatchVaultEvent('logistics_pinned_favorites_changed', uiPrefs.pinnedNavIds);
    }
  }

  if (key === 'parsed_documents') {
    dispatchVaultEvent('logistics_parsed_documents_changed', merged);
  } else if (key === 'offline_outbox') {
    dispatchVaultEvent('data-vault-outbox-changed', merged);
  }

  dispatchVaultEvent('cloud-vault-module-updated', {
    key,
    workspaceId,
    data: merged,
    rev: finalRev,
    source: 'CLOUD_PULL',
  });

  // If local had dirty changes that merged cleanly and differ from Cloud hash, push merged result back
  if (existing?.isDirty && mergedHash !== env.hash) {
    scheduleDebouncedModuleUpload(key, workspaceId);
  }

  return true;
}

/**
 * Hydrates all 14 modules on startup or workspace switch in parallel.
 * Uses `_vault_manifest/{workspaceId}` when available to skip nonexistent modules (zero wasted 404 roundtrips).
 */
export async function hydrateCloudVault(workspaceId?: string, forceAll = false): Promise<VaultModuleKey[]> {
  const wsId = sanitizeWorkspaceId(workspaceId);

  if (inFlightHydrations.has(wsId) && !forceAll) {
    await inFlightHydrations.get(wsId);
    return [];
  }

  const updatedKeys: VaultModuleKey[] = [];

  const runHydration = async () => {
    try {
      let keysToFetch: VaultModuleKey[] = [];

      // Step 1: Read lightweight Firestore manifest to know exactly which modules exist in Storage
      if (db && !forceAll) {
        try {
          const manifestSnap = await getDoc(doc(db, VAULT_MANIFEST_COLLECTION, wsId));
          if (manifestSnap.exists()) {
            const manifest = manifestSnap.data() as VaultManifestDoc;
            const modMap = manifest.modules || {};
            for (const desc of VAULT_MODULE_CATALOG) {
              const meta = modMap[desc.key];
              if (!meta) continue;
              const local = memoryModuleStore.get(desc.key);
              if (!local || local.hash !== meta.hash || meta.rev > local.rev) {
                keysToFetch.push(desc.key);
              }
            }
          }
        } catch (err) {
          console.warn('[cloudStorageVault] Manifest read notice:', err);
        }
      }

      // Step 2: Fallback if manifest didn't exist yet or forceAll=true -> probe Storage modules
      if (keysToFetch.length === 0 && (!hydratedWorkspaces.has(wsId) || forceAll)) {
        keysToFetch = VAULT_MODULE_CATALOG.map((m) => m.key);
      }

      if (keysToFetch.length > 0 && storage) {
        await Promise.all(
          keysToFetch.map(async (key) => {
            const env = await downloadModuleFromStorage(key, wsId);
            if (env) {
              const changed = applyDownloadedModuleToMemory(key, wsId, env);
              if (changed) {
                updatedKeys.push(key);
              }
            }
          })
        );
      }

      hydratedWorkspaces.add(wsId);
      dispatchVaultEvent('cloud-vault-hydrated', {
        workspaceId: wsId,
        updatedKeys,
        hydratedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[cloudStorageVault] Hydration notice:', err);
    } finally {
      inFlightHydrations.delete(wsId);
    }
  };

  const promise = runHydration();
  inFlightHydrations.set(wsId, promise);
  await promise;
  return updatedKeys;
}

// ============================================================================
// REAL-TIME `_vault_manifest/{workspaceId}` SYNC BELL
// ============================================================================

export function subscribeToVaultManifest(
  workspaceId?: string,
  onModulesSynced?: (changedKeys: VaultModuleKey[]) => void
): () => void {
  if (!db) return () => {};
  const wsId = sanitizeWorkspaceId(workspaceId);

  try {
    const manifestRef = doc(db, VAULT_MANIFEST_COLLECTION, wsId);
    return onSnapshot(
      manifestRef,
      async (snap) => {
        if (!snap.exists()) return;
        const manifest = snap.data() as VaultManifestDoc;
        const remoteMods = manifest.modules || {};
        const staleKeys: VaultModuleKey[] = [];

        for (const desc of VAULT_MODULE_CATALOG) {
          const remoteMeta = remoteMods[desc.key];
          if (!remoteMeta) continue;
          const local = memoryModuleStore.get(desc.key);
          if (!local || (remoteMeta.rev > local.rev && remoteMeta.hash !== local.hash)) {
            staleKeys.push(desc.key);
          }
        }

        if (staleKeys.length === 0) return;

        const applied: VaultModuleKey[] = [];
        await Promise.all(
          staleKeys.map(async (key) => {
            const env = await downloadModuleFromStorage(key, wsId);
            if (env && applyDownloadedModuleToMemory(key, wsId, env)) {
              applied.push(key);
            }
          })
        );

        if (applied.length > 0) {
          dispatchVaultEvent('cloud-vault-hydrated', {
            workspaceId: wsId,
            updatedKeys: applied,
            source: 'REALTIME_MANIFEST',
          });
          if (onModulesSynced) {
            onModulesSynced(applied);
          }
        }
      },
      (err) => {
        console.warn('[cloudStorageVault] Manifest real-time listener notice:', err);
      }
    );
  } catch (err) {
    console.warn('[cloudStorageVault] Failed subscribing to manifest:', err);
    return () => {};
  }
}

export function getCloudVaultStatus(workspaceId?: string): CloudVaultModuleStatus[] {
  const wsId = sanitizeWorkspaceId(workspaceId);
  const isWsHydrated = hydratedWorkspaces.has(wsId);

  return VAULT_MODULE_CATALOG.map((desc) => {
    const entry = memoryModuleStore.get(desc.key);
    return {
      key: desc.key,
      labelVi: desc.labelVi,
      category: desc.category,
      rev: entry?.rev || 0,
      count: entry ? getItemCount(entry.data) : 0,
      updatedAt: entry?.updatedAt || null,
      isDirty: entry?.isDirty || false,
      isHydrated: isWsHydrated || Boolean(entry),
    };
  });
}

// ============================================================================
// ONE-CLICK LEGACY LOCALSTORAGE SCANNER & MIGRATOR
// ============================================================================

const LEGACY_ARRAY_MAPPINGS: Array<{
  moduleKey: VaultModuleKey;
  legacyKey: string;
  labelVi: string;
}> = [
  { moduleKey: 'debit_notes', legacyKey: 'bogi_debit_notes_store_v1', labelVi: 'Giấy Báo Nợ (Debit Notes)' },
  { moduleKey: 'soa_records', legacyKey: 'bogi_soa_records_store_v1', labelVi: 'Bảng Đối Soát Công Nợ (SOA)' },
  { moduleKey: 'payments', legacyKey: 'bogi_quotation_payments_v1', labelVi: 'Hồ Sơ Thanh Toán Báo Giá' },
  { moduleKey: 'carrier_audits', legacyKey: 'bogi_carrier_invoice_audits_v1', labelVi: 'Đối Soát Hóa Đơn Hãng Tàu' },
  { moduleKey: 'parsed_documents', legacyKey: 'logistics_parsed_documents_v1', labelVi: 'Chứng Từ AI Document Parser' },
  { moduleKey: 'customer_dna', legacyKey: 'bogi_customer_dna_profiles_v1', labelVi: 'Hồ Sơ Customer DNA & Power Map' },
  { moduleKey: 'competitor_intel', legacyKey: 'bogi_custom_competitor_profiles', labelVi: 'Hồ Sơ Đối Thủ Cạnh Tranh' },
  { moduleKey: 'route_presets', legacyKey: 'bogi_custom_route_presets_v1', labelVi: 'Mẫu Tuyến Đường Tùy Chỉnh' },
  { moduleKey: 'route_preset_favorites', legacyKey: 'bogi_route_preset_favorites_v1', labelVi: 'Tuyến Đường Yêu Thích' },
  { moduleKey: 'multi_options', legacyKey: 'bogi_multi_option_quotation_packages', labelVi: 'Gói Báo Giá Đa Phương Án' },
  { moduleKey: 'offline_outbox', legacyKey: 'LOGIQUOTE_OFFLINE_OUTBOX_V1', labelVi: 'Hàng Đợi Đồng Bộ Offline' },
];

const LEGACY_PREF_KEYS = [
  'LOGISTICS_SIDEBAR_PINNED_FAVORITES_V1',
  'LOGISTICS_SIDEBAR_EXPANDED_GROUPS_V1',
  'LOGISTICS_SIDEBAR_COLLAPSED_V1',
  'LOGISTICS_SIDEBAR_MINIMAL_MODE',
  'bogi_workbench_layout_v2',
  'bogi_workbench_layout',
  'bogi_sales_hud_collapsed',
  'logistics_active_company_id',
];

function safeReadLegacyJson<T = any>(key: string): T | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function scanLegacyLocalStorageForCloudVault(): LegacyScanReport {
  const items: LegacyLocalStorageItemFound[] = [];
  let totalLegacyKeysFound = 0;
  let totalRecordsFound = 0;

  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return { totalLegacyKeysFound: 0, totalRecordsFound: 0, items: [] };
  }

  for (const map of LEGACY_ARRAY_MAPPINGS) {
    const rawStr = window.localStorage.getItem(map.legacyKey);
    if (rawStr !== null) {
      totalLegacyKeysFound++;
      const parsed = safeReadLegacyJson<any[]>(map.legacyKey);
      const realArr = Array.isArray(parsed)
        ? shouldFilterSyntheticForModule(map.moduleKey)
          ? filterRealArrayItems(parsed, true)
          : parsed
        : [];
      totalRecordsFound += realArr.length;
      items.push({
        moduleKey: map.moduleKey,
        legacyKeys: [map.legacyKey],
        labelVi: map.labelVi,
        recordCount: realArr.length,
        hasData: realArr.length > 0,
      });
    }
  }

  // Exchange Rate & Config
  const legacyRate = safeReadLegacyJson<any>('bogi_usd_live_exchange_rate');
  if (legacyRate && typeof legacyRate.rate === 'number') {
    totalLegacyKeysFound++;
    totalRecordsFound++;
    items.push({
      moduleKey: 'exchange_rate',
      legacyKeys: ['bogi_usd_live_exchange_rate'],
      labelVi: 'Tỷ Giá USD/VND Đã Lưu',
      recordCount: 1,
      hasData: true,
    });
  }

  const legacyExConfig = safeReadLegacyJson<any>('bogi_usd_exchange_rate_config');
  if (legacyExConfig && typeof legacyExConfig === 'object') {
    totalLegacyKeysFound++;
    totalRecordsFound++;
    items.push({
      moduleKey: 'exchange_config',
      legacyKeys: ['bogi_usd_exchange_rate_config'],
      labelVi: 'Cấu Hình Đồng Bộ Tỷ Giá',
      recordCount: 1,
      hasData: true,
    });
  }

  // UI Preferences bundle
  const foundPrefKeys = LEGACY_PREF_KEYS.filter((k) => window.localStorage.getItem(k) !== null);
  if (foundPrefKeys.length > 0) {
    totalLegacyKeysFound += foundPrefKeys.length;
    totalRecordsFound += foundPrefKeys.length;
    items.push({
      moduleKey: 'ui_preferences',
      legacyKeys: foundPrefKeys,
      labelVi: 'Tùy Chọn Giao Diện & Công Ty Mặc Định',
      recordCount: foundPrefKeys.length,
      hasData: true,
    });
  }

  return {
    totalLegacyKeysFound,
    totalRecordsFound,
    items,
  };
}

export async function migrateLegacyLocalStorageToCloudVault(
  workspaceId?: string
): Promise<LegacyMigrationResult> {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return {
      success: true,
      migratedModulesCount: 0,
      migratedRecordsCount: 0,
      clearedKeysCount: 0,
      errors: [],
      message: 'Môi trường không sử dụng LocalStorage.',
    };
  }

  const wsId = sanitizeWorkspaceId(workspaceId);
  // First make sure we have latest Cloud Vault data in memory before merging legacy items
  await hydrateCloudVault(wsId);

  let migratedModulesCount = 0;
  let migratedRecordsCount = 0;
  let clearedKeysCount = 0;
  const errors: string[] = [];

  // 1. Array modules
  for (const map of LEGACY_ARRAY_MAPPINGS) {
    const rawStr = window.localStorage.getItem(map.legacyKey);
    if (rawStr === null) continue;

    const parsed = safeReadLegacyJson<any[]>(map.legacyKey);
    const legacyArr = Array.isArray(parsed)
      ? shouldFilterSyntheticForModule(map.moduleKey)
        ? filterRealArrayItems(parsed, true)
        : parsed
      : [];

    if (legacyArr.length > 0) {
      const currentCloud = getModuleData<any[]>(map.moduleKey, []);
      const merged =
        map.moduleKey === 'route_preset_favorites'
          ? Array.from(new Set([...currentCloud, ...legacyArr]))
          : mergeArraysById(currentCloud, legacyArr);

      setModuleData(map.moduleKey, merged, { immediate: true, workspaceId: wsId });
      const ok = await flushModuleUpload(map.moduleKey, wsId);
      if (ok) {
        window.localStorage.removeItem(map.legacyKey);
        migratedModulesCount++;
        migratedRecordsCount += legacyArr.length;
        clearedKeysCount++;
      } else {
        errors.push(`Không thể tải ${map.labelVi} lên Firebase Storage.`);
      }
    } else {
      // Legacy key contained only empty/synthetic data -> clean it safely
      window.localStorage.removeItem(map.legacyKey);
      clearedKeysCount++;
    }
  }

  // 2. Exchange Rate & Config
  const legacyRate = safeReadLegacyJson<any>('bogi_usd_live_exchange_rate');
  if (window.localStorage.getItem('bogi_usd_live_exchange_rate') !== null) {
    if (legacyRate && typeof legacyRate.rate === 'number' && legacyRate.rate > 0) {
      const existingRate = getModuleData<any>('exchange_rate', null);
      if (!existingRate) {
        setModuleData('exchange_rate', legacyRate, { immediate: true, workspaceId: wsId });
        const ok = await flushModuleUpload('exchange_rate', wsId);
        if (ok) {
          window.localStorage.removeItem('bogi_usd_live_exchange_rate');
          migratedModulesCount++;
          migratedRecordsCount++;
          clearedKeysCount++;
        } else {
          errors.push('Không thể tải tỷ giá lên Firebase Storage.');
        }
      } else {
        window.localStorage.removeItem('bogi_usd_live_exchange_rate');
        clearedKeysCount++;
      }
    } else {
      window.localStorage.removeItem('bogi_usd_live_exchange_rate');
      clearedKeysCount++;
    }
  }

  const legacyExConfig = safeReadLegacyJson<any>('bogi_usd_exchange_rate_config');
  if (window.localStorage.getItem('bogi_usd_exchange_rate_config') !== null) {
    if (legacyExConfig && typeof legacyExConfig === 'object') {
      const currentCfg = getModuleData<any>('exchange_config', {});
      setModuleData('exchange_config', { ...legacyExConfig, ...currentCfg }, { immediate: true, workspaceId: wsId });
      const ok = await flushModuleUpload('exchange_config', wsId);
      if (ok) {
        window.localStorage.removeItem('bogi_usd_exchange_rate_config');
        migratedModulesCount++;
        migratedRecordsCount++;
        clearedKeysCount++;
      } else {
        errors.push('Không thể tải cấu hình tỷ giá lên Firebase Storage.');
      }
    } else {
      window.localStorage.removeItem('bogi_usd_exchange_rate_config');
      clearedKeysCount++;
    }
  }

  // 3. UI Preferences bundle
  const foundPrefKeys = LEGACY_PREF_KEYS.filter((k) => window.localStorage.getItem(k) !== null);
  if (foundPrefKeys.length > 0) {
    const currentPrefs = getUiPreferences();
    const patch: Partial<VaultUiPreferencesData> = {};

    const pinned = safeReadLegacyJson<string[]>('LOGISTICS_SIDEBAR_PINNED_FAVORITES_V1');
    if (Array.isArray(pinned) && !currentPrefs.pinnedNavIds) patch.pinnedNavIds = pinned;

    const expanded = safeReadLegacyJson<Record<string, boolean>>('LOGISTICS_SIDEBAR_EXPANDED_GROUPS_V1');
    if (expanded && typeof expanded === 'object' && !currentPrefs.expandedGroups) patch.expandedGroups = expanded;

    const minimalRaw = window.localStorage.getItem('LOGISTICS_SIDEBAR_MINIMAL_MODE');
    if (minimalRaw !== null && currentPrefs.sidebarMinimalMode === undefined) {
      patch.sidebarMinimalMode = minimalRaw === 'true';
    }

    const layoutRaw = window.localStorage.getItem('bogi_workbench_layout_v2') || window.localStorage.getItem('bogi_workbench_layout');
    if ((layoutRaw === 'SPLIT' || layoutRaw === 'STACKED') && !currentPrefs.workbenchLayout) {
      patch.workbenchLayout = layoutRaw;
    }

    const hudRaw = window.localStorage.getItem('bogi_sales_hud_collapsed');
    if (hudRaw !== null && currentPrefs.salesHudCollapsed === undefined) {
      patch.salesHudCollapsed = hudRaw === 'true';
    }

    const activeCompRaw = window.localStorage.getItem('logistics_active_company_id');
    if (activeCompRaw && !currentPrefs.activeCompanyId) {
      patch.activeCompanyId = activeCompRaw;
    }

    if (Object.keys(patch).length > 0) {
      setModuleData('ui_preferences', { ...currentPrefs, ...patch, updatedAt: new Date().toISOString() }, {
        immediate: true,
        workspaceId: wsId,
      });
    }

    const ok = Object.keys(patch).length === 0 || (await flushModuleUpload('ui_preferences', wsId));
    if (ok) {
      foundPrefKeys.forEach((k) => {
        window.localStorage.removeItem(k);
        clearedKeysCount++;
      });
      if (Object.keys(patch).length > 0) {
        migratedModulesCount++;
        migratedRecordsCount += Object.keys(patch).length;
      }
    } else {
      errors.push('Không thể tải tùy chọn giao diện lên Firebase Storage.');
    }
  }

  return {
    success: errors.length === 0,
    migratedModulesCount,
    migratedRecordsCount,
    clearedKeysCount,
    errors,
    message:
      errors.length === 0
        ? migratedRecordsCount > 0
          ? `Đã di cư thành công ${migratedRecordsCount} mục từ ${migratedModulesCount} phân hệ lên Firebase Storage và làm sạch ${clearedKeysCount} khóa LocalStorage cũ!`
          : `Đã dọn sạch ${clearedKeysCount} khóa LocalStorage rỗng/mẫu. 100% dữ liệu đang chạy trực tiếp trên Firebase Storage!`
        : `Di cư hoàn tất một phần với ${errors.length} cảnh báo.`,
  };
}
