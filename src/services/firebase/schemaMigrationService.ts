/**
 * Firestore Schema Versioning & Zero-Loss Auto-Migration Engine
 *
 * Architecture Principles:
 * 1. Decoupled Metadata Registry (`_schema_registry/{collectionName}`):
 *    Stores `currentSchemaVersion`, `minSupportedVersion`, `changelog`, and `migrationStatus`
 *    separately from business documents so queries remain fast and metadata is always inspectable.
 * 2. Per-Document `_schemaVersion` Tag:
 *    Every business document carries `_schemaVersion: number` (legacy docs default to v1).
 * 3. Backward-Compatible Read Adapter (`normalizeDocumentOnRead`):
 *    Automatically upgrades legacy payloads in-memory on read without mutating or deleting old fields.
 * 4. Non-Destructive Batch Migration (`runFirestoreSchemaMigration`):
 *    Upgrades legacy documents in Firestore safely using `writeBatch` + `{ merge: true }`
 *    and preserves legacy values inside `_legacyBackup` when field transformations occur.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid ?? null,
      email: auth?.currentUser?.email ?? null,
      emailVerified: auth?.currentUser?.emailVerified ?? null,
      isAnonymous: auth?.currentUser?.isAnonymous ?? null,
      tenantId: auth?.currentUser?.tenantId ?? null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const SCHEMA_REGISTRY_COLLECTION = '_schema_registry';

export type VersionedCollectionName =
  | 'quotes'
  | 'customers'
  | 'rateMasters'
  | 'surcharges'
  | 'chargeMasters'
  | 'contracts'
  | 'settings';

export const COLLECTION_SCHEMA_VERSIONS: Record<VersionedCollectionName, number> = {
  quotes: 3,
  customers: 2,
  rateMasters: 2,
  surcharges: 2,
  chargeMasters: 2,
  contracts: 2,
  settings: 2,
};

export interface SchemaChangelogEntry {
  fromVersion: number;
  toVersion: number;
  description: string;
  appliedAt: string;
}

export interface CollectionSchemaMetadata {
  collectionName: VersionedCollectionName;
  currentSchemaVersion: number;
  minSupportedVersion: number;
  lastMigratedAt: string;
  lastMigratedBy: string;
  migrationStatus: 'UP_TO_DATE' | 'MIGRATING' | 'PENDING_UPGRADE';
  totalDocumentsScanned: number;
  totalDocumentsMigrated: number;
  changelog: SchemaChangelogEntry[];
}

export interface CollectionMigrationReport {
  collectionName: VersionedCollectionName;
  targetVersion: number;
  previousRegistryVersion: number;
  scannedCount: number;
  migratedCount: number;
  skippedCount: number;
  status: 'UP_TO_DATE' | 'MIGRATED' | 'OFFLINE' | 'ERROR';
  error?: string;
}

export interface FullMigrationSummary {
  executedAt: string;
  totalMigratedDocuments: number;
  collections: CollectionMigrationReport[];
}

const SCHEMA_DESCRIPTIONS: Record<VersionedCollectionName, string> = {
  quotes: 'v3: Chuẩn hóa trường tài chính USD/VND, salesStage, quoteVersion & giữ nguyên dữ liệu cũ',
  customers: 'v2: Chuẩn hóa phân khúc segment, syncSource, hạn mức công nợ & bảo lưu mã cũ',
  rateMasters: 'v2: Chuẩn hóa trạng thái biểu cước status, version & tiền tệ mặc định',
  surcharges: 'v2: Chuẩn hóa danh mục phụ phí category, location & thuế suất vatRate',
  chargeMasters: 'v2: Chuẩn hóa mã phụ phí chuẩn & định mức đơn vị tính',
  contracts: 'v2: Chuẩn hóa version hợp đồng, ngày hiệu lực & kiểm soát trạng thái',
  settings: 'v2: Chuẩn hóa cấu hình doanh nghiệp đa tiền tệ & tỷ giá mặc định',
};

/**
 * Pure, idempotent, non-destructive per-document transformer.
 * NEVER removes existing keys from legacy documents; only fills missing defaults,
 * normalizes types safely, and stamps `_schemaVersion`.
 */
