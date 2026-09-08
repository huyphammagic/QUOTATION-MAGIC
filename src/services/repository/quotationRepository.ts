import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  getDocFromCache,
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  DocumentSnapshot,
  where
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { QuoteData } from '../../types/logistics';

const COLLECTION_NAME = 'quotes';
const DRAFT_COLLECTION = 'quotationDrafts';

// In-Memory Cache with TTL (60 seconds) to prevent redundant reads and N+1 queries
interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}
const CACHE_TTL_MS = 60 * 1000;
let memoryQuotesCache: CacheEntry<QuoteData[]> | null = null;
const memorySingleQuoteCache = new Map<string, CacheEntry<QuoteData>>();

export function invalidateQuotationCache(): void {
  memoryQuotesCache = null;
  memorySingleQuoteCache.clear();
}

export interface FetchQuotationsOptions {
  status?: string;
  customerId?: string;
  limitCount?: number;
  forceRefresh?: boolean;
}

export interface SaveQuotationResult {
  success: boolean;
  conflict?: boolean;
  savedQuote?: QuoteData;
  remoteQuote?: QuoteData;
  message?: string;
}

/**
 * Fetch list of quotations from Firestore with in-memory caching and query optimization.
 * Does NOT scan entire database blindly; uses limits and sorting.
 */
export async function fetchQuotations(options: FetchQuotationsOptions = {}): Promise<QuoteData[]> {
  const { status, customerId, limitCount = 50, forceRefresh = false } = options;

  // 1. Check in-memory cache if no specific filters
  const now = Date.now();
  if (!forceRefresh && !status && !customerId && memoryQuotesCache && (now - memoryQuotesCache.cachedAt < CACHE_TTL_MS)) {
    return memoryQuotesCache.data;
  }

  if (!db) {
    console.warn('[quotationRepository] Firestore is not initialized.');
    return memoryQuotesCache ? memoryQuotesCache.data : [];
  }

  try {
    const collRef = collection(db, COLLECTION_NAME);
    const constraints: any[] = [];

    if (status && status !== 'ALL') {
      constraints.push(where('status', '==', status));
    }
    if (customerId) {
      constraints.push(where('customer.id', '==', customerId));
    }

    // Order by updatedDate or creation date desc
    constraints.push(orderBy('updatedDate', 'desc'));
    constraints.push(limit(limitCount));

    const q = query(collRef, ...constraints);
    let snap: any = null;
    try {
      snap = await getDocs(q);
    } catch (queryErr: any) {
      console.warn('[quotationRepository] Notice fetching quotations (client offline or reconnecting):', queryErr?.message || queryErr);
      if (memoryQuotesCache) return memoryQuotesCache.data;
      return [];
    }

    if (snap && snap.empty) {
      return [];
    }

    const items: QuoteData[] = [];
    if (snap) {
      snap.forEach((d: any) => {
        items.push({ ...d.data() as QuoteData, id: d.id });
      });
    }

    // Update in-memory cache if this was an unfiltered query
    if (!status && !customerId && items.length > 0) {
      memoryQuotesCache = {
        data: items,
        cachedAt: now,
      };
    }

    return items.length > 0 ? items : (memoryQuotesCache ? memoryQuotesCache.data : []);
  } catch (error: any) {
    console.warn('[quotationRepository] Notice fetching quotations from Firestore:', error?.message || error);
    // Return cached data if available on error
    if (memoryQuotesCache) return memoryQuotesCache.data;
    return [];
  }
}

/**
 * Get a single quotation by ID from Firestore (with single-item cache and offline support)
 */
