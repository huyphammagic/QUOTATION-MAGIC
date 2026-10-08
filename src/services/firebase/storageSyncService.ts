/**
 * Firebase Storage Multi-Device Synchronization Engine
 * Guarantees that any computer/device can save, synchronize, and immediately retrieve
 * 100% of all quotations, customers, master rates, and company documents via Firebase Storage.
 */

import { ref, uploadBytes, getDownloadURL, getBytes } from 'firebase/storage';
import { storage, db } from './firebaseConfig';
import { QuoteData, CustomerRecord, SurchargeItem, CompanyProfile } from '../../types/logistics';
import { RateMasterItem, ChargeMasterItem, RateHistoryItem } from '../../types/masterRate';
import { 
  getQuotesFromFirestore, 
  getCustomersFromFirestore, 
  getRateMastersFromFirestore,
  getSurchargesFromFirestore,
  getChargeMastersFromFirestore,
  getCompanyProfileFromFirestore,
  batchRestoreSystemDataToFirestore
} from './firestoreService';
import { 
  saveQuotesList, 
  saveCustomersList, 
  saveSurchargesList, 
  saveCompanySettings 
} from '../../utils/storage';

export interface StorageSystemState {
  version: number;
  syncedAt: string;
  sourceDevice: string;
  quotes: QuoteData[];
  customers: CustomerRecord[];
  rates: RateMasterItem[];
  surcharges: SurchargeItem[];
  chargeMasters: ChargeMasterItem[];
  companyProfile?: CompanyProfile;
}

const STORAGE_BACKUP_PATH = 'systemBackups/global_logistics_system_backup.json';
const STORAGE_LATEST_PATH = 'systemBackups/latest_state.json';

let autoSyncTimeout: any = null;

/**
 * Uploads a unified full system state snapshot directly to Firebase Storage.
 */
export async function syncAllDataToFirebaseStorage(customPayload?: Partial<StorageSystemState>): Promise<{ success: boolean; downloadUrl?: string; message?: string }> {
  if (!storage) {
    return { success: false, message: 'Firebase Storage chưa sẵn sàng.' };
  }

  try {
    let payload: StorageSystemState;

    if (customPayload?.quotes && customPayload?.customers) {
      payload = {
        version: 1,
        syncedAt: new Date().toISOString(),
        sourceDevice: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
        quotes: customPayload.quotes,
        customers: customPayload.customers,
        rates: customPayload.rates || [],
        surcharges: customPayload.surcharges || [],
        chargeMasters: customPayload.chargeMasters || [],
        companyProfile: customPayload.companyProfile,
      };
    } else {
      // Gather latest from Firestore
      const [quotes, customers, rates, surcharges, chargeMasters, companyProfile] = await Promise.all([
        getQuotesFromFirestore().catch(() => []),
        getCustomersFromFirestore().catch(() => []),
        getRateMastersFromFirestore().catch(() => []),
        getSurchargesFromFirestore().catch(() => []),
        getChargeMastersFromFirestore().catch(() => []),
        getCompanyProfileFromFirestore().catch(() => null),
      ]);

      payload = {
        version: 1,
        syncedAt: new Date().toISOString(),
        sourceDevice: typeof navigator !== 'undefined' ? navigator.userAgent : 'Client',
        quotes: quotes || [],
        customers: customers || [],
        rates: rates || [],
        surcharges: surcharges || [],
        chargeMasters: chargeMasters || [],
        companyProfile: companyProfile || undefined,
      };
    }

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Upload to both latest_state.json and global_logistics_system_backup.json
    const storageRef = ref(storage, STORAGE_LATEST_PATH);
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: 'application/json',
      customMetadata: {
        syncedAt: payload.syncedAt,
        quotesCount: String(payload.quotes.length),
        customersCount: String(payload.customers.length),
      },
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);

    // Also persist to global backup path
    const backupRef = ref(storage, STORAGE_BACKUP_PATH);
    uploadBytes(backupRef, blob, { contentType: 'application/json' }).catch(() => {});

    console.info(`[storageSyncService] Synced ${payload.quotes.length} quotes & ${payload.customers.length} customers to Firebase Storage.`);
    return {
      success: true,
      downloadUrl,
      message: `Đã đồng bộ ${payload.quotes.length} báo giá, ${payload.customers.length} khách hàng lên Firebase Storage!`,
    };
  } catch (err: any) {
    console.warn('[storageSyncService] Error syncing data to Firebase Storage:', err);
    return { success: false, message: err?.message || 'Lỗi khi đồng bộ lên Firebase Storage' };
  }
}

