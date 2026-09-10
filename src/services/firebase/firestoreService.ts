import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  Timestamp,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { QuoteData, CustomerRecord, SurchargeItem, CompanyProfile } from '../../types/logistics';
import { 
  RateMasterItem, 
  ChargeMasterItem, 
  RateHistoryItem,
  SupplierItem,
  CarrierItem,
  RateApprovalRequest,
  RateRequestItem,
  BulkImportJob,
  MissingRateEvent
} from '../../types/masterRate';
import { 
  loadSavedQuotes, 
  saveQuotesList, 
  loadSavedCustomers, 
  saveCustomersList, 
  loadSavedSurcharges, 
  saveSurchargesList, 
  loadCompanyProfile, 
  saveCompanyProfile,
  getSavedRateMasters,
  saveRateMasterItem,
  deleteRateMasterItem,
  getSavedChargeMasters,
  saveChargeMasterItem,
  deleteChargeMasterItem,
  getSavedRateHistories,
  addRateHistoryItem
} from '../../utils/storage';
import { syncHealthService } from '../integrity/syncHealthService';

const COLLECTIONS = {
  QUOTES: 'quotes',
  CUSTOMERS: 'customers',
  SURCHARGES: 'surcharges',
  RATE_MASTERS: 'rateMasters',
  CHARGE_MASTERS: 'chargeMasters',
  RATE_HISTORIES: 'rateHistories',
  SETTINGS: 'settings',
  SUPPLIERS: 'suppliers',
  CARRIERS: 'carriers',
  RATE_APPROVALS: 'rateApprovals',
  RATE_REQUESTS: 'rateRequests',
  IMPORT_JOBS: 'importJobs',
  MISSING_RATE_EVENTS: 'missingRateEvents',
};

/**
 * =========================================================================
 * 1. QUOTES CRUD WITH FIRESTORE
 * =========================================================================
 */

export async function saveQuoteToFirestore(quote: QuoteData): Promise<void> {
  // Always update local cache first
  const localQuotes = loadSavedQuotes();
  const index = localQuotes.findIndex(q => q.id === quote.id);
  let updatedList: QuoteData[];
  if (index >= 0) {
    updatedList = [...localQuotes];
    updatedList[index] = quote;
  } else {
    updatedList = [quote, ...localQuotes];
  }
  saveQuotesList(updatedList);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.QUOTES, quote.id);
    await setDoc(docRef, {
      ...quote,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore quote save sync notice (saved locally):', error);
  }
}

export async function getQuotesFromFirestore(): Promise<QuoteData[]> {
  if (!db) {
    return loadSavedQuotes();
  }

  try {
    const q = query(collection(db, COLLECTIONS.QUOTES));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: QuoteData[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as QuoteData;
        items.push({ ...data, id: docSnap.id });
      });
      // Sort by updatedDate or createdDate desc
      items.sort((a, b) => (b.updatedDate || b.createdDate || '').localeCompare(a.updatedDate || a.createdDate || ''));
      saveQuotesList(items);
      return items;
    }
  } catch (error) {
    console.warn('Firestore load quotes fallback to local storage:', error);
  }

  return loadSavedQuotes();
}

export async function deleteQuoteFromFirestore(id: string): Promise<void> {
  const localQuotes = loadSavedQuotes().filter(q => q.id !== id);
  saveQuotesList(localQuotes);

  if (!db) return;

  try {
    await deleteDoc(doc(db, COLLECTIONS.QUOTES, id));
  } catch (error) {
    console.warn('Firestore delete quote error:', error);
  }
}

/**
 * =========================================================================
 * 2. CUSTOMERS CRUD WITH FIRESTORE
 * =========================================================================
 */

export async function saveCustomerToFirestore(customer: CustomerRecord): Promise<void> {
  const local = loadSavedCustomers();
  const idx = local.findIndex(c => c.id === customer.id);
  const updated = idx >= 0 ? local.map((c, i) => i === idx ? customer : c) : [customer, ...local];
  saveCustomersList(updated);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, customer.id);
    await setDoc(docRef, {
      ...customer,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore customer save notice:', error);
  }
}

