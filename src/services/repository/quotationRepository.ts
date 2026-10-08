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
import { syncHealthService, classifyErrorToSaveState } from '../integrity/syncHealthService';
import { recordHealthAudit } from '../audit/systemHealthAuditService';

import { validateQuotationIntegrity, isQuotationLocked } from '../integrity/quotationIntegrityEngine';

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
  companyId?: string;
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
  const targetCompany = options.companyId || localStorage.getItem('logistics_active_company_id') || undefined;
  const { status, customerId, limitCount = 50, forceRefresh = false } = options;

  // 1. Check in-memory cache if no specific filters
  const now = Date.now();
  if (!forceRefresh && !targetCompany && !status && !customerId && memoryQuotesCache && (now - memoryQuotesCache.cachedAt < CACHE_TTL_MS)) {
    return memoryQuotesCache.data;
  }

  if (!db) {
    return memoryQuotesCache ? memoryQuotesCache.data : [];
  }

  try {
    const collRef = collection(db, COLLECTION_NAME);
    const constraints: any[] = [];

    if (targetCompany) {
      constraints.push(where('companyId', '==', targetCompany));
    }
    if (status && status !== 'ALL') {
      constraints.push(where('status', '==', status));
    }
    if (customerId) {
      constraints.push(where('customer.id', '==', customerId));
    }

    // Order by updatedDate or creation date desc
    constraints.push(orderBy('updatedDate', 'desc'));
    constraints.push(limit(limitCount));

    let snap: any = null;
    try {
      const q = query(collRef, ...constraints);
      snap = await getDocs(q);
    } catch (queryErr: any) {
      if (targetCompany) {
        try {
          const fallbackQ = query(collRef, where('companyId', '==', targetCompany), limit(limitCount));
          snap = await getDocs(fallbackQ);
        } catch {
          if (memoryQuotesCache) return memoryQuotesCache.data;
          return [];
        }
      } else {
        if (memoryQuotesCache) return memoryQuotesCache.data;
        return [];
      }
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

    // Sort in memory by updatedDate or createdDate desc
    items.sort((a, b) => (b.updatedDate || b.createdDate || '').localeCompare(a.updatedDate || a.createdDate || ''));

    // Update in-memory cache if this was an unfiltered query
    if (!status && !customerId && items.length > 0) {
      memoryQuotesCache = {
        data: items,
        cachedAt: now,
      };
    }

    return items.length > 0 ? items : (memoryQuotesCache ? memoryQuotesCache.data : []);
  } catch (error: any) {
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
    companyId?: string;
  }
): Promise<SaveQuotationResult> {
  const quoteId = quote.id || `quote-${Date.now()}`;
  let newVersion = quote.version || 1;
  const effectiveCompanyId = quote.companyId || (quote.company as any)?.companyId || options?.companyId || 'company_profile';

  if (!db) {
    const fallbackPayload: QuoteData = {
      ...quote,
      id: quoteId,
      companyId: effectiveCompanyId,
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

  const opKey = `save_quote_${quoteId}_${Date.now()}`;
  syncHealthService.startOperation(opKey, {
    entityType: 'Quotation',
    entityId: quoteId,
    action: 'UPDATE',
  });

  try {
    const docRef = doc(db, COLLECTION_NAME, quoteId);

    // 1. Conflict Detection & Integrity Verification via Local Cache & Fast Check
    let existingQuoteData: QuoteData | null = memorySingleQuoteCache.get(quoteId)?.data || null;

    if (!existingQuoteData && !options?.forceOverwrite) {
      try {
        const cachedSnap = await getDocFromCache(docRef);
        if (cachedSnap.exists()) {
          existingQuoteData = cachedSnap.data() as QuoteData;
        }
      } catch {
        // Cache miss is completely normal for new quotes
      }
    }

    if (existingQuoteData) {
      const remoteVersion = existingQuoteData.version || 1;
      const localVersion = quote.version || 1;
      if (!options?.forceOverwrite && remoteVersion > localVersion) {
        console.warn(`[quotationRepository] Concurrency conflict on quote ${quoteId}. Cloud v${remoteVersion} > Local v${localVersion}`);
        syncHealthService.setSaveState('CONFLICT', `Xung đột phiên bản: Cloud v${remoteVersion} > Máy này v${localVersion}`);
        syncHealthService.endOperation(opKey, false, new Error('Xung đột phiên bản'));

        return {
          success: false,
          conflict: true,
          remoteQuote: { ...existingQuoteData, id: quoteId },
          message: `Xung đột dữ liệu đa thiết bị: Bản ghi này đã được cập nhật từ thiết bị khác (Phiên bản Cloud: v${remoteVersion}, Thiết bị này: v${localVersion}).`,
        };
      }
      newVersion = Math.max(remoteVersion, localVersion) + 1;
    }

    // Integrity & State Transition Validation (Phase 32)
    const integrityCheck = validateQuotationIntegrity(quote, {
      isExistingQuote: !!existingQuoteData,
      existingStatus: existingQuoteData?.status,
      userRole: (options as any)?.userRole || 'SALES_REP',
    });

    if (!integrityCheck.canSave) {
      const criticalMsg = integrityCheck.issues.filter(i => i.severity === 'CRITICAL').map(i => i.messageVi).join('; ');
      syncHealthService.setSaveState('SAVE_FAILED', criticalMsg || 'Vi phạm toàn vẹn dữ liệu.');
      syncHealthService.endOperation(opKey, false, new Error(criticalMsg));
      return {
        success: false,
        conflict: false,
        message: `Không thể lưu báo giá: ${criticalMsg}`,
      };
    }

    const payload: QuoteData = {
      ...quote,
      id: quoteId,
      companyId: effectiveCompanyId,
      version: newVersion,
      updatedDate: new Date().toISOString().slice(0, 10),
      _updatedAt: serverTimestamp(),
      _updatedBy: options?.userId || quote._updatedBy || 'Sales User',
    };

    // 2. Offline check prior to write
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      syncHealthService.setSaveState('OFFLINE', 'Không thể lưu lên Cloud khi mất kết nối mạng.');
      syncHealthService.endOperation(opKey, false, new Error('Offline'));
      return {
        success: false,
        conflict: false,
        message: 'Thiết bị đang ngoại tuyến. Dữ liệu chưa thể lưu lên Cloud.',
      };
    }

    // 3. Perform write to Firestore (Strict confirmation before reporting success)
    await setDoc(docRef, payload, { merge: true });

    // Confirm write was acknowledged and client is online
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      syncHealthService.setSaveState('OFFLINE', 'Đã ghi nhận ngoại tuyến, chưa được xác nhận bởi Cloud.');
      syncHealthService.endOperation(opKey, false, new Error('Offline'));
      return {
        success: false,
        conflict: false,
        message: 'Đang ở chế độ ngoại tuyến. Dữ liệu chưa được xác nhận bởi Cloud.',
      };
    }

    // Update in-memory caches only after confirmed Firebase Cloud write
    invalidateQuotationCache();
    memorySingleQuoteCache.set(quoteId, {
      data: payload,
      cachedAt: Date.now(),
    });

    syncHealthService.setSaveState('SAVED_TO_CLOUD', `Đã lưu thành công lên Cloud (v${newVersion})`);
    syncHealthService.endOperation(opKey, true);

    return {
      success: true,
      conflict: false,
      savedQuote: payload,
      message: `Đã lưu thành công lên Cloud (Phiên bản v${newVersion}).`,
    };
  } catch (error: any) {
    console.error('[quotationRepository] Error saving quotation to Firebase:', error?.message || error);
    const classified = classifyErrorToSaveState(error);
    syncHealthService.setSaveState(classified.state, classified.messageVi);
    syncHealthService.endOperation(opKey, false, error);
    return {
      success: false,
      conflict: false,
      message: classified.messageVi || error?.message || 'Lỗi khi lưu báo giá lên Firebase.',
    };
  }
}

/**
 * Delete quotation from Firestore with strict confirmation
 */
export async function deleteQuotation(id: string): Promise<boolean> {
  if (!id) return false;
  if (!db) {
    syncHealthService.setSaveState('OFFLINE', 'Không thể xóa báo giá khi mất kết nối Cloud');
    return false;
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    invalidateQuotationCache();
    memorySingleQuoteCache.delete(id);
    return true;
  } catch (error: any) {
    console.error(`[quotationRepository] Notice deleting quotation ${id}:`, error);
    const classified = classifyErrorToSaveState(error);
    syncHealthService.setSaveState(classified.state, classified.messageVi);
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