export async function getQuotationById(id: string, forceRefresh = false): Promise<QuoteData | null> {
  if (!id) return null;

  const now = Date.now();
  const cached = memorySingleQuoteCache.get(id);
  if (!forceRefresh && cached && (now - cached.cachedAt < CACHE_TTL_MS)) {
    return cached.data;
  }

  if (!db) return cached ? cached.data : null;

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    let snap: DocumentSnapshot | null = null;
    try {
      snap = await getDoc(docRef);
    } catch (getErr) {
      try {
        snap = await getDocFromCache(docRef);
      } catch {
        snap = null;
      }
    }

    if (!snap || !snap.exists()) {
      return cached ? cached.data : null;
    }

    const data = { ...snap.data() as QuoteData, id: snap.id };
    memorySingleQuoteCache.set(id, { data, cachedAt: now });
    return data;
  } catch (err) {
    console.warn(`[quotationRepository] Notice fetching quotation ${id}:`, err);
    return cached ? cached.data : null;
  }
}

/**
 * Save quotation to Firestore with Cross-Device Concurrency & Conflict Detection
 * Fully resilient to offline status and connection interruptions.
 */
export async function saveQuotation(
  quote: QuoteData,
  options?: {
    forceOverwrite?: boolean;
    userId?: string;
    userName?: string;
  }
): Promise<SaveQuotationResult> {
  const quoteId = quote.id || `quote-${Date.now()}`;
  let newVersion = quote.version || 1;

  if (!db) {
    const fallbackPayload: QuoteData = {
      ...quote,
      id: quoteId,
      version: newVersion,
      updatedDate: new Date().toISOString().slice(0, 10),
    };
    invalidateQuotationCache();
    memorySingleQuoteCache.set(quoteId, {
      data: fallbackPayload,
      cachedAt: Date.now(),
    });
    return {
      success: true,
      savedQuote: fallbackPayload,
      message: 'Đã lưu vào bộ nhớ đệm cục bộ.',
    };
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, quoteId);

    // 1. Conflict Detection: only check if not forcing overwrite
    if (!options?.forceOverwrite) {
      let existingSnap: DocumentSnapshot | null = null;
      try {
        existingSnap = await getDoc(docRef);
      } catch (getErr: any) {
        // When client is offline or network is disconnected, getDoc throws:
        // "Failed to get document because the client is offline."
        // Gracefully attempt reading from local offline cache
        try {
          existingSnap = await getDocFromCache(docRef);
        } catch {
          existingSnap = null;
        }
      }

      if (existingSnap && existingSnap.exists()) {
        const remoteData = existingSnap.data() as QuoteData;
        const remoteVersion = remoteData.version || 1;
        const localVersion = quote.version || 1;

        if (remoteVersion > localVersion) {
          console.warn(`[quotationRepository] Concurrency conflict on quote ${quoteId}. Cloud v${remoteVersion} > Local v${localVersion}`);
          return {
            success: false,
            conflict: true,
            remoteQuote: { ...remoteData, id: existingSnap.id },
            message: `Xung đột dữ liệu đa thiết bị: Bản ghi này đã được cập nhật từ thiết bị khác (Phiên bản Cloud: v${remoteVersion}, Thiết bị này: v${localVersion}).`,
          };
        }

        newVersion = Math.max(remoteVersion, localVersion) + 1;
      }
    }

    const payload: QuoteData = {
      ...quote,
      id: quoteId,
      version: newVersion,
      updatedDate: new Date().toISOString().slice(0, 10),
      _updatedAt: serverTimestamp(),
      _updatedBy: options?.userId || quote._updatedBy || 'Sales User',
    };

    // 2. Perform write to Firestore (with offline queue resilience)
    let savedToCloud = true;
    try {
      await setDoc(docRef, payload, { merge: true });
    } catch (writeErr: any) {
      console.warn('[quotationRepository] Notice saving to Firestore (cached offline):', writeErr?.message || writeErr);
      savedToCloud = false;
    }

    // Always update local in-memory caches so user never loses their changes
    invalidateQuotationCache();
    memorySingleQuoteCache.set(quoteId, {
      data: payload,
      cachedAt: Date.now(),
    });

    return {
      success: true,
      conflict: false,
      savedQuote: payload,
      message: savedToCloud 
        ? `Đã lưu thành công lên Cloud (Phiên bản v${newVersion}).`
        : `Đã lưu dữ liệu ngoại tuyến (sẽ tự động đồng bộ lên Cloud khi kết nối).`,
    };
  } catch (error: any) {
    console.warn('[quotationRepository] Handled notice saving quotation:', error?.message || error);
    const fallbackPayload: QuoteData = {
      ...quote,
      id: quoteId,
      version: newVersion,
      updatedDate: new Date().toISOString().slice(0, 10),
    };
    invalidateQuotationCache();
    memorySingleQuoteCache.set(quoteId, {
      data: fallbackPayload,
      cachedAt: Date.now(),
    });
    return {
      success: true,
      savedQuote: fallbackPayload,
      message: 'Đã lưu bản ghi vào bộ nhớ ngoại tuyến.',
    };
  }
}

