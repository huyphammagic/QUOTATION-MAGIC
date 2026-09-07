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
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { SupplierItem, CarrierItem } from '../../types/masterRate';

const COLLECTIONS = {
  SUPPLIERS: 'suppliers',
  CARRIERS: 'carriers',
};

// In-memory cache with TTL (60s)
interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}
const CACHE_TTL_MS = 60 * 1000;

let memorySuppliersCache: CacheEntry<SupplierItem[]> | null = null;
let memoryCarriersCache: CacheEntry<CarrierItem[]> | null = null;

export function invalidateSupplierCaches(): void {
  memorySuppliersCache = null;
  memoryCarriersCache = null;
}

/**
 * ============================================================================
 * SUPPLIERS CRUD
 * ============================================================================
 */
export async function fetchSuppliers(forceRefresh = false): Promise<SupplierItem[]> {
  const now = Date.now();
  if (!forceRefresh && memorySuppliersCache && (now - memorySuppliersCache.cachedAt < CACHE_TTL_MS)) {
    return memorySuppliersCache.data;
  }

  if (!db) return [];

  try {
    const q = query(
      collection(db, COLLECTIONS.SUPPLIERS),
      orderBy('name', 'asc'),
      limit(200)
    );
    const snap = await getDocs(q);
    const items: SupplierItem[] = [];
    snap.forEach((d) => {
      items.push({ ...d.data() as SupplierItem, id: d.id });
    });

    memorySuppliersCache = { data: items, cachedAt: now };
    return items;
  } catch (err) {
    console.error('[supplierRepository] Error fetching suppliers from Firestore:', err);
    return memorySuppliersCache ? memorySuppliersCache.data : [];
  }
}

export async function saveSupplier(supplier: SupplierItem): Promise<SupplierItem> {
  const supplierId = supplier.id || `sup-${Date.now()}`;
  const record: SupplierItem = {
    ...supplier,
    id: supplierId,
  };

  if (!db) {
    invalidateSupplierCaches();
    return record;
  }

  try {
    const docRef = doc(db, COLLECTIONS.SUPPLIERS, supplierId);
    await setDoc(docRef, {
      ...record,
      _updatedAt: serverTimestamp(),
    }, { merge: true });

    invalidateSupplierCaches();
    return record;
  } catch (err) {
    console.error(`[supplierRepository] Error saving supplier ${supplierId}:`, err);
    throw err;
  }
}

export async function deleteSupplier(id: string): Promise<boolean> {
  if (!db || !id) return false;

  try {
    const docRef = doc(db, COLLECTIONS.SUPPLIERS, id);
    await deleteDoc(docRef);
    invalidateSupplierCaches();
    return true;
  } catch (err) {
    console.error(`[supplierRepository] Error deleting supplier ${id}:`, err);
    return false;
  }
}

/**
 * ============================================================================
 * CARRIERS CRUD
 * ============================================================================
 */
export async function fetchCarriers(forceRefresh = false): Promise<CarrierItem[]> {
  const now = Date.now();
  if (!forceRefresh && memoryCarriersCache && (now - memoryCarriersCache.cachedAt < CACHE_TTL_MS)) {
    return memoryCarriersCache.data;
  }

  if (!db) return [];

  try {
    const q = query(
      collection(db, COLLECTIONS.CARRIERS),
      orderBy('name', 'asc'),
      limit(200)
    );
    const snap = await getDocs(q);
    const items: CarrierItem[] = [];
    snap.forEach((d) => {
      items.push({ ...d.data() as CarrierItem, id: d.id });
    });

    memoryCarriersCache = { data: items, cachedAt: now };
    return items;
  } catch (err) {
    console.error('[supplierRepository] Error fetching carriers from Firestore:', err);
    return memoryCarriersCache ? memoryCarriersCache.data : [];
  }
}

export async function saveCarrier(carrier: CarrierItem): Promise<CarrierItem> {
  const carrierId = carrier.id || `car-${Date.now()}`;
  const record: CarrierItem = {
    ...carrier,
    id: carrierId,
  };

  if (!db) {
    invalidateSupplierCaches();
    return record;
  }

  try {
    const docRef = doc(db, COLLECTIONS.CARRIERS, carrierId);
    await setDoc(docRef, {
      ...record,
      _updatedAt: serverTimestamp(),
    }, { merge: true });

    invalidateSupplierCaches();
    return record;
  } catch (err) {
    console.error(`[supplierRepository] Error saving carrier ${carrierId}:`, err);
    throw err;
  }
}

export async function deleteCarrier(id: string): Promise<boolean> {
  if (!db || !id) return false;

  try {
    const docRef = doc(db, COLLECTIONS.CARRIERS, id);
    await deleteDoc(docRef);
    invalidateSupplierCaches();
    return true;
  } catch (err) {
    console.error(`[supplierRepository] Error deleting carrier ${id}:`, err);
    return false;
  }
}