export async function getCustomersFromFirestore(): Promise<CustomerRecord[]> {
  if (!db) {
    return loadSavedCustomers();
  }

  try {
    const q = query(collection(db, COLLECTIONS.CUSTOMERS));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: CustomerRecord[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as CustomerRecord, id: docSnap.id });
      });
      saveCustomersList(items);
      return items;
    }
  } catch (error) {
    console.warn('Firestore load customers fallback to local:', error);
  }

  return loadSavedCustomers();
}

export async function deleteCustomerFromFirestore(id: string): Promise<void> {
  const local = loadSavedCustomers().filter(c => c.id !== id);
  saveCustomersList(local);

  if (!db) return;

  try {
    await deleteDoc(doc(db, COLLECTIONS.CUSTOMERS, id));
  } catch (error) {
    console.warn('Firestore delete customer error:', error);
  }
}

/**
 * =========================================================================
 * 3. SURCHARGES CATALOG CRUD WITH FIRESTORE
 * =========================================================================
 */

export async function saveSurchargeToFirestore(item: SurchargeItem): Promise<void> {
  const local = loadSavedSurcharges();
  const idx = local.findIndex(s => s.id === item.id);
  const updated = idx >= 0 ? local.map((s, i) => i === idx ? item : s) : [item, ...local];
  saveSurchargesList(updated);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.SURCHARGES, item.id);
    await setDoc(docRef, {
      ...item,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore surcharge save notice:', error);
  }
}

export async function getSurchargesFromFirestore(): Promise<SurchargeItem[]> {
  if (!db) {
    return loadSavedSurcharges();
  }

  try {
    const q = query(collection(db, COLLECTIONS.SURCHARGES));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: SurchargeItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as SurchargeItem, id: docSnap.id });
      });
      saveSurchargesList(items);
      return items;
    }
  } catch (error) {
    console.warn('Firestore load surcharges fallback to local:', error);
  }

  return loadSavedSurcharges();
}

export async function deleteSurchargeFromFirestore(id: string): Promise<void> {
  const local = loadSavedSurcharges().filter(s => s.id !== id);
  saveSurchargesList(local);

  if (!db) return;

  try {
    await deleteDoc(doc(db, COLLECTIONS.SURCHARGES, id));
  } catch (error) {
    console.warn('Firestore delete surcharge error:', error);
  }
}

/**
 * =========================================================================
 * 4. COMPANY PROFILE SETTINGS WITH FIRESTORE
 * =========================================================================
 */

export async function saveCompanyProfileToFirestore(profile: CompanyProfile): Promise<void> {
  saveCompanyProfile(profile);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'company_profile');
    await setDoc(docRef, {
      ...profile,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore save company profile notice:', error);
  }
}

export async function getCompanyProfileFromFirestore(): Promise<CompanyProfile> {
  if (!db) {
    return loadCompanyProfile();
  }

  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'company_profile');
    let docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      const legacyRef = doc(db, 'system_settings', 'company_profile');
      docSnap = await getDoc(legacyRef);
    }
    if (docSnap.exists()) {
      const data = docSnap.data() as CompanyProfile;
      saveCompanyProfile(data);
      return data;
    }
  } catch (error) {
    console.warn('Firestore load company profile fallback:', error);
  }

  return loadCompanyProfile();
}

/**
 * =========================================================================
 * 5. MASTER RATES CRUD WITH FIRESTORE
 * =========================================================================
 */

export async function saveRateMasterToFirestore(rate: RateMasterItem, actor: string = 'admin'): Promise<void> {
  // Update local storage first
  saveRateMasterItem(rate);

  // Record audit history
  const historyItem: RateHistoryItem = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    rateId: rate.id,
    rateCode: rate.rateCode,
    action: rate.version > 1 ? 'UPDATE' : 'CREATE',
    timestamp: new Date().toISOString(),
    actor: actor,
    snapshot: rate,
    note: `Saved rate ${rate.rateCode} (${rate.status})`,
  };
  addRateHistoryItem(historyItem);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.RATE_MASTERS, rate.id);
    await setDoc(docRef, {
      ...rate,
      _updatedAt: serverTimestamp(),
    }, { merge: true });

    // Also persist audit log to Firestore
    const histDocRef = doc(db, COLLECTIONS.RATE_HISTORIES, historyItem.id);
    await setDoc(histDocRef, {
      ...historyItem,
      _createdAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore save rate master notice:', error);
  }
}

