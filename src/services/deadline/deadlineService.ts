/**
 * Smart Logistics Deadline & Action Intelligence Service - Phase 44
 * Centralized, zero-mock, idempotent deadline surveillance and operational action orchestration.
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  DeadlineEntity, 
  DeadlineFilterOptions, 
  DeadlineMetrics, 
  DeadlineStatus, 
  TimeRemainingInfo,
  DeadlineAuditLog,
  DeadlineAuditAction,
  DeadlineType,
  DeadlineEntityType,
  DeadlinePriority,
  DeadlineSource,
  ActionWaitingReason,
  ActionSubtask,
  FollowUpChannel,
  CustomerSentiment,
  FollowUpTouchpointRecord
} from '../../types/deadline';
import { ShipmentRecord } from '../../types/shipment';
import { QuoteData } from '../../types/logistics';
import { logCustomerActivity } from '../crm/customerActivityService';

const DEADLINES_COLLECTION = 'deadlines';
const AUDIT_LOGS_COLLECTION = 'deadlineAuditLogs';
const FOLLOW_UP_TOUCHPOINTS_COLLECTION = 'followUpTouchpoints';

// In-memory cache for ultra-responsive UI navigation and optimistic updates
const deadlineMemoryCache = new Map<string, DeadlineEntity>();

/**
 * Accurately calculate time remaining and semantic badge styling
 */
export function calculateTimeRemaining(dueAt: string, snoozedUntil?: string): TimeRemainingInfo {
  if (!dueAt) {
    return {
      isOverdue: false,
      isToday: false,
      days: 0,
      hours: 0,
      minutes: 0,
      formattedTextVi: 'Chưa có hạn',
      formattedTextEn: 'No deadline',
      badgeColorClass: 'bg-slate-100 text-slate-600 border-slate-200',
    };
  }

  const now = new Date();
  const targetDate = new Date(dueAt);
  const diffMs = targetDate.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);

  const totalMinutes = Math.floor(absDiffMs / (1000 * 60));
  const totalHours = Math.floor(absDiffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  // Check if target is on the same calendar day (UTC/Local)
  const isToday = 
    now.getFullYear() === targetDate.getFullYear() &&
    now.getMonth() === targetDate.getMonth() &&
    now.getDate() === targetDate.getDate();

  let formattedTextVi = '';
  let formattedTextEn = '';
  let badgeColorClass = '';

  if (snoozedUntil && new Date(snoozedUntil).getTime() > now.getTime()) {
    const snoozeDate = new Date(snoozedUntil);
    const snoozeDiff = snoozeDate.getTime() - now.getTime();
    const sHours = Math.floor(snoozeDiff / (1000 * 60 * 60));
    formattedTextVi = `Tạm hoãn (còn ${sHours > 0 ? `${sHours}h` : 'ít phút'})`;
    formattedTextEn = `Snoozed (${sHours > 0 ? `${sHours}h left` : 'few mins'})`;
    badgeColorClass = 'bg-purple-50 text-purple-700 border-purple-200';
    return { isOverdue: false, isToday, days, hours, minutes, formattedTextVi, formattedTextEn, badgeColorClass };
  }

  if (isOverdue) {
    if (days > 0) {
      formattedTextVi = `Quá hạn ${days} ngày ${hours > 0 ? `${hours}h` : ''}`;
      formattedTextEn = `Overdue by ${days}d ${hours > 0 ? `${hours}h` : ''}`;
    } else if (hours > 0) {
      formattedTextVi = `Quá hạn ${hours} giờ ${minutes}p`;
      formattedTextEn = `Overdue by ${hours}h ${minutes}m`;
    } else {
      formattedTextVi = `Quá hạn ${minutes} phút`;
      formattedTextEn = `Overdue by ${minutes}m`;
    }
    badgeColorClass = 'bg-red-50 text-red-700 border-red-200 font-semibold';
  } else if (isToday) {
    if (hours > 0) {
      formattedTextVi = `Hôm nay (còn ${hours}h ${minutes}p)`;
      formattedTextEn = `Today (${hours}h ${minutes}m left)`;
    } else {
      formattedTextVi = `Gấp: Còn ${minutes} phút`;
      formattedTextEn = `Urgent: ${minutes}m left`;
    }
    badgeColorClass = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
  } else if (days === 1) {
    formattedTextVi = `Ngày mai (${hours}h nữa)`;
    formattedTextEn = `Tomorrow (${hours}h left)`;
    badgeColorClass = 'bg-orange-50 text-orange-700 border-orange-200';
  } else {
    formattedTextVi = `Còn ${days} ngày`;
    formattedTextEn = `${days} days left`;
    badgeColorClass = days <= 3 
      ? 'bg-blue-50 text-blue-700 border-blue-200' 
      : 'bg-slate-50 text-slate-700 border-slate-200';
  }

  return {
    isOverdue,
    isToday,
    days,
    hours,
    minutes,
    formattedTextVi,
    formattedTextEn,
    badgeColorClass,
  };
}

/**
 * Determine dynamic real-time status based on current time
 */
export function resolveDeadlineStatus(deadline: DeadlineEntity): DeadlineStatus {
  if (deadline.status === 'COMPLETED' || deadline.status === 'CANCELLED') {
    return deadline.status;
  }

  const now = new Date();
  if (deadline.snoozedUntil && new Date(deadline.snoozedUntil).getTime() > now.getTime()) {
    return 'SNOOZED';
  }

  if (!deadline.dueAt) {
    return deadline.status || 'OPEN';
  }

  const targetDate = new Date(deadline.dueAt);
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs < 0) {
    return 'OVERDUE';
  }

  if (deadline.status === 'WAITING' || deadline.status === 'BLOCKED' || deadline.status === 'IN_PROGRESS') {
    return deadline.status;
  }

  const isToday = 
    now.getFullYear() === targetDate.getFullYear() &&
    now.getMonth() === targetDate.getMonth() &&
    now.getDate() === targetDate.getDate();

  if (isToday) {
    return 'DUE_TODAY';
  }

  // Within next 24 hours
  if (diffMs <= 24 * 60 * 60 * 1000) {
    return 'DUE_SOON';
  }

  return deadline.status === 'OPEN' ? 'OPEN' : 'UPCOMING';
}

/**
 * Log audit trail for deadline operations (Zero Data Loss)
 */
