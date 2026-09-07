import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { CustomerRecord } from '../../types/logistics';
import { INITIAL_CUSTOMERS } from '../../data/presets';

const COLLECTION_NAME = 'customers';

// In-Memory Cache with TTL (60 seconds)
interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}
const CACHE_TTL_MS = 60 * 1000;
let memoryCustomersCache: CacheEntry<CustomerRecord[]> | null = null;

export function invalidateCustomerCache(): void {
  memoryCustomersCache = null;
}

/**
 * Fetch all customers from Firestore
 */
export async function fetchCustomers(forceRefresh = false): Promise<CustomerRecord[]> {
  const now = Date.now();
  if (!forceRefresh && memoryCustomersCache && (now - memoryCustomersCache.cachedAt < CACHE_TTL_MS)) {
    return memoryCustomersCache.data;
  }

  if (!db) {
    console.warn('[customerRepository] Firestore not initialized, returning initial preset');
    return INITIAL_CUSTOMERS;
  }

  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('customerName', 'asc'), limit(100));
    const snap = await getDocs(q);

    if (snap.empty) {
      // Seed initial customers into Firestore for cloud persistence
      console.log('[customerRepository] Seeding initial customers to Firestore...');
      for (const cust of INITIAL_CUSTOMERS) {
        await saveCustomer(cust);
      }
      memoryCustomersCache = { data: INITIAL_CUSTOMERS, cachedAt: now };
      return INITIAL_CUSTOMERS;
    }

    const items: CustomerRecord[] = [];
    snap.forEach((d) => {
      items.push({ ...d.data() as CustomerRecord, id: d.id });
    });

    memoryCustomersCache = { data: items, cachedAt: now };
    return items;
  } catch (error) {
    console.error('[customerRepository] Error fetching customers from Firestore:', error);
    if (memoryCustomersCache) return memoryCustomersCache.data;
    return INITIAL_CUSTOMERS;
  }
}

/**
 * Save or update customer in Firestore
 */
export async function saveCustomer(customer: CustomerRecord): Promise<CustomerRecord> {
  const custId = customer.id || `cust-${Date.now()}`;
  const record: CustomerRecord = {
    ...customer,
    id: custId,
    createdDate: customer.createdDate || new Date().toISOString().slice(0, 10),
  };

  if (!db) {
    invalidateCustomerCache();
    return record;
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, custId);
    await setDoc(docRef, {
      ...record,
      _updatedAt: serverTimestamp(),
    }, { merge: true });

    invalidateCustomerCache();
    return record;
  } catch (error) {
    console.error(`[customerRepository] Error saving customer ${custId}:`, error);
    throw error;
  }
}

/**
 * Delete customer from Firestore
 */
export async function deleteCustomer(id: string): Promise<boolean> {
  if (!db || !id) return false;

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    invalidateCustomerCache();
    return true;
  } catch (error) {
    console.error(`[customerRepository] Error deleting customer ${id}:`, error);
    return false;
  }
}