export async function getRateMastersFromFirestore(): Promise<RateMasterItem[]> {
  if (!db) {
    return getSavedRateMasters();
  }

  try {
    const q = query(collection(db, COLLECTIONS.RATE_MASTERS));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: RateMasterItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as RateMasterItem, id: docSnap.id });
      });
      // Save to memory cache
      items.forEach(it => saveRateMasterItem(it));
      return items;
    }
  } catch (error) {
    console.warn('Firestore load rate masters fallback to local:', error);
  }

  return getSavedRateMasters();
}

export async function deleteRateMasterFromFirestore(id: string, softDelete: boolean = true): Promise<void> {
  deleteRateMasterItem(id, softDelete);

  if (!db) return;

  try {
    if (softDelete) {
      const docRef = doc(db, COLLECTIONS.RATE_MASTERS, id);
      await setDoc(docRef, {
        status: 'INACTIVE',
        _updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      await deleteDoc(doc(db, COLLECTIONS.RATE_MASTERS, id));
    }
  } catch (error) {
    console.warn('Firestore delete rate master error:', error);
  }
}

/**
 * =========================================================================
 * 6. CHARGE MASTERS CRUD WITH FIRESTORE
 * =========================================================================
 */

export async function saveChargeMasterToFirestore(charge: ChargeMasterItem): Promise<void> {
  saveChargeMasterItem(charge);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.CHARGE_MASTERS, charge.id);
    await setDoc(docRef, {
      ...charge,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore save charge master notice:', error);
  }
}

export async function getChargeMastersFromFirestore(): Promise<ChargeMasterItem[]> {
  if (!db) {
    return getSavedChargeMasters();
  }

  try {
    const q = query(collection(db, COLLECTIONS.CHARGE_MASTERS));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: ChargeMasterItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as ChargeMasterItem, id: docSnap.id });
      });
      items.forEach(it => saveChargeMasterItem(it));
      return items;
    }
  } catch (error) {
    console.warn('Firestore load charge masters fallback:', error);
  }

  return getSavedChargeMasters();
}

export async function deleteChargeMasterFromFirestore(id: string): Promise<void> {
  deleteChargeMasterItem(id);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.CHARGE_MASTERS, id);
    await setDoc(docRef, {
      status: 'INACTIVE',
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore delete charge master error:', error);
  }
}

/**
 * =========================================================================
 * 7. RATE HISTORIES & AUDIT TRAIL
 * =========================================================================
 */

export async function getRateHistoriesFromFirestore(): Promise<RateHistoryItem[]> {
  if (!db) {
    return getSavedRateHistories();
  }

  try {
    const q = query(collection(db, COLLECTIONS.RATE_HISTORIES));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: RateHistoryItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as RateHistoryItem, id: docSnap.id });
      });
      items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      items.forEach(it => addRateHistoryItem(it));
      return items;
    }
  } catch (error) {
    console.warn('Firestore load rate histories fallback:', error);
  }

  return getSavedRateHistories();
}

/**
 * =========================================================================
 * 8. SUPPLIERS CRUD WITH FIRESTORE
 * =========================================================================
 */

export async function saveSupplierToFirestore(supplier: SupplierItem): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, COLLECTIONS.SUPPLIERS, supplier.id);
    await setDoc(docRef, {
      ...supplier,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore save supplier error:', error);
  }
}

export async function getSuppliersFromFirestore(): Promise<SupplierItem[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, COLLECTIONS.SUPPLIERS));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: SupplierItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as SupplierItem, id: docSnap.id });
      });
      return items;
    }
  } catch (error) {
    console.warn('Firestore load suppliers error:', error);
  }
  return [];
}

