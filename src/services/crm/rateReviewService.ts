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
import { 
  RateReviewSchedule, 
  RateReviewTask, 
  RateReviewWorkflowStatus,
  RateReviewFrequency
} from '../../types/crm';
import { DeadlineEntity } from '../../types/deadline';
import { logCRMAudit } from './crmAuditService';
import { logCustomerActivity } from './customerActivityService';

const SCHEDULES_COLLECTION = 'rateReviewSchedules';
const TASKS_COLLECTION = 'rateReviewTasks';
const DEADLINES_COLLECTION = 'deadlines';

/**
 * Calculates next review date based on frequency
 */
export function calculateNextReviewDate(fromDate: Date, frequency: RateReviewFrequency, customDays?: number): string {
  const d = new Date(fromDate);
  switch (frequency) {
    case 'WEEKLY':
      d.setDate(d.getDate() + 7);
      break;
    case 'BIWEEKLY':
      d.setDate(d.getDate() + 14);
      break;
    case 'MONTHLY':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'QUARTERLY':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'CUSTOM':
      d.setDate(d.getDate() + (customDays || 30));
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

/**
 * Create a recurring Rate Review Schedule
 */
export async function createRateReviewSchedule(
  schedule: Omit<RateReviewSchedule, 'id' | 'createdAt' | 'updatedAt'>,
  user?: { email?: string; name?: string }
): Promise<RateReviewSchedule> {
  const id = `rrs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newSchedule: RateReviewSchedule = {
    ...schedule,
    id,
    companyId: schedule.companyId || 'default-company',
    active: schedule.active !== undefined ? schedule.active : true,
    createdAt: now,
    updatedAt: now,
  };

  if (db) {
    try {
      const docRef = doc(db, SCHEDULES_COLLECTION, id);
      const cleanData: Record<string, any> = { ...newSchedule, serverCreatedAt: serverTimestamp() };
      Object.keys(cleanData).forEach(k => cleanData[k] === undefined && delete cleanData[k]);
      await setDoc(docRef, cleanData);

      // Immediately create initial RateReviewTask if due soon
      await createRateReviewTask({
        companyId: newSchedule.companyId,
        scheduleId: id,
        customerId: newSchedule.customerId,
        customerName: newSchedule.customerName,
        serviceMode: newSchedule.serviceMode,
        origin: newSchedule.origin,
        destination: newSchedule.destination,
        lane: newSchedule.lane,
        incoterm: newSchedule.incoterm,
        currency: 'USD',
        status: 'REVIEW_REQUIRED',
        dueAt: newSchedule.nextReviewDate,
        ownerId: newSchedule.ownerId,
        ownerName: newSchedule.ownerName,
        reason: `Lịch định kỳ: Đánh giá giá ${newSchedule.frequency} cho tuyến ${newSchedule.lane}`,
        evidenceData: `Lịch review định kỳ thiết lập bởi ${user?.name || 'Pricing'}. Đã tới chu kỳ cập nhật biểu cước.`,
        suggestedAction: 'Kiểm tra biến động giá mua (buy rate) từ hãng tàu/carrier, đối chiếu margin và đề xuất điều chỉnh báo giá cho khách hàng.',
      }, user);

      await logCRMAudit({
        companyId: newSchedule.companyId,
        customerId: newSchedule.customerId,
        entityType: 'RATE_REVIEW',
        entityId: id,
        action: 'RATE_REVIEW_SCHEDULE_CREATED',
        performedBy: user?.email || 'user',
        performedByName: user?.name || 'User',
        newState: { lane: newSchedule.lane, frequency: newSchedule.frequency, nextReviewDate: newSchedule.nextReviewDate }
      });
    } catch (err) {
      console.error('[RateReviewService] Failed to create rate review schedule:', err);
    }
  }

  return newSchedule;
}

/**
 * Get all rate review schedules for a company / customer
 */
export async function getRateReviewSchedules(companyId: string, customerId?: string): Promise<RateReviewSchedule[]> {
  if (!db) return [];
  try {
    const collRef = collection(db, SCHEDULES_COLLECTION);
    let q = query(collRef, where('companyId', '==', companyId || 'default-company'), limit(100));
    if (customerId) {
      q = query(collRef, where('companyId', '==', companyId || 'default-company'), where('customerId', '==', customerId), limit(50));
    }
    const snap = await getDocs(q);
    const list: RateReviewSchedule[] = [];
    snap.forEach(d => list.push(d.data() as RateReviewSchedule));
    return list;
  } catch (err) {
    console.error('[RateReviewService] Failed to get schedules:', err);
    return [];
  }
}

/**
 * Creates a Rate Review Task & integrates into Action Center (deadlines collection)
 */
export async function createRateReviewTask(
  task: Omit<RateReviewTask, 'id' | 'createdAt' | 'updatedAt'>,
  user?: { email?: string; name?: string }
): Promise<RateReviewTask> {
  const id = `rrt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Compute differences if both rates provided
  let diff = task.difference;
  let diffPercent = task.differencePercent;
  let margin = task.currentMargin;

  if (task.currentBuyRate !== undefined && task.currentSellRate !== undefined) {
    margin = task.currentSellRate - task.currentBuyRate;
  }
  if (task.previousRate !== undefined && task.recommendedNewRate !== undefined) {
    diff = task.recommendedNewRate - task.previousRate;
    diffPercent = task.previousRate > 0 ? (diff / task.previousRate) * 100 : 0;
  }

  const newTask: RateReviewTask = {
    ...task,
    id,
    companyId: task.companyId || 'default-company',
    difference: diff,
    differencePercent: diffPercent,
    currentMargin: margin,
    createdAt: now,
    updatedAt: now,
  };

  if (db) {
    try {
      // 1. Write task document
      const docRef = doc(db, TASKS_COLLECTION, id);
      const cleanData: Record<string, any> = { ...newTask, serverCreatedAt: serverTimestamp() };
      Object.keys(cleanData).forEach(k => cleanData[k] === undefined && delete cleanData[k]);
      await setDoc(docRef, cleanData);

      // 2. Synchronize to Action Center (Phase 44 Deadlines)
      const deadlineId = `dl_rr_${id}`;
      const dlRef = doc(db, DEADLINES_COLLECTION, deadlineId);

      const deadlineDoc: DeadlineEntity = {
        id: deadlineId,
        companyId: newTask.companyId,
        entityType: 'RATE_REVIEW',
        entityId: id,
        entityNumber: newTask.lane,
        customerName: newTask.customerName,
        serviceMode: newTask.serviceMode,
        deadlineType: 'RATE_REVIEW_DUE',
        title: `Đánh giá giá: ${newTask.customerName} - Tuyến ${newTask.lane}`,
        description: `${newTask.reason}. Đề xuất: ${newTask.suggestedAction}`,
        dueAt: newTask.dueAt,
        timezone: 'Asia/Ho_Chi_Minh',
        status: newTask.status === 'COMPLETED' ? 'COMPLETED' : 'UPCOMING',
        priority: 'HIGH',
        source: 'AUTO_RATE_REVIEW',
        idempotencyKey: `rr_${id}`,
        assignedTo: newTask.ownerName,
        assignedToName: newTask.ownerName,
        version: 1,
        createdBy: user?.name || newTask.ownerName,
        updatedBy: user?.name || newTask.ownerName,
        relatedData: {
          rateReviewTaskId: id,
          customerId: newTask.customerId,
          lane: newTask.lane,
          ownerEmail: newTask.ownerId,
        },
        createdAt: now,
        updatedAt: now,
      };

      const cleanDeadline: Record<string, any> = { ...deadlineDoc };
      Object.keys(cleanDeadline).forEach(k => cleanDeadline[k] === undefined && delete cleanDeadline[k]);
      await setDoc(dlRef, cleanDeadline);

      // 3. Log Activity & Audit
      await logCustomerActivity({
        companyId: newTask.companyId,
        customerId: newTask.customerId,
        customerName: newTask.customerName,
        activityType: 'RATE_REVIEW_DUE',
        occurredAt: now,
        createdBy: user?.email || newTask.ownerId,
        createdByName: user?.name || newTask.ownerName,
        relatedEntityType: 'RATE',
        relatedEntityId: id,
        relatedEntityNumber: newTask.lane,
        summary: `Kích hoạt đánh giá giá: Tuyến ${newTask.lane} (${newTask.serviceMode})`,
        details: newTask.evidenceData,
        nextAction: newTask.suggestedAction,
        visibility: 'INTERNAL',
      }, user);

      await logCRMAudit({
        companyId: newTask.companyId,
        customerId: newTask.customerId,
        entityType: 'RATE_REVIEW',
        entityId: id,
        action: 'RATE_REVIEW_TASK_CREATED',
        performedBy: user?.email || 'user',
        performedByName: user?.name || 'User',
        newState: { lane: newTask.lane, status: newTask.status, dueAt: newTask.dueAt }
      });
    } catch (err) {
      console.error('[RateReviewService] Failed to create rate review task:', err);
    }
  }

  return newTask;
}

/**
 * Get all rate review tasks for queue
 */
export async function getRateReviewTasks(
  companyId: string, 
  filters?: { customerId?: string; status?: RateReviewWorkflowStatus | 'ALL' }
): Promise<RateReviewTask[]> {
  if (!db) return [];
  try {
    const collRef = collection(db, TASKS_COLLECTION);
    let q = query(collRef, where('companyId', '==', companyId || 'default-company'), limit(200));
    if (filters?.customerId) {
      q = query(collRef, where('companyId', '==', companyId || 'default-company'), where('customerId', '==', filters.customerId), limit(100));
    }
    const snap = await getDocs(q);
    const list: RateReviewTask[] = [];
    snap.forEach(d => {
      const data = d.data() as RateReviewTask;
      if (filters?.status && filters.status !== 'ALL' && data.status !== filters.status) {
        return;
      }
      list.push(data);
    });

    // Sort by dueAt ascending
    list.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    return list;
  } catch (err) {
    console.error('[RateReviewService] Failed to get rate review tasks:', err);
    return [];
  }
}

/**
 * Update workflow status with user confirmation and optional new rate proposal data.
 * Adheres strictly to Zero Data Loss: NEVER overwrites historical rate records!
 */
export async function updateRateReviewWorkflow(
  taskId: string,
  newStatus: RateReviewWorkflowStatus,
  user?: { email?: string; name?: string },
  updates?: Partial<RateReviewTask>
): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const currentData = snap.data() as RateReviewTask;
    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      ...updates,
      status: newStatus,
      updatedAt: nowIso,
    };
    Object.keys(updatePayload).forEach(k => updatePayload[k] === undefined && delete updatePayload[k]);

    await updateDoc(docRef, updatePayload);

    // Sync Action Center deadline
    const deadlineId = `dl_rr_${taskId}`;
    const dlRef = doc(db, DEADLINES_COLLECTION, deadlineId);
    const dlSnap = await getDoc(dlRef);
    if (dlSnap.exists()) {
      let deadlineStatus: any = 'UPCOMING';
      if (newStatus === 'COMPLETED') deadlineStatus = 'COMPLETED';
      else if (newStatus === 'CANCELLED') deadlineStatus = 'CANCELLED';

      await updateDoc(dlRef, {
        status: deadlineStatus,
        updatedAt: nowIso,
      });
    }

    // Log Activity & Audit
    if (newStatus === 'COMPLETED' || newStatus === 'CUSTOMER_RATE_UPDATED') {
      await logCustomerActivity({
        companyId: currentData.companyId,
        customerId: currentData.customerId,
        customerName: currentData.customerName,
        activityType: 'RATE_UPDATED',
        occurredAt: nowIso,
        createdBy: user?.email || 'user',
        createdByName: user?.name || 'User',
        relatedEntityType: 'RATE',
        relatedEntityId: taskId,
        relatedEntityNumber: currentData.lane,
        summary: `Cập nhật biểu cước hoàn tất: Tuyến ${currentData.lane}`,
        details: `Giá mới: ${updates?.recommendedNewRate || currentData.recommendedNewRate || 'N/A'} ${currentData.currency}. Trạng thái: ${newStatus}`,
        visibility: 'INTERNAL',
      }, user);
    }

    await logCRMAudit({
      companyId: currentData.companyId,
      customerId: currentData.customerId,
      entityType: 'RATE_REVIEW',
      entityId: taskId,
      action: `RATE_REVIEW_WORKFLOW_${newStatus}`,
      performedBy: user?.email || 'user',
      performedByName: user?.name || 'User',
      previousState: { status: currentData.status },
      newState: { status: newStatus, ...updates }
    });
  } catch (err) {
    console.error('[RateReviewService] Failed to update workflow:', err);
  }
}

