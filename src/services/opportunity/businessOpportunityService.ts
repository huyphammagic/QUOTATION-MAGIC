import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  limit 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  BusinessOpportunity, 
  OpportunityFilterOptions, 
  OpportunityRadarMetrics, 
  OpportunityStatus, 
  BusinessOpportunityType, 
  DataSufficiencyLevel,
  OpportunityAuditLog
} from '../../types/opportunity';
import { 
  detectRealBusinessOpportunities, 
  OpportunityDetectionContext 
} from './opportunityDetectionEngine';
import { logCRMAudit } from '../crm/crmAuditService';

const OPPORTUNITIES_COLLECTION = 'businessOpportunities';
const AUDIT_COLLECTION = 'opportunityAuditLogs';

// In-memory cache for snappy optimistic UI response and fast tab switching
const opportunityMemoryCache = new Map<string, BusinessOpportunity>();

/**
 * Log audit trail for an opportunity
 */
export async function logOpportunityAudit(
  log: Omit<OpportunityAuditLog, 'id' | 'timestamp'>,
  user?: { email?: string; name?: string }
): Promise<void> {
  const id = `opp_aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const auditRecord: OpportunityAuditLog = {
    ...log,
    id,
    performedBy: user?.email || log.performedBy || 'system',
    performedByName: user?.name || log.performedByName || 'Logistics System',
    timestamp: now
  };

  if (db) {
    try {
      const docRef = doc(db, AUDIT_COLLECTION, id);
      await setDoc(docRef, auditRecord);
    } catch (err) {
      console.warn('[OpportunityService] Failed to persist audit log to Firestore:', err);
    }
  }
}

/**
 * Scan real business records and sync newly detected opportunities idempotently
 * Never deletes or resets existing opportunities. Only updates or inserts.
 */
export async function syncRealBusinessOpportunities(
  context: OpportunityDetectionContext
): Promise<{ syncedCount: number; activeTotal: number; opportunities: BusinessOpportunity[] }> {
  const detected = detectRealBusinessOpportunities(context);
  const companyId = context.companyId || 'default-company';
  const now = new Date().toISOString();

  // Load existing opportunities for this company to prevent duplication
  const existingMap = new Map<string, BusinessOpportunity>();
  
  if (db) {
    try {
      const collRef = collection(db, OPPORTUNITIES_COLLECTION);
      const q = query(collRef, where('companyId', '==', companyId), limit(500));
      const snap = await getDocs(q);
      snap.forEach(d => {
        const item = d.data() as BusinessOpportunity;
        const key = item.idempotencyKey || `${item.companyId}_${item.customerId}_${item.opportunityType}_${item.sourceEntityId}`;
        existingMap.set(key, item);
        opportunityMemoryCache.set(item.id, item);
      });
    } catch (err) {
      console.warn('[OpportunityService] Failed to read existing opportunities from Firestore, relying on memory cache:', err);
    }
  }

  let syncedCount = 0;

  for (const opp of detected) {
    const key = opp.idempotencyKey || `${opp.companyId}_${opp.customerId}_${opp.opportunityType}_${opp.sourceEntityId}`;
    const existing = existingMap.get(key);

    if (!existing) {
      // New opportunity detected
      opportunityMemoryCache.set(opp.id, opp);
      existingMap.set(key, opp);
      syncedCount++;

      if (db) {
        try {
          const docRef = doc(db, OPPORTUNITIES_COLLECTION, opp.id);
          const cleanData: Record<string, any> = { ...opp };
          Object.keys(cleanData).forEach(k => cleanData[k] === undefined && delete cleanData[k]);
          await setDoc(docRef, cleanData);

          await logOpportunityAudit({
            companyId: opp.companyId,
            opportunityId: opp.id,
            action: 'OPPORTUNITY_DETECTED',
            performedBy: context.user?.email || 'system',
            performedByName: context.user?.name || 'Opportunity Radar Engine',
            notes: `Phát hiện cơ hội: ${opp.title} (${opp.opportunityType})`
          });
        } catch (err) {
          console.warn('[OpportunityService] Failed to save new opportunity to Firestore:', err);
        }
      }
    } else {
      // If already exists, preserve user-set status (e.g. CONVERTED, DISMISSED, SNOOZED, IN_PROGRESS)
      // Only refresh supportingData or reason if still active
      if (['NEW', 'REVIEWING', 'ACTION_REQUIRED'].includes(existing.status)) {
        const hasDataUpdate = existing.supportingData !== opp.supportingData;
        if (hasDataUpdate) {
          existing.supportingData = opp.supportingData;
          existing.updatedAt = now;
          opportunityMemoryCache.set(existing.id, existing);
          
          if (db) {
            try {
              const docRef = doc(db, OPPORTUNITIES_COLLECTION, existing.id);
              await updateDoc(docRef, {
                supportingData: opp.supportingData,
                updatedAt: now
              });
            } catch (err) {
              console.warn('[OpportunityService] Failed to update opportunity supporting data:', err);
            }
          }
        }
      }
    }
  }

  const allOpportunities = Array.from(existingMap.values());
  return {
    syncedCount,
    activeTotal: allOpportunities.length,
    opportunities: allOpportunities
  };
}

/**
 * Fetch opportunities with filtering, sorting, and timeframe evaluation
 */
export async function getBusinessOpportunities(
  companyId: string,
  filters?: OpportunityFilterOptions
): Promise<BusinessOpportunity[]> {
  const compId = companyId || 'default-company';
  let list: BusinessOpportunity[] = [];

  if (db) {
    try {
      const collRef = collection(db, OPPORTUNITIES_COLLECTION);
      const q = query(collRef, where('companyId', '==', compId), limit(300));
      const snap = await getDocs(q);
      snap.forEach(d => {
        const item = d.data() as BusinessOpportunity;
        list.push(item);
        opportunityMemoryCache.set(item.id, item);
      });
    } catch (err) {
      console.warn('[OpportunityService] Failed to query Firestore, using cache:', err);
      list = Array.from(opportunityMemoryCache.values()).filter(o => o.companyId === compId);
    }
  } else {
    list = Array.from(opportunityMemoryCache.values()).filter(o => o.companyId === compId);
  }

  // Filter in memory for maximum responsiveness
  let filtered = list;

  if (filters?.customerId) {
    filtered = filtered.filter(o => o.customerId === filters.customerId);
  }

  if (filters?.status && filters.status !== 'ALL') {
    filtered = filtered.filter(o => o.status === filters.status);
  }

  if (filters?.priority && filters.priority !== 'ALL') {
    filtered = filtered.filter(o => o.priority === filters.priority);
  }

  if (filters?.type && filters.type !== 'ALL') {
    filtered = filtered.filter(o => o.opportunityType === filters.type);
  }

  if (filters?.ownerId) {
    filtered = filtered.filter(o => o.ownerId === filters.ownerId);
  }

  if (filters?.lane) {
    const needle = filters.lane.toLowerCase();
    filtered = filtered.filter(o => (o.lane || '').toLowerCase().includes(needle));
  }

  if (filters?.serviceMode) {
    filtered = filtered.filter(o => o.serviceMode === filters.serviceMode);
  }

  if (filters?.timeframe && filters.timeframe !== 'ALL') {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000;
    const endOfWeek = startOfToday + 7 * 24 * 60 * 60 * 1000;

    filtered = filtered.filter(o => {
      const targetDate = o.dueDate || o.detectedAt;
      if (!targetDate) return filters.timeframe === 'UPCOMING';
      const t = new Date(targetDate).getTime();
      if (isNaN(t)) return true;

      if (filters.timeframe === 'TODAY') {
        return t >= startOfToday && t < endOfToday;
      } else if (filters.timeframe === 'THIS_WEEK') {
        return t >= startOfToday && t <= endOfWeek;
      } else if (filters.timeframe === 'OVERDUE') {
        return t < startOfToday && !['CONVERTED', 'DISMISSED', 'CLOSED'].includes(o.status);
      } else if (filters.timeframe === 'UPCOMING') {
        return t >= endOfToday;
      }
      return true;
    });
  }

  if (filters?.search) {
    const needle = filters.search.toLowerCase().trim();
    filtered = filtered.filter(o => 
      o.title.toLowerCase().includes(needle) ||
      o.customerName.toLowerCase().includes(needle) ||
      (o.lane || '').toLowerCase().includes(needle) ||
      o.reason.toLowerCase().includes(needle) ||
      o.suggestedAction.toLowerCase().includes(needle) ||
      (o.sourceEntityNumber || '').toLowerCase().includes(needle)
    );
  }

  // Sort: CRITICAL > HIGH > NORMAL > LOW, then by latest detectedAt
  const priorityRank: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    NORMAL: 2,
    LOW: 1
  };

  filtered.sort((a, b) => {
    const pDiff = (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
    if (pDiff !== 0) return pDiff;
    return new Date(b.detectedAt || 0).getTime() - new Date(a.detectedAt || 0).getTime();
  });

  return filtered;
}

/**
 * Update the status of an opportunity (with audit tracking)
 */
export async function updateOpportunityStatus(
  opportunityId: string,
  newStatus: OpportunityStatus,
  user?: { email?: string; name?: string },
  notes?: string,
  extra: {
    dismissReason?: string;
    conversionNotes?: string;
    convertedEntityId?: string;
    snoozedUntil?: string;
  } = {}
): Promise<BusinessOpportunity | null> {
  const cached = opportunityMemoryCache.get(opportunityId);
  const now = new Date().toISOString();

  let opp: BusinessOpportunity | null = cached || null;

  if (!opp && db) {
    try {
      const docRef = doc(db, OPPORTUNITIES_COLLECTION, opportunityId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        opp = snap.data() as BusinessOpportunity;
      }
    } catch (err) {
      console.error('[OpportunityService] Failed to load opportunity for status update:', err);
    }
  }

  if (!opp) return null;

  const beforeStatus = opp.status;
  opp.status = newStatus;
  opp.updatedAt = now;
  if (extra.dismissReason) opp.dismissReason = extra.dismissReason;
  if (extra.conversionNotes) opp.conversionNotes = extra.conversionNotes;
  if (extra.convertedEntityId) opp.convertedEntityId = extra.convertedEntityId;
  if (extra.snoozedUntil) opp.snoozedUntil = extra.snoozedUntil;

  opportunityMemoryCache.set(opp.id, opp);

  if (db) {
    try {
      const docRef = doc(db, OPPORTUNITIES_COLLECTION, opp.id);
      const updatePayload: Record<string, any> = {
        status: newStatus,
        updatedAt: now,
        ...extra
      };
      Object.keys(updatePayload).forEach(k => updatePayload[k] === undefined && delete updatePayload[k]);
      await updateDoc(docRef, updatePayload);

      await logOpportunityAudit({
        companyId: opp.companyId,
        opportunityId: opp.id,
        action: newStatus === 'CONVERTED' ? 'CONVERTED' : newStatus === 'DISMISSED' ? 'DISMISSED' : newStatus === 'SNOOZED' ? 'SNOOZED' : 'STATUS_UPDATED',
        performedBy: user?.email || 'user',
        performedByName: user?.name || 'User',
        beforeState: { status: beforeStatus },
        afterState: { status: newStatus, ...extra },
        notes: notes || `Chuyển trạng thái từ ${beforeStatus} sang ${newStatus}`
      }, user);

      // Also log to CRM Audit
      await logCRMAudit({
        companyId: opp.companyId,
        customerId: opp.customerId,
        entityType: 'OPPORTUNITY',
        entityId: opp.id,
        action: newStatus === 'CONVERTED' ? 'OPPORTUNITY_WON' : 'OPPORTUNITY_UPDATED',
        performedBy: user?.email || 'user',
        performedByName: user?.name || 'User',
        previousState: { status: beforeStatus },
        newState: { status: newStatus, notes }
      });
    } catch (err) {
      console.error('[OpportunityService] Failed to update opportunity in Firestore:', err);
    }
  }

  return opp;
}

/**
 * Snooze opportunity for N days
 */
export async function snoozeOpportunity(
  opportunityId: string,
  days: number,
  user?: { email?: string; name?: string },
  reason?: string
): Promise<BusinessOpportunity | null> {
  const snoozeUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  return updateOpportunityStatus(opportunityId, 'SNOOZED', user, reason || `Tạm hoãn ${days} ngày`, {
    snoozedUntil: snoozeUntil
  });
}

/**
 * Dismiss opportunity with clear reason
 */
export async function dismissOpportunity(
  opportunityId: string,
  reason: string,
  user?: { email?: string; name?: string }
): Promise<BusinessOpportunity | null> {
  return updateOpportunityStatus(opportunityId, 'DISMISSED', user, reason, {
    dismissReason: reason
  });
}

/**
 * Calculate comprehensive radar metrics
 */
export function calculateOpportunityMetrics(
  opportunities: BusinessOpportunity[]
): OpportunityRadarMetrics {
  const byType: Record<BusinessOpportunityType, number> = {
    CUSTOMER_GROWTH: 0,
    CUSTOMER_RETENTION: 0,
    RE_QUOTATION: 0,
    RATE_RENEWAL: 0,
    CROSS_SERVICE: 0,
    LANE_OPPORTUNITY: 0,
    QUOTATION_CONVERSION: 0,
    CONTRACT_RENEWAL: 0,
    SHIPMENT_FOLLOW_UP: 0,
    REACTIVATION: 0
  };

  const bySufficiency: Record<DataSufficiencyLevel, number> = {
    SUFFICIENT_DATA: 0,
    LIMITED_DATA: 0,
    INSUFFICIENT_DATA: 0
  };

  let newCount = 0;
  let reviewingCount = 0;
  let actionRequiredCount = 0;
  let inProgressCount = 0;
  let convertedCount = 0;
  let dismissedCount = 0;
  let snoozedCount = 0;
  let criticalCount = 0;
  let highCount = 0;
  let normalCount = 0;
  let lowCount = 0;

  opportunities.forEach(o => {
    // Type counts
    if (byType[o.opportunityType] !== undefined) {
      byType[o.opportunityType]++;
    }

    // Sufficiency counts
    if (bySufficiency[o.confidenceLevel] !== undefined) {
      bySufficiency[o.confidenceLevel]++;
    }

    // Status counts
    if (o.status === 'NEW') newCount++;
    else if (o.status === 'REVIEWING') reviewingCount++;
    else if (o.status === 'ACTION_REQUIRED') actionRequiredCount++;
    else if (o.status === 'IN_PROGRESS') inProgressCount++;
    else if (o.status === 'CONVERTED') convertedCount++;
    else if (o.status === 'DISMISSED') dismissedCount++;
    else if (o.status === 'SNOOZED') snoozedCount++;

    // Priority counts
    if (o.priority === 'CRITICAL') criticalCount++;
    else if (o.priority === 'HIGH') highCount++;
    else if (o.priority === 'NORMAL') normalCount++;
    else if (o.priority === 'LOW') lowCount++;
  });

  return {
    totalActive: opportunities.filter(o => !['CONVERTED', 'DISMISSED', 'CLOSED'].includes(o.status)).length,
    newOpportunities: newCount,
    reviewing: reviewingCount,
    actionRequired: actionRequiredCount,
    inProgress: inProgressCount,
    converted: convertedCount,
    dismissed: dismissedCount,
    snoozed: snoozedCount,
    criticalPriority: criticalCount,
    highPriority: highCount,
    normalPriority: normalCount,
    lowPriority: lowCount,
    byType,
    bySufficiency
  };
}