export async function deleteSupplierFromFirestore(id: string): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, COLLECTIONS.SUPPLIERS, id);
    await setDoc(docRef, { status: 'INACTIVE', _updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.warn('Firestore delete supplier error:', error);
  }
}

/**
 * =========================================================================
 * 9. CARRIERS CRUD WITH FIRESTORE
 * =========================================================================
 */

export async function saveCarrierToFirestore(carrier: CarrierItem): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, COLLECTIONS.CARRIERS, carrier.id);
    await setDoc(docRef, {
      ...carrier,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore save carrier error:', error);
  }
}

export async function getCarriersFromFirestore(): Promise<CarrierItem[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, COLLECTIONS.CARRIERS));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: CarrierItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as CarrierItem, id: docSnap.id });
      });
      return items;
    }
  } catch (error) {
    console.warn('Firestore load carriers error:', error);
  }
  return [];
}

export async function deleteCarrierFromFirestore(id: string): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, COLLECTIONS.CARRIERS, id);
    await setDoc(docRef, { status: 'INACTIVE', _updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.warn('Firestore delete carrier error:', error);
  }
}

/**
 * =========================================================================
 * 10. RATE APPROVALS CRUD WITH FIRESTORE
 * =========================================================================
 */

export async function saveRateApprovalToFirestore(approval: RateApprovalRequest): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, COLLECTIONS.RATE_APPROVALS, approval.id);
    await setDoc(docRef, {
      ...approval,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore save rate approval error:', error);
  }
}

export async function getRateApprovalsFromFirestore(): Promise<RateApprovalRequest[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, COLLECTIONS.RATE_APPROVALS));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: RateApprovalRequest[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as RateApprovalRequest, id: docSnap.id });
      });
      items.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
      return items;
    }
  } catch (error) {
    console.warn('Firestore load rate approvals error:', error);
  }
  return [];
}

/**
 * =========================================================================
 * 11. RATE REQUESTS (SALES -> PRICING) CRUD WITH FIRESTORE
 * =========================================================================
 */

export async function saveRateRequestToFirestore(request: RateRequestItem): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, COLLECTIONS.RATE_REQUESTS, request.id);
    await setDoc(docRef, {
      ...request,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore save rate request error:', error);
  }
}

export async function getRateRequestsFromFirestore(): Promise<RateRequestItem[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, COLLECTIONS.RATE_REQUESTS));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: RateRequestItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as RateRequestItem, id: docSnap.id });
      });
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return items;
    }
  } catch (error) {
    console.warn('Firestore load rate requests error:', error);
  }
  return [];
}

export async function deleteRateRequestFromFirestore(id: string): Promise<void> {
  if (!db) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.RATE_REQUESTS, id));
  } catch (error) {
    console.warn('Firestore delete rate request error:', error);
  }
}

/**
 * =========================================================================
 * 12. PHASE 13: BATCH SAVE MASTER RATES & IMPORT JOBS
 * =========================================================================
 */

/**
 * Batch saves multiple master rates using Firestore writeBatch (chunks of 400 docs)
 */
