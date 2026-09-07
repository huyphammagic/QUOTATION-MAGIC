import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  limit, 
  updateDoc, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  QuotationSecureLink, 
  SecureLinkStatus, 
  CommunicationLanguage,
  QuotationCustomerResponse 
} from '../../types/quotationCommunication';
import { QuotationDocumentRecord } from '../../types/quotationDocument';
import { QuoteData } from '../../types/logistics';
import { getDocumentById } from './quotationDocumentService';
import { saveQuoteToFirestore } from '../firebase/firestoreService';

const COLLECTION_LINKS = 'quotationLinks';
const COLLECTION_RESPONSES = 'quotationResponses';

// In-memory cache (NO LOCAL STORAGE BUSINESS DATA - PHASE 17)
let memoryLinks: QuotationSecureLink[] = [];
let memoryResponses: QuotationCustomerResponse[] = [];

function getLocalLinks(): QuotationSecureLink[] {
  return memoryLinks;
}

function saveLocalLinks(links: QuotationSecureLink[]) {
  memoryLinks = links;
}

function getLocalResponses(): QuotationCustomerResponse[] {
  return memoryResponses;
}

function saveLocalResponses(responses: QuotationCustomerResponse[]) {
  memoryResponses = responses;
}

/**
 * Generates a cryptographically strong random token (32 alphanumeric chars)
 */
export function generateSecureToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes SHA-256 hash of a string using Web Crypto API
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface CreateSecureLinkParams {
  companyId?: string;
  quotationId: string;
  quotationNumber: string;
  revision: number;
  documentId: string;
  customerName: string;
  customerEmail: string;
  language?: CommunicationLanguage;
  expirationDays?: number; // e.g. 1, 3, 7, 14, 30, or undefined for custom
  customExpirationDate?: string;
  maxViews?: number;
  createdBy: string;
}

/**
 * Creates a secure immutable link pointing to a sanitized customer quotation document
 */
