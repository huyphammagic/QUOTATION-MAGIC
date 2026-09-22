import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export interface CRMAuditLog {
  id: string;
  companyId: string;
  customerId?: string;
  entityType: 'CUSTOMER' | 'ACTIVITY' | 'FOLLOW_UP' | 'RATE_REVIEW' | 'OPPORTUNITY' | 'CONTACT';
  entityId: string;
  action: string;
  performedBy: string;
  performedByName: string;
  timestamp: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata?: Record<string, any>;
}

const COLLECTION_NAME = 'crmAuditLogs';

export async function logCRMAudit(entry: Omit<CRMAuditLog, 'id' | 'timestamp'>): Promise<void> {
  if (!db) return;
  try {
    const logId = `crm_audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const docRef = doc(db, COLLECTION_NAME, logId);
    
    // Clean undefined values
    const cleanEntry: Record<string, any> = {
      id: logId,
      companyId: entry.companyId || 'default-company',
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      performedBy: entry.performedBy || 'system',
      performedByName: entry.performedByName || 'System',
      timestamp: nowIso,
      createdAt: serverTimestamp()
    };

    if (entry.customerId) cleanEntry.customerId = entry.customerId;
    if (entry.previousState) cleanEntry.previousState = entry.previousState;
    if (entry.newState) cleanEntry.newState = entry.newState;
    if (entry.metadata) cleanEntry.metadata = entry.metadata;

    await setDoc(docRef, cleanEntry);
  } catch (error) {
    console.error('[CRMAuditService] Failed to write audit log:', error);
  }
}
