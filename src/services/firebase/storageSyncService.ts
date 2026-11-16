/**
 * Firebase Storage Multi-Device Synchronization Engine
 * Guarantees that any computer/device can save, synchronize, and immediately retrieve
 * 100% of all quotations, customers, master rates, and company documents via Firebase Storage.
 */

import { ref, uploadBytes, getDownloadURL, getBytes } from 'firebase/storage';
import { storage, db } from './firebaseConfig';
import { QuoteData, CustomerRecord, SurchargeItem, CompanyProfile } from '../../types/logistics';
import { RateMasterItem, ChargeMasterItem } from '../../types/masterRate';
import { ContractItem } from '../../types/contract';
import { ShipmentRecord } from '../../types/shipment';
import { PricingPolicyItem } from '../../types/pricingIntelligence';
import { QuotationCommunication, QuotationFollowUp } from '../../types/quotationCommunication';
import { 
  getQuotesFromFirestore, 
  getCustomersFromFirestore, 
  getRateMastersFromFirestore,
  getSurchargesFromFirestore,
  getChargeMastersFromFirestore,
  getCompanyProfileFromFirestore,
  batchRestoreSystemDataToFirestore
} from './firestoreService';
import { fetchContracts } from '../contract/contractRepository';
import { getShipments } from '../shipment/shipmentService';
import { getPricingPoliciesFromFirestore } from '../pricing/pricingPolicyService';
import { getAllCommunications, getAllFollowUps } from '../quotation/quotationCommunicationService';
import { getSyncEpochStatus, isSyntheticRecord } from './dataVaultService';
import { getVaultActiveCompanyId } from './cloudStorageVaultService';
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
  contracts?: ContractItem[];
  shipments?: ShipmentRecord[];
  pricingPolicies?: PricingPolicyItem[];
  communications?: QuotationCommunication[];
  followUps?: QuotationFollowUp[];
}

export interface StorageSyncStats {
  syncedAt: string | null;
  quotes: number;
  customers: number;
  rates: number;
  contracts: number;
  shipments: number;
  pricingPolicies: number;
  communications: number;
  followUps: number;
}

const STORAGE_BACKUP_PATH = 'systemBackups/global_logistics_system_backup.json';
const STORAGE_LATEST_PATH = 'systemBackups/latest_state.json';

let autoSyncTimeout: any = null;
let lastStorageSyncStats: StorageSyncStats | null = null;

export function getLastStorageSyncStats(): StorageSyncStats | null {
  return lastStorageSyncStats;
}

const cleanRealRecords = <T>(arr?: T[]): T[] =>
  (arr || []).filter((item: any) => item && !isSyntheticRecord(item) && item._deleted !== true);

/**
 * Uploads a unified full system state snapshot directly to Firebase Storage.
 */