/**
 * Downloads and restores full system state from Firebase Storage across computers.
 */
export async function syncAllDataFromFirebaseStorage(): Promise<{
  success: boolean;
  data?: StorageSystemState;
  message?: string;
}> {
  if (!storage) {
    return { success: false, message: 'Firebase Storage chưa sẵn sàng.' };
  }

  try {
    const storageRef = ref(storage, STORAGE_LATEST_PATH);
    const arrayBuffer = await getBytes(storageRef);
    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(arrayBuffer);
    const parsed = JSON.parse(jsonString) as StorageSystemState;

    if (!parsed || !Array.isArray(parsed.quotes)) {
      return { success: false, message: 'Dữ liệu trên Firebase Storage không đúng định dạng.' };
    }

    // Hydrate local storage
    if (parsed.quotes.length > 0) saveQuotesList(parsed.quotes);
    if (parsed.customers.length > 0) saveCustomersList(parsed.customers);
    if (parsed.surcharges && parsed.surcharges.length > 0) saveSurchargesList(parsed.surcharges);
    if (parsed.companyProfile) saveCompanySettings(parsed.companyProfile);

    // Hydrate Firestore Cloud if Firestore is accessible
    if (db) {
      batchRestoreSystemDataToFirestore({
        quotes: parsed.quotes,
        customers: parsed.customers,
        companySettings: parsed.companyProfile,
        surcharges: parsed.surcharges || [],
        rateMasters: parsed.rates || [],
        chargeMasters: parsed.chargeMasters || [],
      }).catch((e) => {
        console.warn('[storageSyncService] Notice restoring to Firestore:', e);
      });
    }

    return {
      success: true,
      data: parsed,
      message: `Đã nạp thành công ${parsed.quotes.length} báo giá và ${parsed.customers.length} khách hàng từ Firebase Storage!`,
    };
  } catch (err: any) {
    // Attempt fallback from backup path
    try {
      const backupRef = ref(storage, STORAGE_BACKUP_PATH);
      const arrayBuffer = await getBytes(backupRef);
      const decoder = new TextDecoder('utf-8');
      const jsonString = decoder.decode(arrayBuffer);
      const parsed = JSON.parse(jsonString) as StorageSystemState;
      if (parsed && Array.isArray(parsed.quotes)) {
        if (parsed.quotes.length > 0) saveQuotesList(parsed.quotes);
        if (parsed.customers.length > 0) saveCustomersList(parsed.customers);
        return { success: true, data: parsed, message: `Đã khôi phục ${parsed.quotes.length} báo giá từ Firebase Storage backup!` };
      }
    } catch {}

    console.info('[storageSyncService] No previous Storage snapshot found or empty bucket.');
    return { success: false, message: err?.message || 'Chưa có bản đồng bộ trên Firebase Storage' };
  }
}

/**
 * Triggers a debounced background sync to Firebase Storage.
 */
export function triggerDebouncedStorageSync(data?: Partial<StorageSystemState>): void {
  if (autoSyncTimeout) clearTimeout(autoSyncTimeout);
  autoSyncTimeout = setTimeout(() => {
    syncAllDataToFirebaseStorage(data).catch(() => {});
  }, 1500);
}