export function migrateDocumentPayload<T extends Record<string, any>>(
  collectionName: VersionedCollectionName,
  rawDoc: T
): { migrated: T & { _schemaVersion: number; _migratedAt?: string; _migratedFromVersion?: number }; didUpgrade: boolean; fromVersion: number } {
  const targetVersion = COLLECTION_SCHEMA_VERSIONS[collectionName];
  const currentVersion = typeof rawDoc._schemaVersion === 'number' ? rawDoc._schemaVersion : 1;

  if (currentVersion >= targetVersion) {
    return {
      migrated: rawDoc as T & { _schemaVersion: number },
      didUpgrade: false,
      fromVersion: currentVersion,
    };
  }

  // Shallow clone preserving 100% of legacy fields
  const next: Record<string, any> = { ...rawDoc };
  const legacySnapshot: Record<string, any> = next._legacyBackup ? { ...next._legacyBackup } : {};

  if (collectionName === 'quotes') {
    // v1 -> v2: Ensure nested objects & baseline defaults exist without touching old values
    if (!next.terms || typeof next.terms !== 'object') {
      next.terms = {
        paymentTerm: next.paymentTerm || '30 ngày sau ngày phát hành hóa đơn',
        validityDate: next.validityDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        incoterm: next.incoterm || 'CIF',
      };
      if (next.paymentTerm !== undefined) legacySnapshot.paymentTerm = next.paymentTerm;
    }
    if (!next.shipment || typeof next.shipment !== 'object') {
      next.shipment = {
        mode: next.mode || 'SEA_FCL',
        origin: next.origin || '',
        destination: next.destination || '',
      };
    }
    if (!next.currency) {
      next.currency = 'USD';
    }
    if (!next.salesStage) {
      next.salesStage = next.status === 'ACCEPTED' ? 'WON' : next.status === 'REJECTED' ? 'LOST' : 'QUOTING';
    }

    // v2 -> v3: Guarantee numeric financial totals, exchangeRate & quoteVersion
    if (typeof next.grandTotalUsd !== 'number') {
      legacySnapshot.grandTotalUsd = next.grandTotalUsd;
      next.grandTotalUsd = Number(next.grandTotalUsd) || 0;
    }
    if (typeof next.grandTotalVnd !== 'number') {
      legacySnapshot.grandTotalVnd = next.grandTotalVnd;
      next.grandTotalVnd = Number(next.grandTotalVnd) || 0;
    }
    if (typeof next.exchangeRate !== 'number' || next.exchangeRate <= 0) {
      next.exchangeRate = 25450;
    }
    if (typeof next.quoteVersion !== 'number') {
      next.quoteVersion = 1;
    }
    if (!Array.isArray(next.items)) {
      next.items = [];
    }
  } else if (collectionName === 'customers') {
    if (!next.companyName && next.customerName) {
      next.companyName = next.customerName;
    }
    if (!next.customerName && next.companyName) {
      next.customerName = next.companyName;
    }
    if (!next.segment) {
      next.segment = 'STANDARD';
    }
    if (!next.syncSource) {
      next.syncSource = 'CRM_LEGACY_MIGRATED';
    }
    if (!next.creditStatus) {
      next.creditStatus = 'NORMAL';
    }
  } else if (collectionName === 'rateMasters') {
    if (!next.status) next.status = 'ACTIVE';
    if (typeof next.version !== 'number') next.version = 1;
    if (!next.currency) next.currency = 'USD';
  } else if (collectionName === 'surcharges' || collectionName === 'chargeMasters') {
    if (!next.currency) next.currency = 'USD';
    if (typeof next.vatRate !== 'number') next.vatRate = 0;
    if (!next.location) next.location = 'POL';
    if (!next.category) next.category = 'LOCAL_CHARGE';
  } else if (collectionName === 'contracts') {
    if (typeof next.currentVersion !== 'number') next.currentVersion = 1;
    if (!next.status) next.status = 'ACTIVE';
    if (!next.currency) next.currency = 'USD';
  } else if (collectionName === 'settings') {
    if (typeof next.version !== 'number') next.version = 1;
    if (!next.defaultCurrency) next.defaultCurrency = 'USD';
  }

  if (Object.keys(legacySnapshot).length > 0) {
    next._legacyBackup = legacySnapshot;
  }

  const nowIso = new Date().toISOString();
  next._schemaVersion = targetVersion;
  next._migratedFromVersion = currentVersion;
  next._migratedAt = nowIso;

  return {
    migrated: next as T & { _schemaVersion: number; _migratedAt: string; _migratedFromVersion: number },
    didUpgrade: true,
    fromVersion: currentVersion,
  };
}