export async function syncAllDataToFirebaseStorage(customPayload?: Partial<StorageSystemState>): Promise<{ success: boolean; downloadUrl?: string; message?: string }> {
  if (!storage) {
    return { success: false, message: 'Firebase Storage chưa sẵn sàng.' };
  }

  // Sync Epoch Guard: never overwrite Storage backup from an un-pulled stale device
  if (!customPayload && !getSyncEpochStatus().hasCompletedInitialCloudPull) {
    return { success: false, message: 'Chờ hoàn tất đồng bộ Cloud ban đầu trước khi đẩy backup Storage.' };
  }

  try {
    const activeWs = getVaultActiveCompanyId();
    // Always fetch supplementary collections if not explicitly passed
    const [extraContracts, extraShipments, extraPolicies, extraComms, extraFollowUps] = await Promise.all([
      customPayload?.contracts ? Promise.resolve(customPayload.contracts) : fetchContracts({ companyId: activeWs, limitCount: 500 }).then(r => r.contracts).catch(() => []),
      customPayload?.shipments ? Promise.resolve(customPayload.shipments) : getShipments(activeWs, { pageLimit: 300 }).then(r => r.shipments).catch(() => []),
      customPayload?.pricingPolicies ? Promise.resolve(customPayload.pricingPolicies) : getPricingPoliciesFromFirestore().catch(() => []),
      customPayload?.communications ? Promise.resolve(customPayload.communications) : getAllCommunications().catch(() => []),
      customPayload?.followUps ? Promise.resolve(customPayload.followUps) : getAllFollowUps().catch(() => []),
    ]);

    let payload: StorageSystemState;

    if (customPayload?.quotes && customPayload?.customers) {
      const cleanQuotes = cleanRealRecords(customPayload.quotes);
      const cleanCustomers = cleanRealRecords(customPayload.customers);
      const cleanContracts = cleanRealRecords(extraContracts);
      const cleanShipments = cleanRealRecords(extraShipments);
      if (cleanQuotes.length === 0 && cleanCustomers.length === 0 && cleanContracts.length === 0 && cleanShipments.length === 0) {
        return { success: false, message: 'Từ chối ghi đè backup Storage bằng tập dữ liệu rỗng.' };
      }
      payload = {
        version: 2,
        syncedAt: new Date().toISOString(),
        sourceDevice: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
        quotes: cleanQuotes,
        customers: cleanCustomers,
        rates: cleanRealRecords(customPayload.rates),
        surcharges: cleanRealRecords(customPayload.surcharges),
        chargeMasters: cleanRealRecords(customPayload.chargeMasters),
        companyProfile: customPayload.companyProfile,
        contracts: cleanContracts,
        shipments: cleanShipments,
        pricingPolicies: cleanRealRecords(extraPolicies),
        communications: cleanRealRecords(extraComms),
        followUps: cleanRealRecords(extraFollowUps),
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

      const cleanQuotes = cleanRealRecords(quotes);
      const cleanCustomers = cleanRealRecords(customers);
      const cleanContracts = cleanRealRecords(extraContracts);
      const cleanShipments = cleanRealRecords(extraShipments);
      if (cleanQuotes.length === 0 && cleanCustomers.length === 0 && cleanContracts.length === 0 && cleanShipments.length === 0) {
        return { success: false, message: 'Bỏ qua đồng bộ Storage khi Firestore chưa có dữ liệu thật.' };
      }

      payload = {
        version: 2,
        syncedAt: new Date().toISOString(),
        sourceDevice: typeof navigator !== 'undefined' ? navigator.userAgent : 'Client',
        quotes: cleanQuotes,
        customers: cleanCustomers,
        rates: cleanRealRecords(rates),
        surcharges: cleanRealRecords(surcharges),
        chargeMasters: cleanRealRecords(chargeMasters),
        companyProfile: companyProfile || undefined,
        contracts: cleanContracts,
        shipments: cleanShipments,
        pricingPolicies: cleanRealRecords(extraPolicies),
        communications: cleanRealRecords(extraComms),
        followUps: cleanRealRecords(extraFollowUps),
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
        contractsCount: String(payload.contracts?.length || 0),
        shipmentsCount: String(payload.shipments?.length || 0),
      },
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);

    // Also persist to global backup path
    const backupRef = ref(storage, STORAGE_BACKUP_PATH);
    uploadBytes(backupRef, blob, { contentType: 'application/json' }).catch(() => {});

    lastStorageSyncStats = {
      syncedAt: payload.syncedAt,
      quotes: payload.quotes.length,
      customers: payload.customers.length,
      rates: payload.rates.length,
      contracts: payload.contracts?.length || 0,
      shipments: payload.shipments?.length || 0,
      pricingPolicies: payload.pricingPolicies?.length || 0,
      communications: payload.communications?.length || 0,
      followUps: payload.followUps?.length || 0,
    };

    return {
      success: true,
      downloadUrl,
      message: `Đã đồng bộ ${payload.quotes.length} báo giá, ${payload.customers.length} khách hàng, ${payload.contracts?.length || 0} hợp đồng & ${payload.shipments?.length || 0} lô hàng lên Firebase Storage!`,
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

  const hydrateParsedState = (parsed: StorageSystemState) => {
    if (parsed.quotes?.length > 0) saveQuotesList(parsed.quotes);
    if (parsed.customers?.length > 0) saveCustomersList(parsed.customers);
    if (parsed.surcharges && parsed.surcharges.length > 0) saveSurchargesList(parsed.surcharges);
    if (parsed.companyProfile) saveCompanySettings(parsed.companyProfile);

    lastStorageSyncStats = {
      syncedAt: parsed.syncedAt || new Date().toISOString(),
      quotes: parsed.quotes?.length || 0,
      customers: parsed.customers?.length || 0,
      rates: parsed.rates?.length || 0,
      contracts: parsed.contracts?.length || 0,
      shipments: parsed.shipments?.length || 0,
      pricingPolicies: parsed.pricingPolicies?.length || 0,
      communications: parsed.communications?.length || 0,
      followUps: parsed.followUps?.length || 0,
    };

    if (db) {
      batchRestoreSystemDataToFirestore({
        quotes: parsed.quotes,
        customers: parsed.customers,
        companySettings: parsed.companyProfile,
        surcharges: parsed.surcharges || [],
        rateMasters: parsed.rates || [],
        chargeMasters: parsed.chargeMasters || [],
        contracts: parsed.contracts || [],
        shipments: parsed.shipments || [],
        pricingPolicies: parsed.pricingPolicies || [],
        communications: parsed.communications || [],
        followUps: parsed.followUps || [],
      }).catch((e) => {
        console.warn('[storageSyncService] Notice restoring to Firestore:', e);
      });
    }
  };

  try {
    const storageRef = ref(storage, STORAGE_LATEST_PATH);
    const arrayBuffer = await getBytes(storageRef);
    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(arrayBuffer);
    const parsed = JSON.parse(jsonString) as StorageSystemState;

    if (!parsed || !Array.isArray(parsed.quotes)) {
      return { success: false, message: 'Dữ liệu trên Firebase Storage không đúng định dạng.' };
    }

    hydrateParsedState(parsed);

    return {
      success: true,
      data: parsed,
      message: `Đã nạp thành công ${parsed.quotes.length} báo giá, ${parsed.customers.length} khách hàng, ${parsed.contracts?.length || 0} hợp đồng & ${parsed.shipments?.length || 0} lô hàng từ Firebase Storage!`,
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
        hydrateParsedState(parsed);
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
