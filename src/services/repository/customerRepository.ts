import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  getDocsFromServer,
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  where,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { CustomerRecord, CustomerInfo, QuoteData } from '../../types/logistics';
import { saveCustomersList, getSavedCustomers } from '../../utils/storage';

const COLLECTION_NAME = 'customers';

// In-Memory Cache with TTL (30 seconds)
interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}
const CACHE_TTL_MS = 30 * 1000;
let memoryCustomersCache: CacheEntry<CustomerRecord[]> | null = null;

export function invalidateCustomerCache(): void {
  memoryCustomersCache = null;
}

/**
 * Strips all undefined or illegal values and formats clean customer entity.
 * Firestore setDoc strictly throws if any property is `undefined`.
 */
export function sanitizeCustomerRecord(customer: Partial<CustomerRecord>): CustomerRecord {
  const custId = (customer.id && String(customer.id).trim().length > 0)
    ? String(customer.id).trim()
    : `cust-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  const code = (customer.code && String(customer.code).trim().length > 0)
    ? String(customer.code).trim()
    : `KH-${Math.floor(100 + Math.random() * 900)}`;

  const companyName = (customer.companyName || customer.customerName || 'Khách hàng doanh nghiệp').trim();
  const customerName = (customer.customerName || customer.companyName || '—').trim();
  const contactPerson = (customer.contactPerson || '').trim();
  const taxId = (customer.taxId || '').trim();
  const address = (customer.address || '').trim();
  const email = (customer.email || '').trim();
  const phone = (customer.phone || '').trim();
  const group = (customer.group || 'Khách Thương Mại').trim();
  const segment = (customer.segment || 'STANDARD').trim();
  const notes = (customer.notes || '').trim();
  const createdDate = (customer.createdDate || new Date().toISOString().slice(0, 10)).trim();

  return {
    id: custId,
    code,
    companyName,
    customerName,
    contactPerson,
    taxId,
    address,
    email,
    phone,
    group,
    segment,
    notes,
    createdDate,
  };
}

/**
 * Fetch all customers from Firestore.
 * When forceRefresh is true, attempts getDocsFromServer to guarantee freshest data across computers.
 */
export async function fetchCustomers(forceRefresh = false): Promise<CustomerRecord[]> {
  const now = Date.now();
  if (!forceRefresh && memoryCustomersCache && (now - memoryCustomersCache.cachedAt < CACHE_TTL_MS)) {
    return memoryCustomersCache.data;
  }

  if (!db) {
    const local = getSavedCustomers();
    return local;
  }

  try {
    let snap: any = null;
    const collRef = collection(db, COLLECTION_NAME);

    if (forceRefresh) {
      try {
        // Direct server query bypasses local offline/browser cache
        snap = await getDocsFromServer(collRef);
      } catch (serverErr) {
        console.warn('[customerRepository] Server fetch fallback to cached getDocs:', serverErr);
        snap = await getDocs(collRef);
      }
    } else {
      snap = await getDocs(collRef);
    }

    if (!snap || snap.empty) {
      const currentList = getSavedCustomers();
      if (currentList && currentList.length > 0) {
        return currentList;
      }
      memoryCustomersCache = { data: [], cachedAt: now };
      saveCustomersList([]);
      return [];
    }

    const items: CustomerRecord[] = [];
    snap.forEach((d: any) => {
      const data = d.data();
      items.push(sanitizeCustomerRecord({ ...data, id: d.id }));
    });

    // Sort alphabetically by companyName or customerName
    items.sort((a, b) => (a.companyName || a.customerName || '').localeCompare(b.companyName || b.customerName || ''));

    memoryCustomersCache = { data: items, cachedAt: now };
    saveCustomersList(items);
    return items;
  } catch (error) {
    console.error('[customerRepository] Error fetching customers from Firestore:', error);
    const local = getSavedCustomers();
    if (local && local.length > 0) return local;
    if (memoryCustomersCache) return memoryCustomersCache.data;
    return [];
  }
}

/**
 * Save or update customer in Firestore with 100% data sanitization and immediate persistence.
 */
export async function saveCustomer(customer: Partial<CustomerRecord>): Promise<CustomerRecord> {
  const record = sanitizeCustomerRecord(customer);

  // Update in-memory state immediately for responsive local UI
  const currentList = getSavedCustomers();
  const idx = currentList.findIndex(c => c.id === record.id);
  const updatedList = idx >= 0 
    ? currentList.map((c, i) => i === idx ? record : c)
    : [record, ...currentList];
  
  saveCustomersList(updatedList);
  invalidateCustomerCache();

  if (!db) {
    console.warn('[customerRepository] Firestore not initialized, customer saved in local memory only.');
    return record;
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, record.id);
    await setDoc(docRef, {
      ...record,
      _updatedAt: serverTimestamp(),
    }, { merge: true });

    invalidateCustomerCache();
    console.log(`[customerRepository] Saved customer ${record.code} (${record.id}) to Firestore successfully.`);
    return record;
  } catch (error) {
    console.error(`[customerRepository] CRITICAL: Failed saving customer ${record.id} to Firestore:`, error);
    throw error;
  }
}

/**
 * Delete customer from Firestore and update memory cache.
 */
export async function deleteCustomer(id: string): Promise<boolean> {
  if (!id) return false;

  const currentList = getSavedCustomers().filter(c => c.id !== id);
  saveCustomersList(currentList);
  invalidateCustomerCache();

  if (!db) return true;

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    invalidateCustomerCache();
    console.log(`[customerRepository] Deleted customer ${id} from Firestore.`);
    return true;
  } catch (error) {
    console.error(`[customerRepository] Error deleting customer ${id}:`, error);
    throw error;
  }
}

/**
 * Real-time listener for live customer updates across all computers.
 */
export function subscribeToCustomerCollection(onUpdate: (customers: CustomerRecord[]) => void): () => void {
  if (!db) return () => {};

  try {
    const collRef = collection(db, COLLECTION_NAME);
    return onSnapshot(collRef, (snapshot) => {
      const items: CustomerRecord[] = [];
      snapshot.forEach(docSnap => {
        items.push(sanitizeCustomerRecord({ ...docSnap.data(), id: docSnap.id }));
      });

      items.sort((a, b) => (a.companyName || a.customerName || '').localeCompare(b.companyName || b.customerName || ''));
      memoryCustomersCache = { data: items, cachedAt: Date.now() };
      saveCustomersList(items);
      onUpdate(items);
    }, (err) => {
      console.warn('[customerRepository] Realtime customers snapshot notice:', err);
    });
  } catch (err) {
    console.warn('[customerRepository] Could not attach listener to customers:', err);
    return () => {};
  }
}

/**
 * Auto-upsert customer from quotation data.
 * Guarantees that whenever a quotation is saved with customer information,
 * that customer is automatically created/updated in the cloud CRM database.
 */
export async function autoUpsertCustomerFromQuote(quoteCustomer: Partial<CustomerInfo>): Promise<CustomerRecord | null> {
  const companyName = (quoteCustomer.companyName || quoteCustomer.customerName || '').trim();
  const taxId = (quoteCustomer.taxId || '').trim();

  // If there is no meaningful customer name or tax ID, skip
  if (!companyName && !taxId) {
    return null;
  }

  try {
    const existing = await fetchCustomers();
    // Check if customer already exists by taxId (exact) or companyName (case-insensitive)
    const matched = existing.find(c => {
      if (taxId && c.taxId && c.taxId.trim() === taxId) return true;
      if (companyName && c.companyName && c.companyName.trim().toLowerCase() === companyName.toLowerCase()) return true;
      return false;
    });

    if (matched) {
      // Update with any new contact details provided in quote
      const updated: CustomerRecord = sanitizeCustomerRecord({
        ...matched,
        contactPerson: quoteCustomer.contactPerson || matched.contactPerson,
        phone: quoteCustomer.phone || matched.phone,
        email: quoteCustomer.email || matched.email,
        address: quoteCustomer.address || matched.address,
        taxId: taxId || matched.taxId,
      });
      return await saveCustomer(updated);
    } else {
      // Create new customer record
      const newCustomer: CustomerRecord = sanitizeCustomerRecord({
        id: `cust-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        code: `KH-${Math.floor(100 + Math.random() * 900)}`,
        companyName,
        customerName: quoteCustomer.customerName || companyName,
        contactPerson: quoteCustomer.contactPerson || '',
        taxId,
        phone: quoteCustomer.phone || '',
        email: quoteCustomer.email || '',
        address: quoteCustomer.address || '',
        group: 'Khách Báo Giá Mới',
        segment: 'STANDARD',
        notes: 'Tự động đồng bộ từ Báo giá',
      });
      return await saveCustomer(newCustomer);
    }
  } catch (err) {
    console.warn('[customerRepository] Auto-upsert customer from quote notice:', err);
    return null;
  }
}