export async function processRateReviewTask(
  taskId: string,
  newStatus: RateReviewWorkflowStatus,
  updatesOrUser?: Partial<RateReviewTask> | { email?: string; name?: string },
  userOrUpdates?: { email?: string; name?: string } | Partial<RateReviewTask>
): Promise<void> {
  let user: { email?: string; name?: string } | undefined;
  let updates: Partial<RateReviewTask> | undefined;

  if (updatesOrUser && ('email' in updatesOrUser || 'name' in updatesOrUser) && !('reviewerNotes' in updatesOrUser || 'proposedSellRate' in updatesOrUser)) {
    user = updatesOrUser as any;
    updates = userOrUpdates as any;
  } else {
    updates = updatesOrUser as any;
    user = userOrUpdates as any;
  }

  return updateRateReviewWorkflow(taskId, newStatus, user, updates);
}

export async function triggerRateReviewFromSchedule(
  schedule: RateReviewSchedule,
  user?: { email?: string; name?: string }
): Promise<RateReviewTask> {
  return createRateReviewTask({
    companyId: schedule.companyId,
    scheduleId: schedule.id,
    customerId: schedule.customerId,
    customerName: schedule.customerName,
    serviceMode: schedule.serviceMode,
    origin: schedule.origin,
    destination: schedule.destination,
    lane: schedule.lane,
    incoterm: schedule.incoterm,
    currency: 'USD',
    status: 'REVIEW_REQUIRED',
    dueAt: new Date().toISOString(),
    ownerId: schedule.ownerId,
    ownerName: schedule.ownerName,
    reason: `Rà soát theo yêu cầu từ lịch ${schedule.frequency}`,
    evidenceData: `Kích hoạt thủ công bởi ${user?.name || 'Pricing'}`,
    suggestedAction: 'Cập nhật biến động giá cước và điều chỉnh biểu cước khách hàng.',
  }, user);
}


