/**
 * Phase 27: System Health & Data Integrity Audit Service
 * Records audit logs for save failures, safe retries, concurrency conflicts,
 * data integrity issues, and storage recoveries to Firestore `systemHealthAudits`.
 * Non-blocking, isolated, and company-scoped.
 */

import { collection, doc, setDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { SystemHealthAuditEntry } from '../../types/systemHealth';

const AUDIT_COLLECTION = 'systemHealthAudits';

// In-memory cache for fast UI access without Firestore queries
const memoryAuditLogs: SystemHealthAuditEntry[] = [];
const MAX_MEMORY_LOGS = 100;

export async function recordHealthAudit(entry: Omit<SystemHealthAuditEntry, 'id' | 'timestamp'>): Promise<void> {
  const timestamp = new Date().toISOString();
  const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullEntry: SystemHealthAuditEntry = {
    ...entry,
    id,
    timestamp,
  };

  // 1. Keep in memory for instant reactivity
  memoryAuditLogs.unshift(fullEntry);
  if (memoryAuditLogs.length > MAX_MEMORY_LOGS) {
    memoryAuditLogs.pop();
  }

  // 2. Persist to Firestore asynchronously without blocking business flow
  if (!db) return;

  try {
    const docRef = doc(db, AUDIT_COLLECTION, id);
    await setDoc(docRef, {
      ...fullEntry,
      _serverTimestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[systemHealthAuditService] Non-blocking notice writing health audit to Firestore:', err);
  }
}

export async function fetchHealthAudits(
  companyId?: string,
  limitCount = 30
): Promise<SystemHealthAuditEntry[]> {
  if (!db) {
    return memoryAuditLogs.slice(0, limitCount);
  }

  try {
    const collRef = collection(db, AUDIT_COLLECTION);
    const constraints: any[] = [];
    if (companyId) {
      constraints.push(where('companyId', '==', companyId));
    }
    constraints.push(orderBy('timestamp', 'desc'));
    constraints.push(limit(limitCount));

    const q = query(collRef, ...constraints);
    const snap = await getDocs(q);
    if (snap.empty) {
      return memoryAuditLogs.slice(0, limitCount);
    }

    const items: SystemHealthAuditEntry[] = [];
    snap.forEach((d) => {
      items.push({ ...(d.data() as SystemHealthAuditEntry), id: d.id });
    });
    return items;
  } catch (err) {
    console.warn('[systemHealthAuditService] Notice fetching audits, falling back to local logs:', err);
    return memoryAuditLogs.slice(0, limitCount);
  }
}

export function getCachedHealthAudits(): SystemHealthAuditEntry[] {
  return [...memoryAuditLogs];
}
