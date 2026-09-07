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
  DocumentSnapshot,
  where
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { QuoteData } from '../../types/logistics';
import { INITIAL_SAMPLE_QUOTE } from '../../data/presets';

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
    console.warn('[quotationRepository] Firestore is not initialized. Using initial sample fallback.');
    return [INITIAL_SAMPLE_QUOTE];
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
    const snap = await getDocs(q);

    if (snap.empty) {
      // If collection is completely empty, seed with initial sample quote in Cloud
      const initialQuote: QuoteData = {
        ...INITIAL_SAMPLE_QUOTE,
        version: 1,
        createdDate: new Date().toISOString().slice(0, 10),
        updatedDate: new Date().toISOString().slice(0, 10),
      };
      await saveQuotation(initialQuote, { forceOverwrite: true });
      return [initialQuote];
    }

    const items: QuoteData[] = [];
    snap.forEach((d) => {
      items.push({ ...d.data() as QuoteData, id: d.id });
    });

    // Update in-memory cache if this was an unfiltered query
    if (!status && !customerId) {
      memoryQuotesCache = {
        data: items,
        cachedAt: now,
      };
    }

    return items;
  } catch (error: any) {
    console.error('[quotationRepository] Error fetching quotations from Firestore:', error);
    // Return cached data if available on error
    if (memoryQuotesCache) return memoryQuotesCache.data;
    return [INITIAL_SAMPLE_QUOTE];
  }
}

/**
 * Get a single quotation by ID from Firestore (with single-item cache)
 */
export async function getQuotationById(id: string, forceRefresh = false): Promise<QuoteData | null> {
  if (!id) return null;

  const now = Date.now();
  const cached = memorySingleQuoteCache.get(id);
  if (!forceRefresh && cached && (now - cached.cachedAt < CACHE_TTL_MS)) {
    return cached.data;
  }

  if (!db) return null;

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = { ...snap.data() as QuoteData, id: snap.id };
    memorySingleQuoteCache.set(id, { data, cachedAt: now });
    return data;
  } catch (err) {
    console.error(`[quotationRepository] Error fetching quotation ${id}:`, err);
    return null;
  }
}

/**
 * Save quotation to Firestore with Cross-Device Concurrency & Conflict Detection
 */
export async function saveQuotation(
  quote: QuoteData,
  options?: {
    forceOverwrite?: boolean;
    userId?: string;
    userName?: string;
  }
): Promise<SaveQuotationResult> {
  if (!db) {
    return {
      success: false,
      message: 'Hệ thống Firebase Firestore chưa được khởi tạo.',
    };
  }

  try {
    const quoteId = quote.id || `quote-${Date.now()}`;
    const docRef = doc(db, COLLECTION_NAME, quoteId);

    // 1. Conflict Detection: check if existing document on Cloud has a newer version
    const existingSnap = await getDoc(docRef);
    let newVersion = 1;

    if (existingSnap.exists()) {
      const remoteData = existingSnap.data() as QuoteData;
      const remoteVersion = remoteData.version || 1;
      const localVersion = quote.version || 1;

      if (!options?.forceOverwrite && remoteVersion > localVersion) {
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

    const payload: QuoteData = {
      ...quote,
      id: quoteId,
      version: newVersion,
      updatedDate: new Date().toISOString().slice(0, 10),
      _updatedAt: serverTimestamp(),
      _updatedBy: options?.userId || quote._updatedBy || 'Sales User',
    };

    await setDoc(docRef, payload, { merge: true });

    // Invalidate and update caches
    invalidateQuotationCache();
    memorySingleQuoteCache.set(quoteId, {
      data: payload,
      cachedAt: Date.now(),
    });

    return {
      success: true,
      conflict: false,
      savedQuote: payload,
      message: `Đã lưu thành công lên Cloud (Phiên bản v${newVersion}).`,
    };
  } catch (error: any) {
    console.error('[quotationRepository] Error saving quotation to Firestore:', error);
    return {
      success: false,
      message: 'Lỗi khi lưu báo giá lên Firebase: ' + (error.message || 'Lỗi mạng hoặc quyền truy cập'),
    };
  }
}

/**
 * Delete quotation from Firestore
 */
export async function deleteQuotation(id: string): Promise<boolean> {
  if (!db || !id) return false;

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    invalidateQuotationCache();
    memorySingleQuoteCache.delete(id);
    return true;
  } catch (error) {
    console.error(`[quotationRepository] Error deleting quotation ${id}:`, error);
    return false;
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
    console.warn('[quotationRepository] Error auto-saving active draft to Firestore:', err);
    return '';
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
    const snap = await getDoc(draftRef);
    if (!snap.exists()) return { quote: null, savedAt: null };

    const data = snap.data() as CloudDraftRecord;
    return {
      quote: data.quote || null,
      savedAt: data.savedAt || null,
    };
  } catch (err) {
    console.warn('[quotationRepository] Error loading active draft from Firestore:', err);
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