/**
 * Synchronous read-time adapter so legacy documents work instantly in UI even before batch migration finishes.
 */
export function normalizeDocumentOnRead<T extends Record<string, any>>(
  collectionName: VersionedCollectionName,
  rawDoc: T
): T {
  const { migrated } = migrateDocumentPayload(collectionName, rawDoc);
  return migrated;
}

/**
 * Reads the decoupled schema metadata document from `_schema_registry/{collectionName}`.
 */
export async function getCollectionSchemaMetadata(
  collectionName: VersionedCollectionName
): Promise<CollectionSchemaMetadata | null> {
  if (!db) return null;
  const registryPath = `${SCHEMA_REGISTRY_COLLECTION}/${collectionName}`;
  try {
    const snap = await getDoc(doc(db, SCHEMA_REGISTRY_COLLECTION, collectionName));
    if (snap.exists()) {
      return snap.data() as CollectionSchemaMetadata;
    }
    return null;
  } catch (error: any) {
    if (String(error?.message || '').toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.GET, registryPath);
    }
    console.warn(`[schemaMigration] Unable to read metadata for ${collectionName}:`, error);
    return null;
  }
}

/**
 * Fetches all schema registry metadata documents for monitoring in Integrity Dashboard.
 */
export async function getAllCollectionSchemaMetadata(): Promise<CollectionSchemaMetadata[]> {
  const allCollections = Object.keys(COLLECTION_SCHEMA_VERSIONS) as VersionedCollectionName[];
  if (!db) {
    return allCollections.map((name) => ({
      collectionName: name,
      currentSchemaVersion: COLLECTION_SCHEMA_VERSIONS[name],
      minSupportedVersion: 1,
      lastMigratedAt: new Date().toISOString(),
      lastMigratedBy: 'local_offline',
      migrationStatus: 'UP_TO_DATE',
      totalDocumentsScanned: 0,
      totalDocumentsMigrated: 0,
      changelog: [],
    }));
  }

  try {
    const snap = await getDocs(collection(db, SCHEMA_REGISTRY_COLLECTION));
    const map = new Map<string, CollectionSchemaMetadata>();
    snap.forEach((d) => {
      map.set(d.id, d.data() as CollectionSchemaMetadata);
    });

    return allCollections.map((name) => {
      const existing = map.get(name);
      if (existing) return existing;
      return {
        collectionName: name,
        currentSchemaVersion: 1,
        minSupportedVersion: 1,
        lastMigratedAt: '',
        lastMigratedBy: 'uninitialized',
        migrationStatus: 'PENDING_UPGRADE',
        totalDocumentsScanned: 0,
        totalDocumentsMigrated: 0,
        changelog: [],
      };
    });
  } catch (error: any) {
    if (String(error?.message || '').toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, SCHEMA_REGISTRY_COLLECTION);
    }
    console.warn('[schemaMigration] List schema registry fallback:', error);
    return [];
  }
}

/**
 * Runs non-destructive migration for a single collection if its `_schema_registry` version
 * lags behind `COLLECTION_SCHEMA_VERSIONS[collectionName]` or un-versioned docs exist.
 */