export async function batchSaveMasterRatesToFirestore(
  rates: RateMasterItem[],
  importJobId?: string,
  actor: string = 'BULK_IMPORT'
): Promise<void> {
  if (!rates || rates.length === 0) return;

  // 1. Update memory cache immediately for responsive UI
  rates.forEach(r => saveRateMasterItem(r));

  // 2. Persist to Firestore in safe chunks
  if (!db) return;

  const CHUNK_SIZE = 400; // Well below 500 Firestore limit
  for (let i = 0; i < rates.length; i += CHUNK_SIZE) {
    const chunk = rates.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const rate of chunk) {
      const rateId = rate.id || `rate-imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const docRef = doc(db, COLLECTIONS.RATE_MASTERS, rateId);
      const nowIso = new Date().toISOString();
      batch.set(docRef, {
        ...rate,
        id: rateId,
        updatedAt: rate.updatedAt || nowIso,
        createdAt: rate.createdAt || nowIso,
        importJobId: importJobId || rate.importJobId || null,
        _updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    try {
      await batch.commit();
    } catch (error) {
      console.warn(`Firestore batch commit chunk ${i / CHUNK_SIZE + 1} error:`, error);
    }
  }

  // 3. Log bulk import audit record
  const bulkHistoryItem: RateHistoryItem = {
    id: `hist-bulk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    rateId: importJobId || 'BULK_IMPORT',
    rateCode: `BATCH_${rates.length}_ITEMS`,
    action: 'RATE_IMPORTED',
    timestamp: new Date().toISOString(),
    actor: actor,
    snapshot: {},
    note: `Đã import thành công ${rates.length} bảng giá cước (Job: ${importJobId || 'N/A'})`,
  };
  addRateHistoryItem(bulkHistoryItem);

  try {
    const histDocRef = doc(db, COLLECTIONS.RATE_HISTORIES, bulkHistoryItem.id);
    await setDoc(histDocRef, {
      ...bulkHistoryItem,
      _createdAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore log bulk import history error:', err);
  }
}

// In-memory cache for import jobs (NO LOCAL STORAGE - PHASE 17)
let memoryImportJobs: BulkImportJob[] = [];

/**
 * Saves Bulk Import Job metadata
 */
export async function saveBulkImportJobToFirestore(job: BulkImportJob): Promise<void> {
  // Save memory cache
  const idx = memoryImportJobs.findIndex(j => j.id === job.id);
  if (idx >= 0) memoryImportJobs[idx] = job;
  else memoryImportJobs.unshift(job);
  memoryImportJobs = memoryImportJobs.slice(0, 50);

  if (!db) return;
  try {
    const docRef = doc(db, COLLECTIONS.IMPORT_JOBS, job.id);
    await setDoc(docRef, {
      ...job,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore save import job error:', error);
  }
}

/**
 * Retrieves Import Jobs from Firestore
 */
export async function getBulkImportJobsFromFirestore(): Promise<BulkImportJob[]> {
  if (!db) {
    return memoryImportJobs;
  }

  try {
    const q = query(collection(db, COLLECTIONS.IMPORT_JOBS));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: BulkImportJob[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as BulkImportJob, id: docSnap.id });
      });
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      memoryImportJobs = items;
      return items;
    }
  } catch (error) {
    console.warn('Firestore load import jobs error:', error);
  }

  return memoryImportJobs;
}

/**
 * Saves a missing rate event to Firestore
 */
export async function saveMissingRateEventToFirestore(event: MissingRateEvent): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, COLLECTIONS.MISSING_RATE_EVENTS, event.id);
    await setDoc(docRef, {
      ...event,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore save missing rate event error:', error);
  }
}

/**
 * Retrieves missing rate events from Firestore
 */
export async function getMissingRateEventsFromFirestore(): Promise<MissingRateEvent[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, COLLECTIONS.MISSING_RATE_EVENTS));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: MissingRateEvent[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as MissingRateEvent, id: docSnap.id });
      });
      items.sort((a, b) => b.lastRequestedAt.localeCompare(a.lastRequestedAt));
      return items;
    }
  } catch (error) {
    console.warn('Firestore load missing rate events error:', error);
  }
  return [];
}

/**
 * =========================================================================
 * 14. REAL-TIME SYNCHRONIZATION SUBSCRIBERS (100% CROSS-DEVICE SYNC)
 * =========================================================================
 */

/**
 * Subscribes to real-time changes in Quotes collection across all devices
 */
export function subscribeToQuotations(onUpdate: (quotes: QuoteData[]) => void): () => void {
  if (!db) return () => {};
  const listenerId = 'quotes_listener';
  syncHealthService.registerListener(listenerId, 'Báo Giá Thời Gian Thực', COLLECTIONS.QUOTES);
  try {
    const q = query(collection(db, COLLECTIONS.QUOTES));
    return onSnapshot(q, (snapshot) => {
      const items: QuoteData[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as QuoteData, id: docSnap.id });
      });
      items.sort((a, b) => (b.updatedDate || b.createdDate || '').localeCompare(a.updatedDate || a.createdDate || ''));
      saveQuotesList(items);
      syncHealthService.reportListenerEvent(listenerId, 'Quotation', items.length);
      onUpdate(items);
    }, (err) => {
      console.warn('[firestoreService] Live quotes snapshot notice:', err);
      syncHealthService.reportListenerError(listenerId, err);
    });
  } catch (err) {
    console.warn('[firestoreService] Could not attach listener to quotes:', err);
    syncHealthService.reportListenerError(listenerId, err);
    return () => {};
  }
}