async function recordDeadlineAudit(
  deadlineId: string,
  companyId: string,
  action: DeadlineAuditAction,
  user: { uid: string; displayName?: string; email?: string },
  previousValue?: any,
  newValue?: any,
  note?: string
) {
  try {
    const logId = `dlog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logRecord: DeadlineAuditLog = {
      id: logId,
      deadlineId,
      companyId,
      action,
      performedBy: user.uid,
      performedByName: user.displayName || user.email || 'Operator',
      timestamp: new Date().toISOString(),
      previousValue,
      newValue,
      note,
    };

    if (db) {
      await setDoc(doc(db, AUDIT_LOGS_COLLECTION, logId), logRecord);
    }
  } catch (err) {
    console.warn('[deadlineService] Non-blocking audit record error:', err);
  }
}

/**
 * Fetch deadlines with strict company tenant isolation and dynamic filtering
 */
export async function getDeadlines(
  companyId: string,
  options: DeadlineFilterOptions = {}
): Promise<DeadlineEntity[]> {
  const effectiveCompanyId = companyId || 'default-company';
  const pageLimit = options.pageLimit || 150;

  try {
    let list: DeadlineEntity[] = [];

    if (db) {
      const q = query(
        collection(db, DEADLINES_COLLECTION),
        where('companyId', '==', effectiveCompanyId),
        limit(pageLimit)
      );
      const snap = await getDocs(q);
      snap.forEach(docSnap => {
        const item = docSnap.data() as DeadlineEntity;
        deadlineMemoryCache.set(item.id, item);
        list.push(item);
      });
    } else {
      list = Array.from(deadlineMemoryCache.values()).filter(d => d.companyId === effectiveCompanyId);
    }

    // Reconcile dynamic statuses in real-time
    list = list.map(item => ({
      ...item,
      status: resolveDeadlineStatus(item),
    }));

    // Filter by status
    if (options.status && options.status !== 'ALL') {
      if (options.status === 'ACTIVE') {
        list = list.filter(d => 
          d.status === 'UPCOMING' || 
          d.status === 'DUE_SOON' || 
          d.status === 'DUE_TODAY' || 
          d.status === 'OVERDUE' || 
          d.status === 'SNOOZED'
        );
      } else {
        list = list.filter(d => d.status === options.status);
      }
    }

    // Filter by priority
    if (options.priority && options.priority !== 'ALL') {
      list = list.filter(d => d.priority === options.priority);
    }

    // Filter by entityType
    if (options.entityType && options.entityType !== 'ALL') {
      list = list.filter(d => d.entityType === options.entityType);
    }

    // Filter by assignee
    if (options.assignedTo) {
      list = list.filter(d => d.assignedTo === options.assignedTo);
    }

    // Filter by date range (dueAt between start and end)
    if (options.dateRange?.start && options.dateRange?.end) {
      const startDate = `${options.dateRange.start}T00:00:00.000Z`;
      const endDate = `${options.dateRange.end}T23:59:59.999Z`;
      list = list.filter(d => d.dueAt >= startDate && d.dueAt <= endDate);
    }

    // Search query
    if (options.searchQuery && options.searchQuery.trim()) {
      const term = options.searchQuery.toLowerCase().trim();
      list = list.filter(d => 
        d.title.toLowerCase().includes(term) ||
        (d.description && d.description.toLowerCase().includes(term)) ||
        (d.entityNumber && d.entityNumber.toLowerCase().includes(term)) ||
        (d.customerName && d.customerName.toLowerCase().includes(term)) ||
        (d.actionRequired && d.actionRequired.toLowerCase().includes(term)) ||
        (d.assignedToName && d.assignedToName.toLowerCase().includes(term))
      );
    }

    // Sort order: OVERDUE first, then DUE_TODAY, then DUE_SOON, then UPCOMING, then COMPLETED
    const statusWeight: Record<DeadlineStatus, number> = {
      OVERDUE: 1,
      DUE_TODAY: 2,
      DUE_SOON: 3,
      OPEN: 4,
      IN_PROGRESS: 5,
      WAITING: 6,
      BLOCKED: 7,
      SNOOZED: 8,
      UPCOMING: 9,
      COMPLETED: 10,
      CANCELLED: 11,
    };

    list.sort((a, b) => {
      const weightDiff = (statusWeight[a.status] || 99) - (statusWeight[b.status] || 99);
      if (weightDiff !== 0) return weightDiff;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });

    return list;
  } catch (err) {
    console.error('[deadlineService] Error fetching deadlines:', err);
    let cached = Array.from(deadlineMemoryCache.values())
      .filter(d => d.companyId === effectiveCompanyId)
      .map(d => ({ ...d, status: resolveDeadlineStatus(d) }));
    return cached.slice(0, pageLimit);
  }
}

/**
 * Compute aggregate metrics for Action Center and Control Tower
 */
export async function getDeadlineMetrics(
  companyId: string,
  userId?: string
): Promise<DeadlineMetrics> {
  const effectiveCompanyId = companyId || 'default-company';
  const all = await getDeadlines(effectiveCompanyId, { status: 'ALL', pageLimit: 300 });

  let overdue = 0;
  let dueToday = 0;
  let dueSoon = 0;
  let critical = 0;
  let upcoming = 0;
  let completed = 0;
  let unassigned = 0;
  let myItems = 0;
  let active = 0;

  for (const d of all) {
    if (d.status === 'COMPLETED' || d.status === 'CANCELLED') {
      if (d.status === 'COMPLETED') completed++;
      continue;
    }

    active++;

    if (d.status === 'OVERDUE') overdue++;
    if (d.status === 'DUE_TODAY') dueToday++;
    if (d.status === 'DUE_SOON') dueSoon++;
    if (d.status === 'UPCOMING') upcoming++;

    if (d.priority === 'CRITICAL') critical++;
    if (!d.assignedTo) unassigned++;
    if (userId && d.assignedTo === userId) myItems++;
  }

  return {
    total: all.length,
    active,
    overdue,
    dueToday,
    dueSoon,
    critical,
    upcoming,
    completed,
    unassigned,
    myItems,
  };
}

/**
 * Create a custom deadline entered manually by an operator
 */
export async function createCustomDeadline(
  payload: {
    companyId: string;
    title: string;
    description?: string;
    dueAt: string;
    timezone?: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    assignedTo?: string;
    assignedToName?: string;
    actionRequired?: string;
    entityId?: string;
    entityType?: 'CUSTOM' | 'SHIPMENT' | 'QUOTATION';
    entityNumber?: string;
  },
  user: { uid: string; displayName?: string; email?: string }
): Promise<DeadlineEntity> {
  const effectiveCompanyId = payload.companyId || 'default-company';
  const id = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newDeadline: DeadlineEntity = {
    id,
    companyId: effectiveCompanyId,
    entityType: payload.entityType || 'CUSTOM',
    entityId: payload.entityId || id,
    entityNumber: payload.entityNumber,
    deadlineType: 'CUSTOM_DEADLINE',
    title: payload.title,
    description: payload.description || '',
    actionRequired: payload.actionRequired || 'Thực hiện công việc theo yêu cầu',
    dueAt: payload.dueAt,
    timezone: payload.timezone || 'Asia/Ho_Chi_Minh',
    status: 'UPCOMING',
    priority: payload.priority,
    assignedTo: payload.assignedTo,
    assignedToName: payload.assignedToName,
    source: 'MANUAL_USER',
    idempotencyKey: `CUSTOM_${id}`,
    version: 1,
    createdAt: now,
    createdBy: user.uid,
    updatedAt: now,
    updatedBy: user.uid,
  };

  newDeadline.status = resolveDeadlineStatus(newDeadline);

  deadlineMemoryCache.set(id, newDeadline);

  if (db) {
    await setDoc(doc(db, DEADLINES_COLLECTION, id), newDeadline);
  }

  await recordDeadlineAudit(
    id,
    effectiveCompanyId,
    'CREATED',
    user,
    null,
    newDeadline,
    `Tạo deadline thủ công: ${payload.title}`
  );

  return newDeadline;
}

/**
 * Snooze a deadline by a given duration or specific timestamp
 */
export async function snoozeDeadline(
  deadlineId: string,
  snoozeUntilIso: string,
  user: { uid: string; displayName?: string; email?: string },
  reason?: string
): Promise<DeadlineEntity> {
  let existing = deadlineMemoryCache.get(deadlineId);

  if (!existing && db) {
    const snap = await getDoc(doc(db, DEADLINES_COLLECTION, deadlineId));
    if (snap.exists()) {
      existing = snap.data() as DeadlineEntity;
    }
  }

  if (!existing) {
    throw new Error(`Deadline not found: ${deadlineId}`);
  }

  const previousValue = { status: existing.status, snoozedUntil: existing.snoozedUntil };
  const updated: DeadlineEntity = {
    ...existing,
    status: 'SNOOZED',
    snoozedUntil: snoozeUntilIso,
    snoozeCount: (existing.snoozeCount || 0) + 1,
    updatedAt: new Date().toISOString(),
    updatedBy: user.uid,
    version: (existing.version || 1) + 1,
  };

  deadlineMemoryCache.set(deadlineId, updated);

  if (db) {
    await updateDoc(doc(db, DEADLINES_COLLECTION, deadlineId), {
      status: updated.status,
      snoozedUntil: updated.snoozedUntil,
      snoozeCount: updated.snoozeCount,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
      version: updated.version,
    });
  }

  await recordDeadlineAudit(
    deadlineId,
    existing.companyId,
    'SNOOZED',
    user,
    previousValue,
    { snoozedUntil: snoozeUntilIso },
    reason || 'Tạm hoãn deadline sang mốc mới'
  );

  return updated;
}

/**
 * Mark a deadline as completed with evidence note
 */
export async function completeDeadline(
  deadlineId: string,
  user: { uid: string; displayName?: string; email?: string },
  evidenceNote?: string
): Promise<DeadlineEntity> {
  let existing = deadlineMemoryCache.get(deadlineId);

  if (!existing && db) {
    const snap = await getDoc(doc(db, DEADLINES_COLLECTION, deadlineId));
    if (snap.exists()) {
      existing = snap.data() as DeadlineEntity;
    }
  }

  if (!existing) {
    throw new Error(`Deadline not found: ${deadlineId}`);
  }

  const previousStatus = existing.status;
  const now = new Date().toISOString();

  const updated: DeadlineEntity = {
    ...existing,
    status: 'COMPLETED',
    completedAt: now,
    completedBy: user.displayName || user.email || user.uid,
    completionEvidence: evidenceNote || 'Hoàn tất bởi người điều hành',
    updatedAt: now,
    updatedBy: user.uid,
    version: (existing.version || 1) + 1,
  };

  deadlineMemoryCache.set(deadlineId, updated);

  if (db) {
    await updateDoc(doc(db, DEADLINES_COLLECTION, deadlineId), {
      status: updated.status,
      completedAt: updated.completedAt,
      completedBy: updated.completedBy,
      completionEvidence: updated.completionEvidence,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
      version: updated.version,
    });
  }

  await recordDeadlineAudit(
    deadlineId,
    existing.companyId,
    'COMPLETED',
    user,
    { status: previousStatus },
    { status: 'COMPLETED', completionEvidence: updated.completionEvidence },
    evidenceNote || 'Đánh dấu hoàn thành deadline'
  );

  return updated;
}

/**
 * Reassign a deadline to a different user
 */
export async function assignDeadline(
  deadlineId: string,
  assignedTo: string,
  assignedToName: string,
  user: { uid: string; displayName?: string; email?: string }
): Promise<DeadlineEntity> {
  let existing = deadlineMemoryCache.get(deadlineId);

  if (!existing && db) {
    const snap = await getDoc(doc(db, DEADLINES_COLLECTION, deadlineId));
    if (snap.exists()) {
      existing = snap.data() as DeadlineEntity;
    }
  }

  if (!existing) {
    throw new Error(`Deadline not found: ${deadlineId}`);
  }

  const previous = { assignedTo: existing.assignedTo, assignedToName: existing.assignedToName };
  const updated: DeadlineEntity = {
    ...existing,
    assignedTo,
    assignedToName,
    updatedAt: new Date().toISOString(),
    updatedBy: user.uid,
    version: (existing.version || 1) + 1,
  };

  deadlineMemoryCache.set(deadlineId, updated);

  if (db) {
    await updateDoc(doc(db, DEADLINES_COLLECTION, deadlineId), {
      assignedTo,
      assignedToName,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
      version: updated.version,
    });
  }

  await recordDeadlineAudit(
    deadlineId,
    existing.companyId,
    'ASSIGNED',
    user,
    previous,
    { assignedTo, assignedToName },
    `Phân công cho: ${assignedToName}`
  );

  return updated;
}

/**
 * Idempotent upsert helper for system-generated deadlines
 */
async function upsertSystemDeadline(
  payload: Omit<DeadlineEntity, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
  user: { uid: string; displayName?: string; email?: string }
): Promise<DeadlineEntity> {
  const existingId = Array.from(deadlineMemoryCache.values()).find(
    d => d.companyId === payload.companyId && d.idempotencyKey === payload.idempotencyKey
  )?.id;

  let entityIdToUse = existingId;

  if (!entityIdToUse && db) {
    try {
      const q = query(
        collection(db, DEADLINES_COLLECTION),
        where('companyId', '==', payload.companyId),
        where('idempotencyKey', '==', payload.idempotencyKey),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        entityIdToUse = snap.docs[0].id;
      }
    } catch (err) {
      console.warn('[deadlineService] Query by idempotencyKey failed:', err);
    }
  }

  const now = new Date().toISOString();

  if (entityIdToUse) {
    const existing = deadlineMemoryCache.get(entityIdToUse);
    // If already completed or cancelled, do not revert unless due date changed
    if (existing && existing.status === 'COMPLETED' && payload.status !== 'COMPLETED') {
      return existing;
    }

    const updated: DeadlineEntity = {
      ...payload,
      id: entityIdToUse,
      version: (existing?.version || 1) + 1,
      createdAt: existing?.createdAt || now,
      createdBy: existing?.createdBy || user.uid,
      updatedAt: now,
      updatedBy: user.uid,
    };

    updated.status = resolveDeadlineStatus(updated);
    deadlineMemoryCache.set(entityIdToUse, updated);

    if (db) {
      await setDoc(doc(db, DEADLINES_COLLECTION, entityIdToUse), updated, { merge: true });
    }

    return updated;
  } else {
    const newId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const created: DeadlineEntity = {
      ...payload,
      id: newId,
      version: 1,
      createdAt: now,
      createdBy: user.uid,
      updatedAt: now,
      updatedBy: user.uid,
    };

    created.status = resolveDeadlineStatus(created);
    deadlineMemoryCache.set(newId, created);

    if (db) {
      await setDoc(doc(db, DEADLINES_COLLECTION, newId), created);
    }

    return created;
  }
}

/**
 * Sync shipment deadlines: Cargo Ready, Cutoffs (SI, CY, VGM, Doc), ETD, ETA
 */
export async function syncShipmentDeadlines(
  shipment: ShipmentRecord,
  user: { uid: string; displayName?: string }
): Promise<number> {
  if (!shipment || !shipment.id) return 0;
  const effectiveCompanyId = shipment.companyId || 'default-company';
  let syncCount = 0;

  // 1. Cargo Ready Date
  if (shipment.cargoReadyDate) {
    const dueAt = shipment.cargoReadyDate.length === 10 ? `${shipment.cargoReadyDate}T17:00:00.000Z` : shipment.cargoReadyDate;
    await upsertSystemDeadline({
      companyId: effectiveCompanyId,
      entityType: 'SHIPMENT',
      entityId: shipment.id,
      entityNumber: shipment.shipmentNumber,
      customerName: shipment.customerName,
      serviceMode: shipment.serviceMode,
      deadlineType: 'CARGO_READY',
      title: `Lịch hàng sẵn sàng (Cargo Ready Date) - ${shipment.shipmentNumber}`,
      description: `Hàng hóa dự kiến sẵn sàng tại kho/nhà xưởng vào ngày ${shipment.cargoReadyDate}.`,
      actionRequired: 'Liên hệ chủ hàng & điều phối xe tải lấy hàng (Pickup Cargo)',
      dueAt,
      timezone: 'Asia/Ho_Chi_Minh',
      status: 'UPCOMING',
      priority: 'HIGH',
      assignedTo: shipment.assignedTo,
      assignedToName: shipment.assignedToName,
      source: 'AUTO_SHIPMENT',
      idempotencyKey: `SHP_${shipment.id}_CARGO_READY`,
    }, user);
    syncCount++;
  }

  // 2. SI Cutoff
  if (shipment.siCutoff) {
    const dueAt = shipment.siCutoff.length === 10 ? `${shipment.siCutoff}T17:00:00.000Z` : shipment.siCutoff;
    await upsertSystemDeadline({
      companyId: effectiveCompanyId,
      entityType: 'SHIPMENT',
      entityId: shipment.id,
      entityNumber: shipment.shipmentNumber,
      customerName: shipment.customerName,
      serviceMode: shipment.serviceMode,
      deadlineType: 'SI_CUTOFF',
      title: `Hạn SI Cut-off (Shipping Instruction) - ${shipment.shipmentNumber}`,
      description: `Hạn chót gửi hướng dẫn lập vận đơn cho Hãng tàu/NVOCC. Tránh phạt trễ SI hoặc rớt tàu.`,
      actionRequired: 'Lập và gửi SI (Shipping Instruction) kèm thông tin Container & Seal',
      dueAt,
      timezone: 'Asia/Ho_Chi_Minh',
      status: 'UPCOMING',
      priority: 'CRITICAL',
      assignedTo: shipment.assignedTo,
      assignedToName: shipment.assignedToName,
      source: 'AUTO_SHIPMENT',
      idempotencyKey: `SHP_${shipment.id}_SI_CUTOFF`,
    }, user);
    syncCount++;
  }

  // 3. CY Cutoff
  if (shipment.cyCutoff) {
    const dueAt = shipment.cyCutoff.length === 10 ? `${shipment.cyCutoff}T17:00:00.000Z` : shipment.cyCutoff;
    await upsertSystemDeadline({
      companyId: effectiveCompanyId,
      entityType: 'SHIPMENT',
      entityId: shipment.id,
      entityNumber: shipment.shipmentNumber,
      customerName: shipment.customerName,
      serviceMode: shipment.serviceMode,
      deadlineType: 'CY_CUTOFF',
      title: `Hạn đóng hàng / Vào bãi CY (CY Cut-off) - ${shipment.shipmentNumber}`,
      description: `Hạn chót hạ container vào bãi cảng (Gate-in) trước khi cắt máng tàu.`,
      actionRequired: 'Xác nhận xe đã hạ container vào bãi cảng và đóng tiền hạ bãi',
      dueAt,
      timezone: 'Asia/Ho_Chi_Minh',
      status: 'UPCOMING',
      priority: 'CRITICAL',
      assignedTo: shipment.assignedTo,
      assignedToName: shipment.assignedToName,
      source: 'AUTO_SHIPMENT',
      idempotencyKey: `SHP_${shipment.id}_CY_CUTOFF`,
    }, user);
    syncCount++;
  }

  // 4. VGM Cutoff
  if (shipment.vgmCutoff) {
    const dueAt = shipment.vgmCutoff.length === 10 ? `${shipment.vgmCutoff}T17:00:00.000Z` : shipment.vgmCutoff;
    await upsertSystemDeadline({
      companyId: effectiveCompanyId,
      entityType: 'SHIPMENT',
      entityId: shipment.id,
      entityNumber: shipment.shipmentNumber,
      customerName: shipment.customerName,
      serviceMode: shipment.serviceMode,
      deadlineType: 'VGM_CUTOFF',
      title: `Hạn nộp phiếu cân VGM (VGM Cut-off) - ${shipment.shipmentNumber}`,
      description: `Hạn chót nộp phiếu cân tải trọng container khai báo SOLAS.`,
      actionRequired: 'Lấy phiếu cân từ tài xế/kho và nộp VGM lên hệ thống hãng tàu',
      dueAt,
      timezone: 'Asia/Ho_Chi_Minh',
      status: 'UPCOMING',
      priority: 'HIGH',
      assignedTo: shipment.assignedTo,
      assignedToName: shipment.assignedToName,
      source: 'AUTO_SHIPMENT',
      idempotencyKey: `SHP_${shipment.id}_VGM_CUTOFF`,
    }, user);
    syncCount++;
  }

  // 5. ETD Planned
  if (shipment.etdPlanned) {
    const dueAt = shipment.etdPlanned.length === 10 ? `${shipment.etdPlanned}T23:59:59.000Z` : shipment.etdPlanned;
    const isDeparted = Boolean(shipment.etdActual || shipment.status === 'IN_TRANSIT' || shipment.status === 'ARRIVED' || shipment.status === 'DELIVERED');
    await upsertSystemDeadline({
      companyId: effectiveCompanyId,
      entityType: 'SHIPMENT',
      entityId: shipment.id,
      entityNumber: shipment.shipmentNumber,
      customerName: shipment.customerName,
      serviceMode: shipment.serviceMode,
      deadlineType: shipment.serviceMode === 'AIR' ? 'FLIGHT_ETD' : 'ETD',
      title: `Khởi hành dự kiến (${shipment.serviceMode === 'AIR' ? 'Flight ETD' : 'Vessel ETD'}) - ${shipment.shipmentNumber}`,
      description: `Chuyến vận chuyển dự kiến rời cảng xếp hàng ngày ${shipment.etdPlanned}.`,
      actionRequired: 'Kiểm tra tình trạng tàu chạy và lấy Vận đơn chính thức (Master B/L)',
      dueAt,
      timezone: 'Asia/Ho_Chi_Minh',
      status: isDeparted ? 'COMPLETED' : 'UPCOMING',
      completedAt: isDeparted ? (shipment.etdActual || new Date().toISOString()) : undefined,
      completionEvidence: isDeparted ? 'Tàu/chuyến bay đã khởi hành' : undefined,
      priority: 'MEDIUM',
      assignedTo: shipment.assignedTo,
      assignedToName: shipment.assignedToName,
      source: 'AUTO_SHIPMENT',
      idempotencyKey: `SHP_${shipment.id}_ETD`,
    }, user);
    syncCount++;
  }

  // 6. ETA Planned
  if (shipment.etaPlanned) {
    const dueAt = shipment.etaPlanned.length === 10 ? `${shipment.etaPlanned}T23:59:59.000Z` : shipment.etaPlanned;
    const isArrived = Boolean(shipment.etaActual || shipment.status === 'ARRIVED' || shipment.status === 'DELIVERED');
    await upsertSystemDeadline({
      companyId: effectiveCompanyId,
      entityType: 'SHIPMENT',
      entityId: shipment.id,
      entityNumber: shipment.shipmentNumber,
      customerName: shipment.customerName,
      serviceMode: shipment.serviceMode,
      deadlineType: shipment.serviceMode === 'AIR' ? 'FLIGHT_ETA' : 'ETA',
      title: `Cập cảng dự kiến (${shipment.serviceMode === 'AIR' ? 'Flight ETA' : 'Vessel ETA'}) - ${shipment.shipmentNumber}`,
      description: `Lô hàng dự kiến đến cảng dỡ hàng vào ngày ${shipment.etaPlanned}.`,
      actionRequired: 'Lấy Thông báo hàng đến (Arrival Notice) & Chuẩn bị thủ tục mở tờ khai',
      dueAt,
      timezone: 'Asia/Ho_Chi_Minh',
      status: isArrived ? 'COMPLETED' : 'UPCOMING',
      completedAt: isArrived ? (shipment.etaActual || new Date().toISOString()) : undefined,
      completionEvidence: isArrived ? 'Lô hàng đã đến cảng đích' : undefined,
      priority: 'MEDIUM',
      assignedTo: shipment.assignedTo,
      assignedToName: shipment.assignedToName,
      source: 'AUTO_SHIPMENT',
      idempotencyKey: `SHP_${shipment.id}_ETA`,
    }, user);
    syncCount++;
  }

  return syncCount;
}

/**
 * Sync Quotation Validity deadline
 */
export async function syncQuotationDeadlines(
  quotation: QuoteData,
  user: { uid: string; displayName?: string }
): Promise<boolean> {
  if (!quotation || !quotation.id || !quotation.terms?.validityDate) return false;
  const effectiveCompanyId = quotation.company?.companyId || 'default-company';

  const validUntilRaw = quotation.terms.validityDate;
  const dueAt = validUntilRaw.length === 10 ? `${validUntilRaw}T17:00:00.000Z` : validUntilRaw;

  const isAccepted = quotation.status === 'ACCEPTED';
  const isRejected = quotation.status === 'REJECTED';
  const isExpired = quotation.status === 'EXPIRED';

  let status: DeadlineStatus = 'UPCOMING';
  if (isAccepted) status = 'COMPLETED';
  else if (isRejected) status = 'CANCELLED';

  await upsertSystemDeadline({
    companyId: effectiveCompanyId,
    entityType: 'QUOTATION',
    entityId: quotation.id,
    entityNumber: quotation.quoteNumber,
    customerName: quotation.customer?.companyName || quotation.customer?.contactPerson,
    deadlineType: 'QUOTATION_VALID_UNTIL',
    title: `Hạn hiệu lực báo giá - ${quotation.quoteNumber}`,
    description: `Báo giá có hiệu lực đến ngày ${quotation.terms.validityDate}. Khách hàng: ${quotation.customer?.companyName || 'Khách hàng'}.`,
    actionRequired: 'Follow up khách hàng, xác nhận tình trạng chốt deal hoặc gia hạn giá cước',
    dueAt,
    timezone: 'Asia/Ho_Chi_Minh',
    status,
    priority: isAccepted ? 'LOW' : 'HIGH',
    source: 'AUTO_QUOTATION',
    idempotencyKey: `Q_${quotation.id}_VALIDITY`,
  }, user);

  return true;
}

// ============================================================================
// PHASE 48: SMART BUSINESS ACTION & EXECUTION ORCHESTRATION ENGINE
// ============================================================================

export interface CreateBusinessActionParams {
  companyId: string;
  actionType: DeadlineType;
  sourceEntityType: DeadlineEntityType;
  sourceEntityId: string;
  sourceEntityVersion?: number;
  title: string;
  description?: string;
  actionRequired?: string;
  priority?: DeadlinePriority;
  urgency?: 'LOW' | 'NORMAL' | 'HIGH' | 'IMMEDIATE';
  status?: DeadlineStatus;
  ownerId?: string;
  assignedTo?: string;
  assignedToName?: string;
  teamId?: string;
  dueAt: string;
  timezone?: string;
  waitingReason?: ActionWaitingReason;
  waitingReasonNote?: string;
  subtasks?: ActionSubtask[];
  relatedCustomerId?: string;
  relatedCustomerName?: string;
  relatedQuotationId?: string;
  relatedQuotationNumber?: string;
  relatedShipmentId?: string;
  relatedShipmentNumber?: string;
  relatedRateId?: string;
  relatedContractId?: string;
  relatedOpportunityId?: string;
  relatedRFQId?: string;
  relatedDecisionId?: string;
  relatedScenarioId?: string;
  relatedTaskId?: string;
  idempotencyKey?: string;
  source?: DeadlineSource;
  metadata?: Record<string, any>;
}

/**
 * Idempotent creation of a Business Action linked across relational business entities.
 * Guarantees zero duplication by checking companyId + idempotencyKey.
 */
export async function createBusinessAction(
  params: CreateBusinessActionParams,
  user: { uid: string; displayName?: string; email?: string }
): Promise<DeadlineEntity> {
  const effectiveCompanyId = params.companyId || 'default-company';
  const rawIdempotencyKey = params.idempotencyKey || 
    `ACT_${effectiveCompanyId}_${params.actionType}_${params.sourceEntityType}_${params.sourceEntityId}_${params.dueAt.substring(0, 10)}`;

  const nowIso = new Date().toISOString();

  // Check if active action with this idempotencyKey already exists
  if (db) {
    try {
      const q = query(
        collection(db, DEADLINES_COLLECTION),
        where('companyId', '==', effectiveCompanyId),
        where('idempotencyKey', '==', rawIdempotencyKey),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const existingDoc = snap.docs[0];
        const existingData = { id: existingDoc.id, ...existingDoc.data() } as DeadlineEntity;
        // If not completed or cancelled, return existing to avoid duplicate spam
        if (existingData.status !== 'COMPLETED' && existingData.status !== 'CANCELLED') {
          return existingData;
        }
      }
    } catch (e) {
      console.warn('[deadlineService] Idempotency check warning:', e);
    }
  }

  const actionId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const initialStatus = params.status || 'OPEN';

  const newAction: DeadlineEntity = {
    id: actionId,
    companyId: effectiveCompanyId,
    entityType: params.sourceEntityType,
    entityId: params.sourceEntityId,
    entityNumber: params.relatedQuotationNumber || params.relatedShipmentNumber || params.sourceEntityId,
    customerName: params.relatedCustomerName,
    deadlineType: params.actionType,
    title: params.title,
    description: params.description || '',
    actionRequired: params.actionRequired || '',
    dueAt: params.dueAt,
    timezone: params.timezone || 'Asia/Ho_Chi_Minh',
    status: initialStatus,
    priority: params.priority || 'MEDIUM',
    assignedTo: params.assignedTo,
    assignedToName: params.assignedToName,
    source: params.source || 'ACTION_CENTER',
    idempotencyKey: rawIdempotencyKey,
    version: 1,
    createdAt: nowIso,
    createdBy: user.uid,
    updatedAt: nowIso,
    updatedBy: user.uid,

    // Phase 48 Extensions
    actionType: params.actionType,
    sourceEntityType: params.sourceEntityType,
    sourceEntityId: params.sourceEntityId,
    sourceEntityVersion: params.sourceEntityVersion || 1,
    urgency: params.urgency || 'NORMAL',
    teamId: params.teamId,
    waitingReason: params.waitingReason || 'NONE',
    waitingReasonNote: params.waitingReasonNote,
    subtasks: params.subtasks || [],
    relatedCustomerId: params.relatedCustomerId,
    relatedQuotationId: params.relatedQuotationId,
    relatedShipmentId: params.relatedShipmentId,
    relatedRateId: params.relatedRateId,
    relatedContractId: params.relatedContractId,
    relatedOpportunityId: params.relatedOpportunityId,
    relatedRFQId: params.relatedRFQId,
    relatedDecisionId: params.relatedDecisionId,
    relatedScenarioId: params.relatedScenarioId,
    relatedTaskId: params.relatedTaskId,
    relatedData: params.metadata || {},
  };

  // Cache update
  deadlineMemoryCache.set(actionId, newAction);

  // Firestore Persist
  if (db) {
    await setDoc(doc(db, DEADLINES_COLLECTION, actionId), newAction);
  }

  // Audit
  await recordDeadlineAudit(
    actionId,
    effectiveCompanyId,
    'CREATED',
    user,
    null,
    newAction,
    `Tạo hành động nghiệp vụ: ${params.title} (Nguồn: ${params.sourceEntityType} - ${params.sourceEntityId})`
  );

  return newAction;
}

/**
 * Update Business Action Status with Waiting reason, Blocked state or Completion notes
 */
export async function updateBusinessActionStatus(
  actionId: string,
  companyId: string,
  newStatus: DeadlineStatus,
  user: { uid: string; displayName?: string; email?: string },
  options?: {
    waitingReason?: ActionWaitingReason;
    waitingReasonNote?: string;
    completionNote?: string;
    reason?: string;
  }
): Promise<boolean> {
  const effectiveCompanyId = companyId || 'default-company';
  const nowIso = new Date().toISOString();

  let prevAction: DeadlineEntity | null = deadlineMemoryCache.get(actionId) || null;

  if (!prevAction && db) {
    const dSnap = await getDoc(doc(db, DEADLINES_COLLECTION, actionId));
    if (dSnap.exists()) {
      prevAction = { id: dSnap.id, ...dSnap.data() } as DeadlineEntity;
    }
  }

  const updates: Partial<DeadlineEntity> = {
    status: newStatus,
    updatedAt: nowIso,
    updatedBy: user.uid,
  };

  if (newStatus === 'COMPLETED') {
    updates.completedAt = nowIso;
    updates.completedBy = user.displayName || user.email || user.uid;
    if (options?.completionNote) {
      updates.completionEvidence = options.completionNote;
    }
  }

  if (newStatus === 'WAITING' && options?.waitingReason) {
    updates.waitingReason = options.waitingReason;
    if (options.waitingReasonNote !== undefined) {
      updates.waitingReasonNote = options.waitingReasonNote;
    }
  }

  // Persist to memory cache
  if (prevAction) {
    const merged = { ...prevAction, ...updates };
    deadlineMemoryCache.set(actionId, merged);
  }

  // Persist to Firestore
  if (db) {
    await updateDoc(doc(db, DEADLINES_COLLECTION, actionId), updates as any);
  }

  // Audit
  await recordDeadlineAudit(
    actionId,
    effectiveCompanyId,
    newStatus === 'COMPLETED' ? 'COMPLETED' : 'UPDATED',
    user,
    { status: prevAction?.status, waitingReason: prevAction?.waitingReason },
    { status: newStatus, waitingReason: options?.waitingReason, note: options?.completionNote || options?.reason },
    options?.reason || `Chuyển trạng thái hành động sang ${newStatus}`
  );

  return true;
}

/**
 * Update subtasks on a business action
 */
export async function updateBusinessActionSubtasks(
  actionId: string,
  companyId: string,
  subtasks: ActionSubtask[],
  user: { uid: string; displayName?: string; email?: string }
): Promise<boolean> {
  const effectiveCompanyId = companyId || 'default-company';
  const nowIso = new Date().toISOString();

  const updates: Partial<DeadlineEntity> = {
    subtasks,
    updatedAt: nowIso,
    updatedBy: user.uid,
  };

  const prev = deadlineMemoryCache.get(actionId);
  if (prev) {
    deadlineMemoryCache.set(actionId, { ...prev, ...updates });
  }

  if (db) {
    await updateDoc(doc(db, DEADLINES_COLLECTION, actionId), updates as any);
  }

  await recordDeadlineAudit(
    actionId,
    effectiveCompanyId,
    'UPDATED',
    user,
    null,
    { subtasksCount: subtasks.length, completedCount: subtasks.filter(s => s.isCompleted).length },
    'Cập nhật danh sách công việc phụ (Subtasks)'
  );

  return true;
}

/**
 * Reassign an action to another user or team
 */
export async function reassignBusinessAction(
  actionId: string,
  companyId: string,
  assignedTo: string,
  assignedToName: string,
  teamId: string | undefined,
  user: { uid: string; displayName?: string; email?: string },
  note?: string
): Promise<boolean> {
  const effectiveCompanyId = companyId || 'default-company';
  const nowIso = new Date().toISOString();

  const updates: Partial<DeadlineEntity> = {
    assignedTo,
    assignedToName,
    teamId,
    updatedAt: nowIso,
    updatedBy: user.uid,
  };

  const prev = deadlineMemoryCache.get(actionId);
  if (prev) {
    deadlineMemoryCache.set(actionId, { ...prev, ...updates });
  }

  if (db) {
    await updateDoc(doc(db, DEADLINES_COLLECTION, actionId), updates as any);
  }

  await recordDeadlineAudit(
    actionId,
    effectiveCompanyId,
    'REASSIGNED',
    user,
    { assignedTo: prev?.assignedTo, assignedToName: prev?.assignedToName },
    { assignedTo, assignedToName, teamId },
    note || `Phân công lại hành động cho ${assignedToName}`
  );

  return true;
}

/**
 * Fetch historical audit logs for a specific business action
 */
export async function getBusinessActionAuditTrail(
  actionId: string,
  companyId: string
): Promise<DeadlineAuditLog[]> {
  const effectiveCompanyId = companyId || 'default-company';
  if (!db) return [];

  try {
    const q = query(
      collection(db, AUDIT_LOGS_COLLECTION),
      where('companyId', '==', effectiveCompanyId),
      where('deadlineId', '==', actionId),
      limit(50)
    );
    const snap = await getDocs(q);
    const list: DeadlineAuditLog[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as DeadlineAuditLog));
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list;
  } catch (err) {
    console.warn('[deadlineService] Error fetching audit trail:', err);
    return [];
  }
}

// ============================================================================
// PHASE 49: BUSINESS ACTION EXECUTION + FOLLOW-UP CONTROL CENTER SERVICES
// ============================================================================

export interface LogTouchpointParams {
  actionId: string;
  companyId: string;
  channel: FollowUpChannel;
  sentiment: CustomerSentiment;
  discussionSummary: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  nextStepAction?: string;
  nextFollowUpDue?: string; // ISO 8601
  user: { uid: string; displayName?: string; email?: string };
  syncToCrm?: boolean;
  updateActionStatus?: boolean;
}

/**
 * Log an interactive follow-up touchpoint for an action, update its cadence,
 * and synchronize to CRM Customer 360 Activity Log & Deadline Engine.
 */
export async function logBusinessActionTouchpoint(
  params: LogTouchpointParams
): Promise<FollowUpTouchpointRecord> {
  const {
    actionId,
    companyId,
    channel,
    sentiment,
    discussionSummary,
    contactPerson,
    contactPhone,
    contactEmail,
    nextStepAction,
    nextFollowUpDue,
    user,
    syncToCrm = true,
  } = params;

  const effectiveCompanyId = companyId || 'default-company';
  const nowIso = new Date().toISOString();
  const touchpointId = `tp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Retrieve the existing action
  let action: DeadlineEntity | null = deadlineMemoryCache.get(actionId) || null;
  if (!action && db) {
    const snap = await getDoc(doc(db, DEADLINES_COLLECTION, actionId));
    if (snap.exists()) {
      action = { id: snap.id, ...snap.data() } as DeadlineEntity;
    }
  }

  const record: FollowUpTouchpointRecord = {
    id: touchpointId,
    actionId,
    companyId: effectiveCompanyId,
    channel,
    sentiment,
    contactPerson: contactPerson || action?.customerName,
    contactPhone,
    contactEmail,
    discussionSummary,
    nextStepAction,
    nextFollowUpDue,
    createdByName: user.displayName || user.email || 'Logistics Operator',
    createdByUid: user.uid,
    createdAt: nowIso,
    relatedEntityId: action?.entityId,
    relatedEntityType: action?.entityType,
    relatedEntityNumber: action?.entityNumber,
    customerName: action?.customerName,
    quotationAmount: action?.relatedData?.totalAmount || action?.relatedData?.grandTotal,
    quotationCurrency: action?.relatedData?.currency || 'USD',
  };

  // 2. Persist touchpoint to Firestore
  if (db) {
    try {
      const tpRef = doc(db, FOLLOW_UP_TOUCHPOINTS_COLLECTION, touchpointId);
      const cleanData: Record<string, any> = { ...record };
      Object.keys(cleanData).forEach(k => cleanData[k] === undefined && delete cleanData[k]);
      await setDoc(tpRef, cleanData);
    } catch (e) {
      console.warn('[deadlineService] Error saving touchpoint record:', e);
    }
  }

  // 3. Update the parent action's state, next cadence, and waiting reasons
  const newTouchpointCount = (action?.touchpointsCount || 0) + 1;
  const updates: Partial<DeadlineEntity> = {
    touchpointsCount: newTouchpointCount,
    lastTouchpointAt: nowIso,
    lastTouchpointChannel: channel,
    customerSentiment: sentiment,
    updatedAt: nowIso,
    updatedBy: user.uid,
  };

  if (nextFollowUpDue) {
    updates.nextFollowUpDue = nextFollowUpDue;
    updates.dueAt = nextFollowUpDue;
  }

  // Sentiment-driven smart status & waiting reason routing
  if (sentiment === 'READY_TO_BOOK') {
    updates.status = 'IN_PROGRESS';
    updates.waitingReason = 'NONE';
    updates.waitingReasonNote = 'Khách đồng ý chốt, đang xúc tiến booking/hợp đồng';
  } else if (sentiment === 'PRICE_SENSITIVE') {
    updates.status = 'WAITING';
    updates.waitingReason = 'RATE';
    updates.waitingReasonNote = `Khách chê giá cao: ${discussionSummary.slice(0, 80)}`;
  } else if (sentiment === 'NEED_REVISION') {
    updates.status = 'WAITING';
    updates.waitingReason = 'INTERNAL_APPROVAL';
    updates.waitingReasonNote = `Cần sửa báo giá: ${discussionSummary.slice(0, 80)}`;
  } else if (sentiment === 'WAITING_MANAGEMENT') {
    updates.status = 'WAITING';
    updates.waitingReason = 'CUSTOMER';
    updates.waitingReasonNote = 'Chờ sếp/ban giám đốc khách hàng phê duyệt';
  } else if (sentiment === 'LOST') {
    updates.status = 'CANCELLED';
    updates.waitingReason = 'OTHER';
    updates.waitingReasonNote = `Mất deal: ${discussionSummary.slice(0, 80)}`;
  } else if (action && action.status === 'OPEN') {
    updates.status = 'IN_PROGRESS';
  }

  if (action) {
    const merged = { ...action, ...updates };
    deadlineMemoryCache.set(actionId, merged);
  }

  if (db) {
    try {
      await updateDoc(doc(db, DEADLINES_COLLECTION, actionId), updates as any);
    } catch (e) {
      console.warn('[deadlineService] Error updating deadline action after touchpoint:', e);
    }
  }

  // 4. Audit Log
  await recordDeadlineAudit(
    actionId,
    effectiveCompanyId,
    'UPDATED',
    user,
    { sentiment: action?.customerSentiment, touchpointsCount: action?.touchpointsCount },
    { sentiment, channel, nextFollowUpDue, touchpointsCount: newTouchpointCount },
    `Ghi nhận Follow-up [${channel}]: ${discussionSummary.slice(0, 60)}`
  );

  // 5. CRM Customer 360 Activity Sync
  if (syncToCrm && action?.customerName) {
    try {
      const crmActivityType = 
        channel === 'CALL' ? 'CALL' :
        channel === 'EMAIL' ? 'EMAIL' :
        channel === 'MEETING' ? 'MEETING' : 'NOTE_ADDED';

      await logCustomerActivity({
        companyId: effectiveCompanyId,
        customerId: action.relatedCustomerId || action.entityId || 'crm-client',
        customerName: action.customerName,
        activityType: crmActivityType,
        occurredAt: nowIso,
        createdBy: user.email || user.uid,
        createdByName: user.displayName || user.email || 'Operator',
        relatedEntityType: action.entityType as any,
        relatedEntityId: action.entityId,
        relatedEntityNumber: action.entityNumber,
        summary: `Follow-up [${channel}]: ${discussionSummary.slice(0, 100)}`,
        details: discussionSummary,
        nextAction: nextStepAction,
        nextActionDue: nextFollowUpDue,
        visibility: 'INTERNAL',
      });
    } catch (err) {
      console.warn('[deadlineService] Failed to sync touchpoint to CRM activity:', err);
    }
  }

  return record;
}

/**
 * Retrieve touchpoint history for a specific business action
 */
export async function getBusinessActionTouchpoints(
  actionId: string,
  companyId: string
): Promise<FollowUpTouchpointRecord[]> {
  const effectiveCompanyId = companyId || 'default-company';
  if (!db) return [];

  try {
    const q = query(
      collection(db, FOLLOW_UP_TOUCHPOINTS_COLLECTION),
      where('companyId', '==', effectiveCompanyId),
      where('actionId', '==', actionId),
      limit(50)
    );
    const snap = await getDocs(q);
    const list: FollowUpTouchpointRecord[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as FollowUpTouchpointRecord));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.warn('[deadlineService] Error fetching action touchpoints:', err);
    return [];
  }
}