/**
 * Realtime listener for rate review tasks
 */
export function subscribeRateReviewTasks(
  companyId: string,
  callback: (tasks: RateReviewTask[]) => void
): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, TASKS_COLLECTION),
      where('companyId', '==', companyId)
    );

    return onSnapshot(q, (snap) => {
      const list: RateReviewTask[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as RateReviewTask);
      });
      list.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
      callback(list);
    }, (err) => {
      console.error('[RateReviewService] Realtime listener error for tasks:', err);
      callback([]);
    });
  } catch (err) {
    console.error('[RateReviewService] Failed to subscribe tasks:', err);
    callback([]);
    return () => {};
  }
}

/**
 * Realtime listener for rate review schedules
 */
export function subscribeRateReviewSchedules(
  companyId: string,
  callback: (schedules: RateReviewSchedule[]) => void
): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, SCHEDULES_COLLECTION),
      where('companyId', '==', companyId)
    );

    return onSnapshot(q, (snap) => {
      const list: RateReviewSchedule[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as RateReviewSchedule);
      });
      callback(list);
    }, (err) => {
      console.error('[RateReviewService] Realtime listener error for schedules:', err);
      callback([]);
    });
  } catch (err) {
    console.error('[RateReviewService] Failed to subscribe schedules:', err);
    callback([]);
    return () => {};
  }
}