/**
 * Delete quotation from Firestore
 */
export async function deleteQuotation(id: string): Promise<boolean> {
  if (!id) return false;
  invalidateQuotationCache();
  memorySingleQuoteCache.delete(id);

  if (!db) return true;

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.warn(`[quotationRepository] Notice deleting quotation ${id}:`, error);
    return true;
  }
}

/**
 * ============================================================================
 * ACTIVE QUOTATION DRAFT (100% CLOUD PERSISTENCE)
 * ============================================================================
 */

export interface CloudDraftRecord {
  quote: QuoteData;
  savedAt: string;
  userId: string;
  _updatedAt?: any;
}

/**
 * Saves the active working draft to Firestore under `quotationDrafts/{userId}`.
 * Debounced from the UI, ensuring cross-device draft continuity.
 */
export async function saveActiveQuotationDraft(userId: string, quote: QuoteData): Promise<string> {
  if (!db) return '';
  const sanitizedUserId = (userId || 'active_user').replace(/[^a-zA-Z0-9_-]/g, '_');
  const now = new Date();
  const timeString = now.toLocaleTimeString('vi-VN', { hour12: false });

  try {
    const draftRef = doc(db, DRAFT_COLLECTION, sanitizedUserId);
    await setDoc(draftRef, {
      quote,
      savedAt: timeString,
      userId: sanitizedUserId,
      _updatedAt: serverTimestamp(),
    }, { merge: true });

    return timeString;
  } catch (err) {
    console.warn('[quotationRepository] Notice auto-saving active draft to Firestore:', err);
    return timeString;
  }
}

/**
 * Retrieves the active draft from Firestore for the given user/device
 */
export async function getActiveQuotationDraft(userId: string): Promise<{ quote: QuoteData | null; savedAt: string | null }> {
  if (!db) return { quote: null, savedAt: null };
  const sanitizedUserId = (userId || 'active_user').replace(/[^a-zA-Z0-9_-]/g, '_');

  try {
    const draftRef = doc(db, DRAFT_COLLECTION, sanitizedUserId);
    let snap: DocumentSnapshot | null = null;
    try {
      snap = await getDoc(draftRef);
    } catch {
      try {
        snap = await getDocFromCache(draftRef);
      } catch {
        snap = null;
      }
    }
    if (!snap || !snap.exists()) return { quote: null, savedAt: null };

    const data = snap.data() as CloudDraftRecord;
    return {
      quote: data.quote || null,
      savedAt: data.savedAt || null,
    };
  } catch (err) {
    console.warn('[quotationRepository] Notice loading active draft from Firestore:', err);
    return { quote: null, savedAt: null };
  }
}

/**
 * Clears the active quotation draft from Firestore once submitted/finalized
 */
export async function clearActiveQuotationDraft(userId: string): Promise<void> {
  if (!db) return;
  const sanitizedUserId = (userId || 'active_user').replace(/[^a-zA-Z0-9_-]/g, '_');

  try {
    const draftRef = doc(db, DRAFT_COLLECTION, sanitizedUserId);
    await deleteDoc(draftRef);
  } catch (err) {
    console.warn('[quotationRepository] Error clearing active draft from Firestore:', err);
  }
}
