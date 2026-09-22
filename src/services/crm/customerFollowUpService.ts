import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  updateDoc,
  query, 
  where, 
  limit, 
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { CustomerFollowUp, CRMFollowUpStatus } from '../../types/crm';
import { DeadlineEntity } from '../../types/deadline';
import { logCRMAudit } from './crmAuditService';
import { logCustomerActivity } from './customerActivityService';

const COLLECTION_NAME = 'customerFollowUps';
const DEADLINES_COLLECTION = 'deadlines';

export interface FollowUpFilterOptions {
  customerId?: string;
  ownerId?: string;
  status?: CRMFollowUpStatus | 'ALL';
  priority?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Creates a Customer Follow-Up and synchronizes it with the Action Center (Deadlines collection)
 */
export async function createCustomerFollowUp(
  followUp: Omit<CustomerFollowUp, 'id' | 'createdAt' | 'updatedAt'>,
  user?: { email?: string; name?: string }
): Promise<CustomerFollowUp> {
  const id = `cfu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newFollowUp: CustomerFollowUp = {
    ...followUp,
    id,
    companyId: followUp.companyId || 'default-company',
    status: followUp.status || 'OPEN',
    createdAt: now,
    updatedAt: now,
  };

  if (db) {
    try {
      // 1. Save follow up document
      const docRef = doc(db, COLLECTION_NAME, id);
      const cleanData: Record<string, any> = {
        ...newFollowUp,
        serverCreatedAt: serverTimestamp(),
      };
      Object.keys(cleanData).forEach(k => cleanData[k] === undefined && delete cleanData[k]);
      await setDoc(docRef, cleanData);

      // 2. Synchronize to Action Center (Phase 44 Deadlines)
      const deadlineId = `dl_fu_${id}`;
      const dlRef = doc(db, DEADLINES_COLLECTION, deadlineId);

      const deadlineType = newFollowUp.relatedEntityType === 'QUOTATION' 
        ? 'QUOTATION_FOLLOWUP_DUE' 
        : 'CUSTOMER_FOLLOWUP_DUE';

      const entityType = newFollowUp.relatedEntityType === 'QUOTATION' 
        ? 'QUOTATION' 
        : newFollowUp.relatedEntityType === 'SHIPMENT' 
        ? 'SHIPMENT' 
        : 'CUSTOMER';

      const deadlinePriority = newFollowUp.priority === 'URGENT' ? 'CRITICAL' : newFollowUp.priority;

      const deadlineDoc: DeadlineEntity = {
        id: deadlineId,
        companyId: newFollowUp.companyId,
        entityType,
        entityId: newFollowUp.relatedEntityId || newFollowUp.customerId,
        entityNumber: newFollowUp.relatedEntityNumber || newFollowUp.customerId,
        customerName: newFollowUp.customerName,
        deadlineType,
        title: `Follow-up: ${newFollowUp.customerName} - ${newFollowUp.notes.slice(0, 35)}`,
        description: newFollowUp.notes,
        dueAt: newFollowUp.dueDate,
        timezone: 'Asia/Ho_Chi_Minh',
        status: newFollowUp.status === 'COMPLETED' ? 'COMPLETED' : 'UPCOMING',
        priority: deadlinePriority,
        source: 'AUTO_CRM',
        idempotencyKey: `fu_${id}`,
        assignedTo: newFollowUp.ownerName,
        assignedToName: newFollowUp.ownerName,
        version: 1,
        createdBy: user?.name || newFollowUp.ownerName,
        updatedBy: user?.name || newFollowUp.ownerName,
        relatedData: {
          followUpId: id,
          customerId: newFollowUp.customerId,
          customerName: newFollowUp.customerName,
          followUpType: newFollowUp.followUpType,
          ownerEmail: newFollowUp.ownerId,
        },
        createdAt: now,
        updatedAt: now,
      };

      const cleanDeadline: Record<string, any> = { ...deadlineDoc };
      Object.keys(cleanDeadline).forEach(k => cleanDeadline[k] === undefined && delete cleanDeadline[k]);
      await setDoc(dlRef, cleanDeadline);

      // 3. Log CRM Activity & Audit
      await logCustomerActivity({
        companyId: newFollowUp.companyId,
        customerId: newFollowUp.customerId,
        customerName: newFollowUp.customerName,
        activityType: 'FOLLOW_UP_CREATED',
        occurredAt: now,
        createdBy: user?.email || newFollowUp.ownerId,
        createdByName: user?.name || newFollowUp.ownerName,
        relatedEntityType: newFollowUp.relatedEntityType,
        relatedEntityId: newFollowUp.relatedEntityId,
        relatedEntityNumber: newFollowUp.relatedEntityNumber,
        summary: `Tạo lịch chăm sóc: ${newFollowUp.followUpType} vào ${newFollowUp.dueDate.slice(0, 10)}`,
        details: newFollowUp.notes,
        nextAction: newFollowUp.nextAction,
        visibility: 'INTERNAL',
      }, user);

      await logCRMAudit({
        companyId: newFollowUp.companyId,
        customerId: newFollowUp.customerId,
        entityType: 'FOLLOW_UP',
        entityId: id,
        action: 'FOLLOW_UP_CREATED',
        performedBy: user?.email || 'user',
        performedByName: user?.name || 'User',
        newState: { dueDate: newFollowUp.dueDate, priority: newFollowUp.priority, notes: newFollowUp.notes }
      });
    } catch (err) {
      console.error('[CustomerFollowUpService] Failed to create follow-up:', err);
    }
  }

  return newFollowUp;
}

/**
 * Retrieves follow-ups with filters and live status calculation (evaluating OVERDUE)
 */
export async function getCustomerFollowUps(
  companyId: string,
  filters: FollowUpFilterOptions = {}
): Promise<CustomerFollowUp[]> {
  if (!db) return [];

  try {
    const collRef = collection(db, COLLECTION_NAME);
    let q = query(
      collRef,
      where('companyId', '==', companyId || 'default-company'),
      limit(200)
    );

    if (filters.customerId) {
      q = query(
        collRef,
        where('companyId', '==', companyId || 'default-company'),
        where('customerId', '==', filters.customerId),
        limit(100)
      );
    }

    const snap = await getDocs(q);
    const now = new Date();
    const list: CustomerFollowUp[] = [];

    snap.forEach(docSnap => {
      const data = docSnap.data() as CustomerFollowUp;
      let computedStatus = data.status;

      // Realtime compute overdue for open/in-progress items
      if ((computedStatus === 'OPEN' || computedStatus === 'IN_PROGRESS') && data.dueDate) {
        if (new Date(data.dueDate).getTime() < now.getTime()) {
          computedStatus = 'OVERDUE';
        }
      }

      const item: CustomerFollowUp = {
        ...data,
        status: computedStatus,
      };

      // In-memory filters if needed
      if (filters.status && filters.status !== 'ALL') {
        if (item.status !== filters.status) return;
      }
      if (filters.priority && item.priority !== filters.priority) {
        return;
      }
      if (filters.ownerId && item.ownerId !== filters.ownerId) {
        return;
      }

      list.push(item);
    });

    // Sort by dueDate ascending (urgent first)
    list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return list;
  } catch (err) {
    console.error('[CustomerFollowUpService] Failed to get follow-ups:', err);
    return [];
  }
}

/**
 * Updates status (COMPLETED, SNOOZED, CANCELLED) and syncs with Action Center
 */
export async function updateCustomerFollowUpStatus(
  followUpId: string,
  newStatus: CRMFollowUpStatus,
  user?: { email?: string; name?: string },
  notes?: string
): Promise<void> {
  if (!db) return;

  try {
    const docRef = doc(db, COLLECTION_NAME, followUpId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const currentData = snap.data() as CustomerFollowUp;
    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      status: newStatus,
      updatedAt: nowIso,
    };

    if (newStatus === 'COMPLETED') {
      updatePayload.completedAt = nowIso;
      updatePayload.completedBy = user?.name || user?.email || 'User';
      if (notes) updatePayload.completionNote = notes;
    }

    await updateDoc(docRef, updatePayload);

    // Sync to Action Center Deadlines
    const deadlineId = `dl_fu_${followUpId}`;
    const dlRef = doc(db, DEADLINES_COLLECTION, deadlineId);
    const dlSnap = await getDoc(dlRef);

    if (dlSnap.exists()) {
      let deadlineStatus: any = 'UPCOMING';
      if (newStatus === 'COMPLETED') deadlineStatus = 'COMPLETED';
      else if (newStatus === 'CANCELLED') deadlineStatus = 'CANCELLED';
      else if (newStatus === 'SNOOZED') deadlineStatus = 'SNOOZED';

      await updateDoc(dlRef, {
        status: deadlineStatus,
        updatedAt: nowIso,
      });
    }

    // Log Activity & Audit
    if (newStatus === 'COMPLETED') {
      await logCustomerActivity({
        companyId: currentData.companyId,
        customerId: currentData.customerId,
        customerName: currentData.customerName,
        activityType: 'FOLLOW_UP_COMPLETED',
        occurredAt: nowIso,
        createdBy: user?.email || 'user',
        createdByName: user?.name || 'User',
        relatedEntityType: currentData.relatedEntityType,
        relatedEntityId: currentData.relatedEntityId,
        relatedEntityNumber: currentData.relatedEntityNumber,
        summary: `Hoàn tất chăm sóc: ${currentData.followUpType}`,
        details: notes || currentData.notes,
        visibility: 'INTERNAL',
      }, user);
    }

    await logCRMAudit({
      companyId: currentData.companyId,
      customerId: currentData.customerId,
      entityType: 'FOLLOW_UP',
      entityId: followUpId,
      action: `FOLLOW_UP_STATUS_${newStatus}`,
      performedBy: user?.email || 'user',
      performedByName: user?.name || 'User',
      previousState: { status: currentData.status },
      newState: { status: newStatus, notes }
    });
  } catch (err) {
    console.error('[CustomerFollowUpService] Failed to update follow-up status:', err);
  }
}

/**
 * Snooze follow-up to a new date
 */
export async function snoozeCustomerFollowUp(
  followUpId: string,
  newDueDate: string,
  user?: { email?: string; name?: string },
  reason?: string
): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, COLLECTION_NAME, followUpId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const currentData = snap.data() as CustomerFollowUp;
    const nowIso = new Date().toISOString();

    await updateDoc(docRef, {
      dueDate: newDueDate,
      status: 'SNOOZED',
      snoozedUntil: newDueDate,
      updatedAt: nowIso,
    });

    // Update Action Center deadline
    const deadlineId = `dl_fu_${followUpId}`;
    const dlRef = doc(db, DEADLINES_COLLECTION, deadlineId);
    const dlSnap = await getDoc(dlRef);
    if (dlSnap.exists()) {
      await updateDoc(dlRef, {
        dueAt: newDueDate,
        status: 'SNOOZED',
        snoozedUntil: newDueDate,
        snoozeReason: reason || 'Sales hoãn ngày theo dõi',
        updatedAt: nowIso,
      });
    }

    await logCRMAudit({
      companyId: currentData.companyId,
      customerId: currentData.customerId,
      entityType: 'FOLLOW_UP',
      entityId: followUpId,
      action: 'FOLLOW_UP_SNOOZED',
      performedBy: user?.email || 'user',
      performedByName: user?.name || 'User',
      previousState: { dueDate: currentData.dueDate },
      newState: { newDueDate, reason }
    });
  } catch (err) {
    console.error('[CustomerFollowUpService] Failed to snooze follow-up:', err);
  }
}

/**
 * Convenient alias to mark a follow-up as completed
 */
export async function completeCustomerFollowUp(
  followUpId: string,
  completionNote?: string,
  user?: { email?: string; name?: string }
): Promise<void> {
  return updateCustomerFollowUpStatus(followUpId, 'COMPLETED', user, completionNote);
}

/**
 * Realtime listener for customer follow-up tasks
 */
export function subscribeCustomerFollowUps(
  companyId: string,
  callback: (followUps: CustomerFollowUp[]) => void
): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('companyId', '==', companyId)
    );

    return onSnapshot(q, (snap) => {
      const list: CustomerFollowUp[] = [];
      const now = new Date();

      snap.forEach((docSnap) => {
        const data = docSnap.data() as CustomerFollowUp;
        let computedStatus = data.status;

        if ((computedStatus === 'OPEN' || computedStatus === 'IN_PROGRESS') && data.dueDate) {
          if (new Date(data.dueDate).getTime() < now.getTime()) {
            computedStatus = 'OVERDUE';
          }
        }

        list.push({
          ...data,
          status: computedStatus,
        });
      });

      list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      callback(list);
    }, (err) => {
      console.error('[CustomerFollowUpService] Realtime listener error:', err);
      callback([]);
    });
  } catch (err) {
    console.error('[CustomerFollowUpService] Failed to subscribe follow-ups:', err);
    callback([]);
    return () => {};
  }
}