export async function createQuotationSecureLink(params: CreateSecureLinkParams): Promise<{
  linkRecord: QuotationSecureLink;
  rawToken: string;
  shareableUrl: string;
}> {
  const rawToken = generateSecureToken();
  const tokenHash = await hashToken(rawToken);
  const linkId = `link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Calculate expiration date
  let expiresAt: string;
  if (params.customExpirationDate) {
    expiresAt = params.customExpirationDate;
  } else {
    const days = params.expirationDays ?? 7;
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + days);
    expiresAt = expDate.toISOString();
  }

  const linkRecord: QuotationSecureLink = {
    id: linkId,
    companyId: params.companyId || 'default-company',
    quotationId: params.quotationId,
    quotationNumber: params.quotationNumber,
    revision: params.revision,
    documentId: params.documentId,
    tokenHash,
    tokenPrefix: rawToken.substring(0, 6),
    expiresAt,
    status: 'ACTIVE',
    maxViews: params.maxViews,
    viewCount: 0,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    language: params.language || 'vi',
    createdBy: params.createdBy,
    createdAt: new Date().toISOString(),
  };

  // Save to local cache
  const local = getLocalLinks();
  saveLocalLinks([linkRecord, ...local]);

  // Save to Firestore
  if (db) {
    try {
      const docRef = doc(db, COLLECTION_LINKS, linkId);
      await setDoc(docRef, {
        ...linkRecord,
        _updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore create link notice:', err);
    }
  }

  // Construct shareable URL
  const baseUrl = window.location.origin;
  const shareableUrl = `${baseUrl}/q/${rawToken}`;

  return {
    linkRecord: { ...linkRecord, token: rawToken },
    rawToken,
    shareableUrl,
  };
}

/**
 * Resolves a token safely by hashing and looking up strictly active link and sanitized document.
 * Returns null if token is invalid, expired, or revoked (without leaking internal info).
 */
export async function resolveSecureLink(rawToken: string): Promise<{
  isValid: boolean;
  errorCode?: 'NOT_FOUND' | 'EXPIRED' | 'REVOKED' | 'MAX_VIEWS_REACHED';
  link?: QuotationSecureLink;
  document?: QuotationDocumentRecord;
}> {
  if (!rawToken || rawToken.trim() === '') {
    return { isValid: false, errorCode: 'NOT_FOUND' };
  }

  const tokenHash = await hashToken(rawToken.trim());
  let targetLink: QuotationSecureLink | null = null;

  // Query Firestore with tokenHash filter (indexed query)
  if (db) {
    try {
      const q = query(
        collection(db, COLLECTION_LINKS),
        where('tokenHash', '==', tokenHash),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        targetLink = { ...d.data() as QuotationSecureLink, id: d.id };
      }
    } catch (err) {
      console.warn('Firestore query token notice:', err);
    }
  }

  // Fallback to local storage if offline / testing
  if (!targetLink) {
    const local = getLocalLinks();
    targetLink = local.find(l => l.tokenHash === tokenHash) || null;
  }

  if (!targetLink) {
    return { isValid: false, errorCode: 'NOT_FOUND' };
  }

  // Check if link is revoked
  if (targetLink.status === 'REVOKED') {
    return { isValid: false, errorCode: 'REVOKED', link: targetLink };
  }

  // Check expiration
  const now = new Date().toISOString();
  if (targetLink.expiresAt && targetLink.expiresAt < now) {
    return { isValid: false, errorCode: 'EXPIRED', link: targetLink };
  }

  // Check max views
  if (targetLink.maxViews && targetLink.viewCount >= targetLink.maxViews) {
    return { isValid: false, errorCode: 'MAX_VIEWS_REACHED', link: targetLink };
  }

  // Retrieve the immutable document
  const docRecord = await getDocumentById(targetLink.documentId);
  if (!docRecord) {
    return { isValid: false, errorCode: 'NOT_FOUND' };
  }

  // Double check document type: MUST be CUSTOMER_QUOTATION or CONFIRMATION_NOTICE
  if (docRecord.documentType === 'INTERNAL_QUOTATION') {
    console.error('CRITICAL: Attempted to resolve an INTERNAL_QUOTATION via customer link.');
    return { isValid: false, errorCode: 'REVOKED' };
  }

  // Track view asynchronously
  recordLinkView(targetLink.id);

  return {
    isValid: true,
    link: targetLink,
    document: docRecord,
  };
}

/**
 * Tracks link view count and timestamps
 */
export async function recordLinkView(linkId: string): Promise<void> {
  const now = new Date().toISOString();

  // Update local cache
  const local = getLocalLinks();
  const idx = local.findIndex(l => l.id === linkId);
  if (idx >= 0) {
    const item = local[idx];
    item.viewCount = (item.viewCount || 0) + 1;
    item.lastViewedAt = now;
    if (!item.firstViewedAt) item.firstViewedAt = now;
    local[idx] = item;
    saveLocalLinks(local);
  }

  if (db) {
    try {
      const docRef = doc(db, COLLECTION_LINKS, linkId);
      await updateDoc(docRef, {
        viewCount: increment(1),
        lastViewedAt: now,
        _lastViewedAtServer: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore update link view count notice:', err);
    }
  }
}

/**
 * Revokes a secure link so that the customer can no longer access it
 */
export async function revokeSecureLink(
  linkId: string, 
  revokedBy: string, 
  reason: string = 'Manually revoked by sales agent'
): Promise<void> {
  const now = new Date().toISOString();

  const local = getLocalLinks();
  const idx = local.findIndex(l => l.id === linkId);
  if (idx >= 0) {
    local[idx].status = 'REVOKED';
    local[idx].revokedAt = now;
    local[idx].revokedBy = revokedBy;
    local[idx].revokeReason = reason;
    saveLocalLinks(local);
  }

  if (db) {
    try {
      const docRef = doc(db, COLLECTION_LINKS, linkId);
      await updateDoc(docRef, {
        status: 'REVOKED',
        revokedAt: now,
        revokedBy,
        revokeReason: reason,
        _updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore revoke link notice:', err);
    }
  }
}

/**
 * Fetches all secure links for a specific quotation
 */
export async function getLinksForQuotation(quotationId: string): Promise<QuotationSecureLink[]> {
  if (db) {
    try {
      const q = query(
        collection(db, COLLECTION_LINKS),
        where('quotationId', '==', quotationId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: QuotationSecureLink[] = [];
        snap.forEach(d => list.push({ ...d.data() as QuotationSecureLink, id: d.id }));
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return list;
      }
    } catch (err) {
      console.warn('Firestore getLinksForQuotation notice:', err);
    }
  }

  const local = getLocalLinks();
  return local.filter(l => l.quotationId === quotationId);
}

/**
 * Submits a Customer Response (ACCEPT, REJECT, or REVISION_REQUESTED)
 */
export async function submitCustomerResponse(params: {
  link: QuotationSecureLink;
  responseType: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED';
  customerName: string;
  customerEmail: string;
  rejectionReason?: string;
  revisionMessage?: string;
  notes?: string;
}): Promise<QuotationCustomerResponse> {
  const { link, responseType, customerName, customerEmail, rejectionReason, revisionMessage, notes } = params;
  const responseId = `resp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const responseRecord: QuotationCustomerResponse = {
    id: responseId,
    companyId: link.companyId,
    quotationId: link.quotationId,
    quotationNumber: link.quotationNumber,
    documentId: link.documentId,
    revision: link.revision,
    linkId: link.id,
    responseType,
    customerName,
    customerEmail,
    respondedAt: now,
    rejectionReason,
    revisionMessage,
    notes,
    userAgent: navigator.userAgent,
  };

  // Save to local cache
  const localResponses = getLocalResponses();
  saveLocalResponses([responseRecord, ...localResponses]);

  // Save to Firestore
  if (db) {
    try {
      const docRef = doc(db, COLLECTION_RESPONSES, responseId);
      await setDoc(docRef, {
        ...responseRecord,
        _serverTimestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore customer response save notice:', err);
    }
  }

  return responseRecord;
}

/**
 * Fetches all customer responses for a quotation
 */
export async function getCustomerResponses(quotationId: string): Promise<QuotationCustomerResponse[]> {
  if (db) {
    try {
      const q = query(
        collection(db, COLLECTION_RESPONSES),
        where('quotationId', '==', quotationId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: QuotationCustomerResponse[] = [];
        snap.forEach(d => list.push({ ...d.data() as QuotationCustomerResponse, id: d.id }));
        list.sort((a, b) => b.respondedAt.localeCompare(a.respondedAt));
        return list;
      }
    } catch (err) {
      console.warn('Firestore getCustomerResponses notice:', err);
    }
  }

  const local = getLocalResponses();
  return local.filter(r => r.quotationId === quotationId);
}

/**
 * Fetches all customer responses across the entire system for aggregate analytics
 */
export async function getAllCustomerResponses(): Promise<QuotationCustomerResponse[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, COLLECTION_RESPONSES));
      if (!snap.empty) {
        const list: QuotationCustomerResponse[] = [];
        snap.forEach(d => list.push({ ...d.data() as QuotationCustomerResponse, id: d.id }));
        return list;
      }
    } catch (err) {
      console.warn('Firestore getAllCustomerResponses notice:', err);
    }
  }
  return getLocalResponses();
}

/**
 * Fetches all secure share links across the entire system for analytics
 */
export async function getAllSecureLinks(): Promise<QuotationSecureLink[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, COLLECTION_LINKS));
      if (!snap.empty) {
        const list: QuotationSecureLink[] = [];
        snap.forEach(d => list.push({ ...d.data() as QuotationSecureLink, id: d.id }));
        return list;
      }
    } catch (err) {
      console.warn('Firestore getAllSecureLinks notice:', err);
    }
  }
  return getLocalLinks();
}