/**
 * Retrieve all recent follow-up touchpoints across the entire company
 */
export async function getCompanyTouchpoints(
  companyId: string,
  maxLimit: number = 100
): Promise<FollowUpTouchpointRecord[]> {
  const effectiveCompanyId = companyId || 'default-company';
  if (!db) return [];

  try {
    const q = query(
      collection(db, FOLLOW_UP_TOUCHPOINTS_COLLECTION),
      where('companyId', '==', effectiveCompanyId),
      limit(maxLimit)
    );
    const snap = await getDocs(q);
    const list: FollowUpTouchpointRecord[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as FollowUpTouchpointRecord));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.warn('[deadlineService] Error fetching company touchpoints:', err);
    return [];
  }
}

/**
 * Rapid Cadence Advancement: Shift dueAt by specified hours (+24h, +48h, +72h, +168h)
 */
export async function quickCadenceAdvance(
  actionId: string,
  companyId: string,
  hours: number,
  user: { uid: string; displayName?: string; email?: string },
  note: string = 'Lên lịch lại theo chu kỳ Follow-Up'
): Promise<boolean> {
  const effectiveCompanyId = companyId || 'default-company';
  const now = new Date();
  const nextDueDate = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  const updates: Partial<DeadlineEntity> = {
    dueAt: nextDueDate,
    nextFollowUpDue: nextDueDate,
    updatedAt: nowIso,
    updatedBy: user.uid,
  };

  const prev = deadlineMemoryCache.get(actionId);
  if (prev) {
    deadlineMemoryCache.set(actionId, { ...prev, ...updates });
  }

  if (db) {
    await updateDoc(doc(db, DEADLINES_COLLECTION, actionId), updates as any);
  }

  await recordDeadlineAudit(
    actionId,
    effectiveCompanyId,
    'UPDATED',
    user,
    { dueAt: prev?.dueAt },
    { dueAt: nextDueDate, hoursAdvanced: hours },
    `${note} (+${hours >= 24 ? `${Math.round(hours / 24)} ngày` : `${hours}h`})`
  );

  return true;
}

