import { collection, doc, setDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { PricingAuditRecord } from '../../types/pricingIntelligence';

const COLLECTION_NAME = 'pricingAudits';

/**
 * Records an immutable pricing audit trail event in Firestore
 */
export async function recordPricingAuditEvent(audit: Omit<PricingAuditRecord, 'id' | 'timestamp'>): Promise<string> {
  const auditId = `audit-price-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const docRef = doc(db, COLLECTION_NAME, auditId);
  
  const payload: PricingAuditRecord = {
    ...audit,
    id: auditId,
    timestamp: new Date().toISOString(),
  };

  try {
    await setDoc(docRef, payload);
    return auditId;
  } catch (err) {
    console.warn('Could not record pricing audit event:', err);
    return auditId;
  }
}

/**
 * Fetches audit records for a specific quotation with limit (Zero full scan)
 */
export async function getPricingAuditRecordsForQuotation(
  quotationId: string,
  limitCount: number = 20
): Promise<PricingAuditRecord[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('quotationId', '==', quotationId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    const records: PricingAuditRecord[] = [];
    snapshot.forEach(d => records.push(d.data() as PricingAuditRecord));
    return records;
  } catch (err) {
    console.warn('Error fetching pricing audits for quote:', err);
    return [];
  }
}
