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
import { RateMasterItem, ChargeMasterItem, RateHistoryItem } from '../../types/masterRate';
import { SurchargeItem } from '../../types/logistics';

const COLLECTIONS = {
  RATE_MASTERS: 'rateMasters',
  CHARGE_MASTERS: 'chargeMasters',
  SURCHARGES: 'surcharges',
  RATE_HISTORIES: 'rateHistories',
};

// In-memory caches with TTL (60s)
interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}
const CACHE_TTL_MS = 60 * 1000;

let memoryRatesCache: CacheEntry<RateMasterItem[]> | null = null;
let memoryChargesCache: CacheEntry<ChargeMasterItem[]> | null = null;
let memorySurchargesCache: CacheEntry<SurchargeItem[]> | null = null;
let memoryHistoriesCache: CacheEntry<RateHistoryItem[]> | null = null;

export function invalidateRateCaches(): void {
  memoryRatesCache = null;
  memoryChargesCache = null;
  memorySurchargesCache = null;
  memoryHistoriesCache = null;
}

/**
 * ============================================================================
 * RATE MASTERS CRUD (PAGINATED / INDEXED)
 * ============================================================================
 */
export async function fetchRateMasters(forceRefresh = false): Promise<RateMasterItem[]> {
  const now = Date.now();
  if (!forceRefresh && memoryRatesCache && (now - memoryRatesCache.cachedAt < CACHE_TTL_MS)) {
    return memoryRatesCache.data;
  }

  if (!db) return memoryRatesCache ? memoryRatesCache.data : [];

  try {
    let snap: any = null;
    try {
      const q = query(
        collection(db, COLLECTIONS.RATE_MASTERS),
        orderBy('updatedAt', 'desc')
      );
      snap = await getDocs(q);
    } catch {
      // Fallback without orderBy if some documents lack the field or index is missing
      const fallbackQ = query(collection(db, COLLECTIONS.RATE_MASTERS));
      snap = await getDocs(fallbackQ);
    }

    const items: RateMasterItem[] = [];
    if (snap && !snap.empty) {
      snap.forEach((d: any) => {
        items.push({ ...d.data() as RateMasterItem, id: d.id });
      });
    }

    // Sort in memory by updatedAt or createdAt desc
    items.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));

    memoryRatesCache = { data: items, cachedAt: now };
    return items;
  } catch (err) {
    console.error('[rateRepository] Error fetching rate masters from Firestore:', err);
    return memoryRatesCache ? memoryRatesCache.data : [];
  }
}

export async function saveRateMaster(rate: RateMasterItem): Promise<RateMasterItem> {
  const rateId = rate.id || `rate-${Date.now()}`;
  const record: RateMasterItem = {
    ...rate,
    id: rateId,
    updatedAt: new Date().toISOString().slice(0, 10),
  };

  if (!db) {
    invalidateRateCaches();
    return record;
  }

  try {
    const docRef = doc(db, COLLECTIONS.RATE_MASTERS, rateId);
    await setDoc(docRef, {
      ...record,
      _updatedAt: serverTimestamp(),
    }, { merge: true });

    invalidateRateCaches();
    return record;
  } catch (err) {
    console.error(`[rateRepository] Error saving rate master ${rateId}:`, err);
    throw err;
  }
}