/**
 * Subscribes to real-time changes in Customers collection across all devices
 */
export function subscribeToCustomers(onUpdate: (customers: CustomerRecord[]) => void): () => void {
  if (!db) return () => {};
  const listenerId = 'customers_listener';
  syncHealthService.registerListener(listenerId, 'Khách Hàng Thời Gian Thực', COLLECTIONS.CUSTOMERS);
  try {
    const q = query(collection(db, COLLECTIONS.CUSTOMERS));
    return onSnapshot(q, (snapshot) => {
      const items: CustomerRecord[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as CustomerRecord, id: docSnap.id });
      });
      items.sort((a, b) => (a.customerName || a.companyName || '').localeCompare(b.customerName || b.companyName || ''));
      saveCustomersList(items);
      syncHealthService.reportListenerEvent(listenerId, 'Customer', items.length);
      onUpdate(items);
    }, (err) => {
      console.warn('[firestoreService] Live customers snapshot notice:', err);
      syncHealthService.reportListenerError(listenerId, err);
    });
  } catch (err) {
    console.warn('[firestoreService] Could not attach listener to customers:', err);
    syncHealthService.reportListenerError(listenerId, err);
    return () => {};
  }
}

/**
 * Subscribes to real-time changes in Master Rates across all devices
 */
export function subscribeToRateMasters(onUpdate: (rates: RateMasterItem[]) => void): () => void {
  if (!db) return () => {};
  const listenerId = 'rates_listener';
  syncHealthService.registerListener(listenerId, 'Biểu Cước Master Thời Gian Thực', COLLECTIONS.RATE_MASTERS);
  try {
    const q = query(collection(db, COLLECTIONS.RATE_MASTERS));
    return onSnapshot(q, (snapshot) => {
      const items: RateMasterItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as RateMasterItem, id: docSnap.id });
      });
      items.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
      items.forEach(it => saveRateMasterItem(it));
      syncHealthService.reportListenerEvent(listenerId, 'Rate', items.length);
      onUpdate(items);
    }, (err) => {
      console.warn('[firestoreService] Live rates snapshot notice:', err);
      syncHealthService.reportListenerError(listenerId, err);
    });
  } catch (err) {
    console.warn('[firestoreService] Could not attach listener to rates:', err);
    syncHealthService.reportListenerError(listenerId, err);
    return () => {};
  }
}

/**
 * Subscribes to real-time changes in Surcharges across all devices
 */
export function subscribeToSurcharges(onUpdate: (surcharges: SurchargeItem[]) => void): () => void {
  if (!db) return () => {};
  const listenerId = 'surcharges_listener';
  syncHealthService.registerListener(listenerId, 'Phụ Phí Thời Gian Thực', COLLECTIONS.SURCHARGES);
  try {
    const q = query(collection(db, COLLECTIONS.SURCHARGES));
    return onSnapshot(q, (snapshot) => {
      const items: SurchargeItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as SurchargeItem, id: docSnap.id });
      });
      saveSurchargesList(items);
      syncHealthService.reportListenerEvent(listenerId, 'Surcharge', items.length);
      onUpdate(items);
    }, (err) => {
      console.warn('[firestoreService] Live surcharges snapshot notice:', err);
      syncHealthService.reportListenerError(listenerId, err);
    });
  } catch (err) {
    console.warn('[firestoreService] Could not attach listener to surcharges:', err);
    syncHealthService.reportListenerError(listenerId, err);
    return () => {};
  }
}

/**
 * Subscribes to real-time changes in Charge Masters across all devices
 */