/**
 * Phase 49 KPI Metrics for Follow-Up Control Center
 */
export interface FollowUpControlMetrics {
  totalActive: number;
  overdue: number;
  dueToday: number;
  upcoming7Days: number;
  priceObjections: number;
  warmLeads: number;
  completedWon: number;
  lostCount: number;
}

export async function calculateFollowUpControlMetrics(
  actions: DeadlineEntity[]
): Promise<FollowUpControlMetrics> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 86400000;
  const in7Days = endOfToday + 6 * 86400000;

  let overdue = 0;
  let dueToday = 0;
  let upcoming7Days = 0;
  let priceObjections = 0;
  let warmLeads = 0;
  let completedWon = 0;
  let lostCount = 0;
  let totalActive = 0;

  actions.forEach((a) => {
    const isCompleted = a.status === 'COMPLETED';
    const isCancelled = a.status === 'CANCELLED';

    if (isCompleted) {
      completedWon++;
      return;
    }
    if (isCancelled || a.customerSentiment === 'LOST') {
      lostCount++;
      return;
    }

    totalActive++;

    if (a.customerSentiment === 'PRICE_SENSITIVE' || a.waitingReason === 'RATE') {
      priceObjections++;
    }

    if (a.customerSentiment === 'VERY_INTERESTED' || a.customerSentiment === 'READY_TO_BOOK') {
      warmLeads++;
    }

    const dueTime = new Date(a.dueAt).getTime();
    if (!isNaN(dueTime)) {
      if (dueTime < startOfToday) {
        overdue++;
      } else if (dueTime >= startOfToday && dueTime < endOfToday) {
        dueToday++;
      } else if (dueTime >= endOfToday && dueTime <= in7Days) {
        upcoming7Days++;
      }
    }
  });

  return {
    totalActive,
    overdue,
    dueToday,
    upcoming7Days,
    priceObjections,
    warmLeads,
    completedWon,
    lostCount,
  };
}