export async function migrateCollectionIfNeeded(
  collectionName: VersionedCollectionName,
  options: { forceScan?: boolean; actor?: string } = {}
): Promise<CollectionMigrationReport> {
  const targetVersion = COLLECTION_SCHEMA_VERSIONS[collectionName];
  if (!db) {
    return {
      collectionName,
      targetVersion,
      previousRegistryVersion: 1,
      scannedCount: 0,
      migratedCount: 0,
      skippedCount: 0,
      status: 'OFFLINE',
    };
  }

  const actor = options.actor || auth?.currentUser?.email || auth?.currentUser?.uid || 'auto_schema_engine';
  const existingMeta = await getCollectionSchemaMetadata(collectionName);
  const previousRegistryVersion = existingMeta?.currentSchemaVersion ?? 1;

  // Fast-path: Skip collection scan if metadata registry already matches target version and forceScan is false
  if (!options.forceScan && existingMeta && existingMeta.currentSchemaVersion >= targetVersion && existingMeta.migrationStatus === 'UP_TO_DATE') {
    return {
      collectionName,
      targetVersion,
      previousRegistryVersion: existingMeta.currentSchemaVersion,
      scannedCount: 0,
      migratedCount: 0,
      skippedCount: 0,
      status: 'UP_TO_DATE',
    };
  }

  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const docsToUpdate: Array<{ id: string; payload: Record<string, any> }> = [];

    snapshot.forEach((docSnap) => {
      const rawData = docSnap.data();
      const { migrated, didUpgrade } = migrateDocumentPayload(collectionName, rawData);
      if (didUpgrade) {
        docsToUpdate.push({
          id: docSnap.id,
          payload: {
            ...migrated,
            _updatedAt: serverTimestamp(),
          },
        });
      }
    });

    // Mark metadata as MIGRATING if updates are pending
    const registryRef = doc(db, SCHEMA_REGISTRY_COLLECTION, collectionName);
    if (docsToUpdate.length > 0) {
      await setDoc(
        registryRef,
        {
          collectionName,
          currentSchemaVersion: previousRegistryVersion,
          minSupportedVersion: 1,
          migrationStatus: 'MIGRATING',
          lastMigratedBy: actor,
          _updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Commit in safe chunks of 350 (well below Firestore 500 write limit) using merge: true
      const CHUNK_SIZE = 350;
      for (let i = 0; i < docsToUpdate.length; i += CHUNK_SIZE) {
        const chunk = docsToUpdate.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        for (const item of chunk) {
          batch.set(doc(db, collectionName, item.id), item.payload, { merge: true });
        }
        await batch.commit();
      }
    }

    const nowIso = new Date().toISOString();
    const prevChangelog = Array.isArray(existingMeta?.changelog) ? existingMeta.changelog : [];
    const nextChangelog: SchemaChangelogEntry[] =
      previousRegistryVersion < targetVersion || docsToUpdate.length > 0
        ? [
            ...prevChangelog.slice(-9),
            {
              fromVersion: previousRegistryVersion,
              toVersion: targetVersion,
              description: SCHEMA_DESCRIPTIONS[collectionName],
              appliedAt: nowIso,
            },
          ]
        : prevChangelog;

    await setDoc(
      registryRef,
      {
        collectionName,
        currentSchemaVersion: targetVersion,
        minSupportedVersion: 1,
        lastMigratedAt: nowIso,
        lastMigratedBy: actor,
        migrationStatus: 'UP_TO_DATE',
        totalDocumentsScanned: snapshot.size,
        totalDocumentsMigrated: docsToUpdate.length,
        changelog: nextChangelog,
        _updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      collectionName,
      targetVersion,
      previousRegistryVersion,
      scannedCount: snapshot.size,
      migratedCount: docsToUpdate.length,
      skippedCount: snapshot.size - docsToUpdate.length,
      status: docsToUpdate.length > 0 ? 'MIGRATED' : 'UP_TO_DATE',
    };
  } catch (error: any) {
    if (String(error?.message || '').toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.WRITE, collectionName);
    }
    console.warn(`[schemaMigration] Collection ${collectionName} migration notice:`, error);
    return {
      collectionName,
      targetVersion,
      previousRegistryVersion,
      scannedCount: 0,
      migratedCount: 0,
      skippedCount: 0,
      status: 'ERROR',
      error: error?.message || String(error),
    };
  }
}

/**
 * Runs schema version check & auto-migration across all core Firestore collections.
 * Safe, idempotent, and zero-lag when collections are already at target schema version.
 */
export async function runFirestoreSchemaMigration(
  options: { forceScan?: boolean; actor?: string } = {}
): Promise<FullMigrationSummary> {
  const collections = Object.keys(COLLECTION_SCHEMA_VERSIONS) as VersionedCollectionName[];
  const reports: CollectionMigrationReport[] = [];

  for (const colName of collections) {
    const report = await migrateCollectionIfNeeded(colName, options);
    reports.push(report);
  }

  const totalMigratedDocuments = reports.reduce((acc, r) => acc + r.migratedCount, 0);

  return {
    executedAt: new Date().toISOString(),
    totalMigratedDocuments,
    collections: reports,
  };
}