export function subscribeToChargeMasters(onUpdate: (charges: ChargeMasterItem[]) => void): () => void {
  if (!db) return () => {};
  const listenerId = 'charges_listener';
  syncHealthService.registerListener(listenerId, 'Danh Mục Phụ Phí Chuẩn', COLLECTIONS.CHARGE_MASTERS);
  try {
    const q = query(collection(db, COLLECTIONS.CHARGE_MASTERS));
    return onSnapshot(q, (snapshot) => {
      const items: ChargeMasterItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as ChargeMasterItem, id: docSnap.id });
      });
      items.forEach(it => saveChargeMasterItem(it));
      syncHealthService.reportListenerEvent(listenerId, undefined, items.length);
      onUpdate(items);
    }, (err) => {
      console.warn('[firestoreService] Live charge masters snapshot notice:', err);
      syncHealthService.reportListenerError(listenerId, err);
    });
  } catch (err) {
    console.warn('[firestoreService] Could not attach listener to charge masters:', err);
    syncHealthService.reportListenerError(listenerId, err);
    return () => {};
  }
}

/**
 * Subscribes to real-time changes in Company Profile across all devices
 */
export function subscribeToCompanyProfile(onUpdate: (company: CompanyProfile) => void): () => void {
  if (!db) return () => {};
  const listenerId = 'company_listener';
  syncHealthService.registerListener(listenerId, 'Hồ Sơ Doanh Nghiệp Thời Gian Thực', COLLECTIONS.SETTINGS);
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'company_profile');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as CompanyProfile;
        saveCompanyProfile(data);
        syncHealthService.reportListenerEvent(listenerId, 'Company', 1);
        syncHealthService.updateEntityHealth('Company', {
          version: data.version || 1,
          updatedBy: data.salesRepName || 'Admin',
          status: 'HEALTHY',
        });
        onUpdate(data);
      }
    }, (err) => {
      console.warn('[firestoreService] Live company profile snapshot notice:', err);
      syncHealthService.reportListenerError(listenerId, err);
    });
  } catch (err) {
    console.warn('[firestoreService] Could not attach listener to company profile:', err);
    syncHealthService.reportListenerError(listenerId, err);
    return () => {};
  }
}

/**
 * Restores full system backup data to Firestore so all other devices receive it
 */
export async function batchRestoreSystemDataToFirestore(data: {
  quotes?: QuoteData[];
  companySettings?: CompanyProfile;
  customers?: CustomerRecord[];
  surcharges?: SurchargeItem[];
  rateMasters?: RateMasterItem[];
  chargeMasters?: ChargeMasterItem[];
}): Promise<void> {
  if (!db) return;

  // 1. Batch quotes
  if (data.quotes && data.quotes.length > 0) {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < data.quotes.length; i += CHUNK_SIZE) {
      const chunk = data.quotes.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const q of chunk) {
        batch.set(doc(db, COLLECTIONS.QUOTES, q.id), {
          ...q,
          _updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      try {
        await batch.commit();
      } catch (e) {
        console.warn('Restore quotes batch notice:', e);
      }
    }
  }

  // 2. Batch customers
  if (data.customers && data.customers.length > 0) {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < data.customers.length; i += CHUNK_SIZE) {
      const chunk = data.customers.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const c of chunk) {
        batch.set(doc(db, COLLECTIONS.CUSTOMERS, c.id), {
          ...c,
          _updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      try {
        await batch.commit();
      } catch (e) {
        console.warn('Restore customers batch notice:', e);
      }
    }
  }

  // 3. Batch surcharges
  if (data.surcharges && data.surcharges.length > 0) {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < data.surcharges.length; i += CHUNK_SIZE) {
      const chunk = data.surcharges.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const s of chunk) {
        batch.set(doc(db, COLLECTIONS.SURCHARGES, s.id), {
          ...s,
          _updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      try {
        await batch.commit();
      } catch (e) {
        console.warn('Restore surcharges batch notice:', e);
      }
    }
  }

  // 4. Batch rate masters
  if (data.rateMasters && data.rateMasters.length > 0) {
    await batchSaveMasterRatesToFirestore(data.rateMasters, 'BACKUP_RESTORE', 'BACKUP_RESTORE');
  }

  // 5. Company settings
  if (data.companySettings) {
    await saveCompanyProfileToFirestore(data.companySettings);
  }
}