export async function deleteRateMaster(id: string, softDelete = true): Promise<boolean> {
  if (!db || !id) return false;

  try {
    const docRef = doc(db, COLLECTIONS.RATE_MASTERS, id);
    if (softDelete) {
      await setDoc(docRef, {
        status: 'INACTIVE',
        updatedAt: new Date().toISOString().slice(0, 10),
        _updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      await deleteDoc(docRef);
    }
    invalidateRateCaches();
    return true;
  } catch (err) {
    console.error(`[rateRepository] Error deleting rate master ${id}:`, err);
    return false;
  }
}

/**
 * ============================================================================
 * CHARGE MASTERS CRUD
 * ============================================================================
 */
export async function fetchChargeMasters(forceRefresh = false): Promise<ChargeMasterItem[]> {
  const now = Date.now();
  if (!forceRefresh && memoryChargesCache && (now - memoryChargesCache.cachedAt < CACHE_TTL_MS)) {
    return memoryChargesCache.data;
  }

  if (!db) return [];

  try {
    const q = query(
      collection(db, COLLECTIONS.CHARGE_MASTERS),
      orderBy('chargeCode', 'asc'),
      limit(200)
    );
    const snap = await getDocs(q);
    const items: ChargeMasterItem[] = [];
    snap.forEach((d) => {
      items.push({ ...d.data() as ChargeMasterItem, id: d.id });
    });

    memoryChargesCache = { data: items, cachedAt: now };
    return items;
  } catch (err) {
    console.error('[rateRepository] Error fetching charge masters from Firestore:', err);
    return memoryChargesCache ? memoryChargesCache.data : [];
  }
}

export async function saveChargeMaster(charge: ChargeMasterItem): Promise<ChargeMasterItem> {
  const chargeId = charge.id || `charge-${charge.chargeCode || Date.now()}`;
  const record: ChargeMasterItem = {
    ...charge,
    id: chargeId,
    updatedAt: new Date().toISOString().slice(0, 10),
  };

  if (!db) {
    invalidateRateCaches();
    return record;
  }

  try {
    const docRef = doc(db, COLLECTIONS.CHARGE_MASTERS, chargeId);
    await setDoc(docRef, {
      ...record,
      _updatedAt: serverTimestamp(),
    }, { merge: true });

    invalidateRateCaches();
    return record;
  } catch (err) {
    console.error(`[rateRepository] Error saving charge master ${chargeId}:`, err);
    throw err;
  }
}

/**
 * ============================================================================
 * SURCHARGES CATALOG CRUD
 * ============================================================================
 */
export async function fetchSurcharges(forceRefresh = false): Promise<SurchargeItem[]> {
  const now = Date.now();
  if (!forceRefresh && memorySurchargesCache && (now - memorySurchargesCache.cachedAt < CACHE_TTL_MS)) {
    return memorySurchargesCache.data;
  }

  if (!db) return memorySurchargesCache ? memorySurchargesCache.data : [];

  try {
    const q = query(
      collection(db, COLLECTIONS.SURCHARGES),
      orderBy('code', 'asc'),
      limit(200)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      memorySurchargesCache = { data: [], cachedAt: now };
      return [];
    }

    const items: SurchargeItem[] = [];
    snap.forEach((d) => {
      items.push({ ...d.data() as SurchargeItem, id: d.id });
    });

    memorySurchargesCache = { data: items, cachedAt: now };
    return items;
  } catch (err) {
    console.error('[rateRepository] Error fetching surcharges from Firestore:', err);
    return memorySurchargesCache ? memorySurchargesCache.data : [];
  }
}

export async function saveSurcharge(item: SurchargeItem): Promise<SurchargeItem> {
  const itemId = item.id || `sur-${Date.now()}`;
  const record: SurchargeItem = {
    ...item,
    id: itemId,
  };

  if (!db) {
    invalidateRateCaches();
    return record;
  }

  try {
    const docRef = doc(db, COLLECTIONS.SURCHARGES, itemId);
    await setDoc(docRef, {
      ...record,
      _updatedAt: serverTimestamp(),
    }, { merge: true });

    invalidateRateCaches();
    return record;
  } catch (err) {
    console.error(`[rateRepository] Error saving surcharge ${itemId}:`, err);
    throw err;
  }
}

export async function deleteSurcharge(id: string): Promise<boolean> {
  if (!db || !id) return false;

  try {
    const docRef = doc(db, COLLECTIONS.SURCHARGES, id);
    await deleteDoc(docRef);
    invalidateRateCaches();
    return true;
  } catch (err) {
    console.error(`[rateRepository] Error deleting surcharge ${id}:`, err);
    return false;
  }
}

/**
 * ============================================================================
 * RATE HISTORIES & AUDIT LOGS
 * ============================================================================
 */
export async function fetchRateHistories(forceRefresh = false): Promise<RateHistoryItem[]> {
  const now = Date.now();
  if (!forceRefresh && memoryHistoriesCache && (now - memoryHistoriesCache.cachedAt < CACHE_TTL_MS)) {
    return memoryHistoriesCache.data;
  }

  if (!db) return [];

  try {
    const q = query(
      collection(db, COLLECTIONS.RATE_HISTORIES),
      orderBy('timestamp', 'desc'),
      limit(200)
    );
    const snap = await getDocs(q);
    const items: RateHistoryItem[] = [];
    snap.forEach((d) => {
      items.push({ ...d.data() as RateHistoryItem, id: d.id });
    });

    memoryHistoriesCache = { data: items, cachedAt: now };
    return items;
  } catch (err) {
    console.error('[rateRepository] Error fetching rate histories from Firestore:', err);
    return memoryHistoriesCache ? memoryHistoriesCache.data : [];
  }
}

export async function addRateHistory(history: RateHistoryItem): Promise<RateHistoryItem> {
  const historyId = history.id || `hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const record: RateHistoryItem = {
    ...history,
    id: historyId,
    timestamp: history.timestamp || new Date().toISOString(),
  };

  if (!db) {
    invalidateRateCaches();
    return record;
  }

  try {
    const docRef = doc(db, COLLECTIONS.RATE_HISTORIES, historyId);
    await setDoc(docRef, {
      ...record,
      _createdAt: serverTimestamp(),
    }, { merge: true });

    invalidateRateCaches();
    return record;
  } catch (err) {
    console.error(`[rateRepository] Error recording rate history ${historyId}:`, err);
    return record;
  }
}