/**
 * Scans all existing quotations and recovers/synchronizes any customers into the CRM collection.
 */
export async function syncMissingCustomersFromQuotes(quotes: QuoteData[]): Promise<number> {
  if (!quotes || quotes.length === 0) return 0;
  let addedCount = 0;

  try {
    const existing = await fetchCustomers();
    const existingTaxIds = new Set(existing.map(c => (c.taxId || '').trim()).filter(Boolean));
    const existingNames = new Set(existing.map(c => (c.companyName || '').trim().toLowerCase()).filter(Boolean));

    for (const q of quotes) {
      if (!q.customer) continue;
      const cName = (q.customer.companyName || q.customer.customerName || '').trim();
      const tId = (q.customer.taxId || '').trim();

      if (!cName && !tId) continue;

      const hasTaxId = tId && existingTaxIds.has(tId);
      const hasName = cName && existingNames.has(cName.toLowerCase());

      if (!hasTaxId && !hasName) {
        const newRecord = sanitizeCustomerRecord({
          id: `cust-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          code: `KH-${Math.floor(100 + Math.random() * 900)}`,
          companyName: cName || 'Khách hàng',
          customerName: q.customer.customerName || cName,
          contactPerson: q.customer.contactPerson || '',
          taxId: tId,
          phone: q.customer.phone || '',
          email: q.customer.email || '',
          address: q.customer.address || '',
          group: 'Khách Từ Báo Giá',
          segment: 'STANDARD',
          notes: `Đồng bộ từ báo giá ${q.quoteNumber || ''}`,
        });

        await saveCustomer(newRecord);
        if (tId) existingTaxIds.add(tId);
        if (cName) existingNames.add(cName.toLowerCase());
        addedCount++;
      }
    }
  } catch (err) {
    console.warn('[customerRepository] syncMissingCustomersFromQuotes error:', err);
  }

  return addedCount;
}

