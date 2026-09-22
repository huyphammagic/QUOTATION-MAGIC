/**
 * Logistics Exception Management Engine - Phase 42 Service
 * Enterprise Lifecycle Management, Idempotent Detection, Multi-Company Scoping, Audit Timeline
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  ShipmentException, 
  ExceptionStatus, 
  ExceptionSeverity, 
  ExceptionFilterOptions,
  ExceptionTimelineEvent,
  isValidExceptionTransition,
  ExceptionSourceType,
  ExceptionType
} from '../../types/exception';
import { ShipmentRecord } from '../../types/shipment';

const EXCEPTIONS_COLLECTION = 'shipmentExceptions';
const AUDIT_LOGS_COLLECTION = 'shipmentAuditLogs';

// In-memory cache for snappy responsive UX and cross-tab hydration
const exceptionMemoryCache = new Map<string, ShipmentException>();

/**
 * Fetch paginated exceptions with strict company-level tenant isolation
 */
export async function getExceptions(
  companyId: string,
  options: ExceptionFilterOptions = {}
): Promise<{ exceptions: ShipmentException[]; lastDoc?: DocumentSnapshot }> {
  const effectiveCompanyId = companyId || 'default-company';
  const pageLimit = options.pageLimit || 50;

  if (!db) {
    let list = Array.from(exceptionMemoryCache.values())
      .filter(e => e.companyId === effectiveCompanyId);

    if (options.status && options.status !== 'ALL') {
      if (options.status === 'ACTIVE') {
        list = list.filter(e => e.status === 'OPEN' || e.status === 'ACKNOWLEDGED' || e.status === 'IN_PROGRESS');
      } else {
        list = list.filter(e => e.status === options.status);
      }
    }

    if (options.severity && options.severity !== 'ALL') {
      list = list.filter(e => e.severity === options.severity);
    }

    if (options.shipmentId) {
      list = list.filter(e => e.shipmentId === options.shipmentId);
    }

    return { exceptions: list.slice(0, pageLimit) };
  }

  try {
    const collRef = collection(db, EXCEPTIONS_COLLECTION);
    
    // Construct indexed query
    let q = query(
      collRef,
      where('companyId', '==', effectiveCompanyId),
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
    );

    if (options.status && options.status !== 'ALL' && options.status !== 'ACTIVE') {
      q = query(
        collRef,
        where('companyId', '==', effectiveCompanyId),
        where('status', '==', options.status),
        orderBy('createdAt', 'desc'),
        limit(pageLimit)
      );
    } else if (options.shipmentId) {
      q = query(
        collRef,
        where('companyId', '==', effectiveCompanyId),
        where('shipmentId', '==', options.shipmentId),
        orderBy('createdAt', 'desc'),
        limit(pageLimit)
      );
    }

    const snap = await getDocs(q);
    const exceptions: ShipmentException[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data() as ShipmentException;
      const record = { ...data, id: docSnap.id };
      exceptions.push(record);
      exceptionMemoryCache.set(record.id, record);
    });

    let filtered = exceptions;

    // In-memory filter for composite options not covered by simple index
    if (options.status === 'ACTIVE') {
      filtered = filtered.filter(e => e.status === 'OPEN' || e.status === 'ACKNOWLEDGED' || e.status === 'IN_PROGRESS');
    }

    if (options.severity && options.severity !== 'ALL') {
      filtered = filtered.filter(e => e.severity === options.severity);
    }

    if (options.sourceType && options.sourceType !== 'ALL') {
      filtered = filtered.filter(e => e.sourceType === options.sourceType);
    }

    if (options.assignedTo) {
      filtered = filtered.filter(e => e.assignedTo === options.assignedTo);
    }

    if (options.searchQuery && options.searchQuery.trim()) {
      const term = options.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(e => 
        e.title.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term) ||
        e.shipmentNumber.toLowerCase().includes(term) ||
        (e.customerName && e.customerName.toLowerCase().includes(term)) ||
        (e.assignedToName && e.assignedToName.toLowerCase().includes(term))
      );
    }

    const lastDoc = snap.docs[snap.docs.length - 1];
    return { exceptions: filtered, lastDoc };
  } catch (err) {
    console.error('[exceptionService] Error fetching exceptions:', err);
    let list = Array.from(exceptionMemoryCache.values())
      .filter(e => e.companyId === effectiveCompanyId);
    return { exceptions: list.slice(0, pageLimit) };
  }
}

/**
 * Fetch single exception by ID
 */
export async function getExceptionById(
  exceptionId: string,
  companyId?: string
): Promise<ShipmentException | null> {
  if (!exceptionId) return null;

  if (exceptionMemoryCache.has(exceptionId)) {
    const cached = exceptionMemoryCache.get(exceptionId)!;
    if (!companyId || cached.companyId === companyId) {
      return cached;
    }
  }

  if (!db) return null;

  try {
    const docRef = doc(db, EXCEPTIONS_COLLECTION, exceptionId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data() as ShipmentException;
    const record = { ...data, id: snap.id };

    if (companyId && record.companyId !== companyId) {
      console.warn('[exceptionService] Cross-company exception access blocked');
      return null;
    }

    exceptionMemoryCache.set(record.id, record);
    return record;
  } catch (err) {
    console.error('[exceptionService] Error getting exception:', err);
    return null;
  }
}

/**
 * Create a new exception manually or from an operational trigger
 */
export async function createException(
  payload: {
    companyId: string;
    shipmentId: string;
    shipmentNumber: string;
    quotationId?: string;
    quotationNumber?: string;
    customerId?: string;
    customerName?: string;
    sourceType: ExceptionSourceType;
    sourceId?: string;
    exceptionType: ExceptionType;
    idempotencyKey?: string;
    title: string;
    description: string;
    severity: ExceptionSeverity;
    assignedTo?: string;
    assignedToName?: string;
    dueAt?: string;
    relatedData?: Record<string, any>;
  },
  user: { uid: string; displayName?: string; email?: string }
): Promise<ShipmentException> {
  const effectiveCompanyId = payload.companyId || 'default-company';
  const now = new Date().toISOString();
  const userName = user.displayName || user.email || 'Operator';
  const exceptionId = `exc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Idempotency check: If an active exception exists with this idempotency key, return it!
  if (payload.idempotencyKey) {
    const existing = Array.from(exceptionMemoryCache.values()).find(
      e => e.companyId === effectiveCompanyId &&
           e.idempotencyKey === payload.idempotencyKey &&
           (e.status === 'OPEN' || e.status === 'ACKNOWLEDGED' || e.status === 'IN_PROGRESS')
    );
    if (existing) {
      return existing;
    }
  }

  const initialTimelineEvent: ExceptionTimelineEvent = {
    id: `evt_${Date.now()}_1`,
    exceptionId,
    action: 'CREATED',
    timestamp: now,
    performedBy: user.uid || 'system',
    performedByName: userName,
    newValue: { severity: payload.severity, status: 'OPEN' },
    note: 'Khởi tạo bất thường vận hành (Exception logged)',
  };

  const newRecord: ShipmentException = {
    id: exceptionId,
    companyId: effectiveCompanyId,
    shipmentId: payload.shipmentId,
    shipmentNumber: payload.shipmentNumber,
    quotationId: payload.quotationId,
    quotationNumber: payload.quotationNumber,
    customerId: payload.customerId,
    customerName: payload.customerName,
    sourceType: payload.sourceType,
    sourceId: payload.sourceId,
    exceptionType: payload.exceptionType,
    idempotencyKey: payload.idempotencyKey || `${payload.shipmentId}_${payload.exceptionType}_${payload.sourceId || 'root'}`,
    title: payload.title,
    description: payload.description,
    severity: payload.severity,
    status: 'OPEN',
    assignedTo: payload.assignedTo,
    assignedToName: payload.assignedToName,
    dueAt: payload.dueAt,
    createdAt: now,
    createdBy: userName,
    updatedAt: now,
    updatedBy: userName,
    version: 1,
    timeline: [initialTimelineEvent],
    relatedData: payload.relatedData,
  };

  if (db) {
    try {
      const docRef = doc(db, EXCEPTIONS_COLLECTION, newRecord.id);
      await setDoc(docRef, newRecord);
    } catch (err) {
      console.error('[exceptionService] Error writing exception to Firestore:', err);
    }
  }

  exceptionMemoryCache.set(newRecord.id, newRecord);
  return newRecord;
}

/**
 * Update status with centralized lifecycle validation
 */
export async function updateExceptionStatus(
  exceptionId: string,
  newStatus: ExceptionStatus,
  user: { uid: string; displayName?: string; email?: string },
  note?: string
): Promise<ShipmentException> {
  const current = await getExceptionById(exceptionId);
  if (!current) throw new Error(`Exception ${exceptionId} not found.`);

  if (!isValidExceptionTransition(current.status, newStatus)) {
    throw new Error(`Invalid status transition from ${current.status} to ${newStatus}.`);
  }

  const now = new Date().toISOString();
  const userName = user.displayName || user.email || 'User';

  const timelineEvent: ExceptionTimelineEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    exceptionId,
    action: 'STATUS_CHANGED',
    timestamp: now,
    performedBy: user.uid || 'unknown',
    performedByName: userName,
    previousValue: current.status,
    newValue: newStatus,
    note: note || `Chuyển trạng thái sang ${newStatus}`,
  };

  const updates: Partial<ShipmentException> = {
    status: newStatus,
    updatedAt: now,
    updatedBy: userName,
    version: (current.version || 1) + 1,
    timeline: [...(current.timeline || []), timelineEvent],
  };

  if (newStatus === 'RESOLVED') {
    updates.resolvedAt = now;
    updates.resolvedBy = userName;
    if (note) updates.resolutionNote = note;
  }

  if (db) {
    try {
      const docRef = doc(db, EXCEPTIONS_COLLECTION, exceptionId);
      await updateDoc(docRef, updates);
    } catch (err) {
      console.error('[exceptionService] Firestore update error:', err);
    }
  }

  const updatedRecord = { ...current, ...updates };
  exceptionMemoryCache.set(exceptionId, updatedRecord);
  return updatedRecord;
}

/**
 * Assign exception to a specific user / operator PIC
 */
export async function assignException(
  exceptionId: string,
  assignedTo: string,
  assignedToName: string,
  user: { uid: string; displayName?: string; email?: string }
): Promise<ShipmentException> {
  const current = await getExceptionById(exceptionId);
  if (!current) throw new Error(`Exception ${exceptionId} not found.`);

  const now = new Date().toISOString();
  const userName = user.displayName || user.email || 'User';

  const timelineEvent: ExceptionTimelineEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    exceptionId,
    action: 'ASSIGNED',
    timestamp: now,
    performedBy: user.uid || 'unknown',
    performedByName: userName,
    previousValue: current.assignedToName || 'Unassigned',
    newValue: assignedToName,
    note: `Phân công xử lý cho ${assignedToName}`,
  };

  const updates: Partial<ShipmentException> = {
    assignedTo,
    assignedToName,
    updatedAt: now,
    updatedBy: userName,
    version: (current.version || 1) + 1,
    timeline: [...(current.timeline || []), timelineEvent],
  };

  if (current.status === 'OPEN') {
    updates.status = 'ACKNOWLEDGED';
  }

  if (db) {
    try {
      const docRef = doc(db, EXCEPTIONS_COLLECTION, exceptionId);
      await updateDoc(docRef, updates);
    } catch (err) {
      console.error('[exceptionService] Firestore assign error:', err);
    }
  }

  const updated = { ...current, ...updates };
  exceptionMemoryCache.set(exceptionId, updated);
  return updated;
}

/**
 * Update severity of an exception
 */
export async function updateExceptionSeverity(
  exceptionId: string,
  newSeverity: ExceptionSeverity,
  user: { uid: string; displayName?: string; email?: string },
  reason?: string
): Promise<ShipmentException> {
  const current = await getExceptionById(exceptionId);
  if (!current) throw new Error(`Exception ${exceptionId} not found.`);

  const now = new Date().toISOString();
  const userName = user.displayName || user.email || 'User';

  const timelineEvent: ExceptionTimelineEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    exceptionId,
    action: 'SEVERITY_CHANGED',
    timestamp: now,
    performedBy: user.uid || 'unknown',
    performedByName: userName,
    previousValue: current.severity,
    newValue: newSeverity,
    note: reason || `Điều chỉnh mức độ nghiêm trọng thành ${newSeverity}`,
  };

  const updates: Partial<ShipmentException> = {
    severity: newSeverity,
    updatedAt: now,
    updatedBy: userName,
    version: (current.version || 1) + 1,
    timeline: [...(current.timeline || []), timelineEvent],
  };

  if (db) {
    try {
      const docRef = doc(db, EXCEPTIONS_COLLECTION, exceptionId);
      await updateDoc(docRef, updates);
    } catch (err) {
      console.error('[exceptionService] Error updating severity:', err);
    }
  }

  const updated = { ...current, ...updates };
  exceptionMemoryCache.set(exceptionId, updated);
  return updated;
}

/**
 * Resolve an exception with mandatory resolution note
 */
export async function resolveException(
  exceptionId: string,
  resolutionNote: string,
  user: { uid: string; displayName?: string; email?: string }
): Promise<ShipmentException> {
  if (!resolutionNote || !resolutionNote.trim()) {
    throw new Error('Vui lòng nhập ghi chú biện pháp xử lý để đóng bất thường (Resolution note is required).');
  }

  return updateExceptionStatus(exceptionId, 'RESOLVED', user, resolutionNote.trim());
}

/**
 * Reopen an exception with mandatory reason
 */
export async function reopenException(
  exceptionId: string,
  reason: string,
  user: { uid: string; displayName?: string; email?: string }
): Promise<ShipmentException> {
  if (!reason || !reason.trim()) {
    throw new Error('Vui lòng nhập lý do mở lại bất thường (Reopen reason is required).');
  }

  const current = await getExceptionById(exceptionId);
  if (!current) throw new Error(`Exception ${exceptionId} not found.`);

  const now = new Date().toISOString();
  const userName = user.displayName || user.email || 'User';

  const timelineEvent: ExceptionTimelineEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    exceptionId,
    action: 'REOPENED',
    timestamp: now,
    performedBy: user.uid || 'unknown',
    performedByName: userName,
    previousValue: current.status,
    newValue: 'OPEN',
    note: `Mở lại bất thường: ${reason.trim()}`,
  };

  const updates: Partial<ShipmentException> = {
    status: 'OPEN',
    resolvedAt: undefined,
    resolvedBy: undefined,
    resolutionNote: undefined,
    updatedAt: now,
    updatedBy: userName,
    version: (current.version || 1) + 1,
    timeline: [...(current.timeline || []), timelineEvent],
  };

  if (db) {
    try {
      const docRef = doc(db, EXCEPTIONS_COLLECTION, exceptionId);
      await updateDoc(docRef, updates);
    } catch (err) {
      console.error('[exceptionService] Error reopening exception:', err);
    }
  }

  const updated = { ...current, ...updates };
  exceptionMemoryCache.set(exceptionId, updated);
  return updated;
}

/**
 * Dismiss an exception with mandatory reason
 */
export async function dismissException(
  exceptionId: string,
  reason: string,
  user: { uid: string; displayName?: string; email?: string }
): Promise<ShipmentException> {
  if (!reason || !reason.trim()) {
    throw new Error('Vui lòng nhập lý do hủy/bỏ qua bất thường (Dismiss reason is required).');
  }

  return updateExceptionStatus(exceptionId, 'DISMISSED', user, reason.trim());
}

/**
 * AUTOMATIC IDEMPOTENT EXCEPTION DETECTION (EVENT-DRIVEN & ON-DEMAND)
 * Analyzes a single real shipment against business rules and creates/updates exceptions idempotently:
 * 1. Overdue milestones (plannedDate < now && !actualDate && status !== 'COMPLETED')
 * 2. SI Cutoff passed without completed booking
 * 3. CY Cutoff passed without container gate-out
 * 4. Unassigned operator PIC
 */
export async function detectShipmentExceptions(
  shipment: ShipmentRecord,
  companyId: string,
  user: { uid: string; displayName?: string; email?: string }
): Promise<ShipmentException[]> {
  const detected: ShipmentException[] = [];
  const nowStr = new Date().toISOString();
  const todayYMD = nowStr.substring(0, 10);

  // Skip completed or cancelled shipments
  if (shipment.status === 'COMPLETED' || shipment.status === 'CANCELLED') {
    return [];
  }

  // 1. Check Milestones Overdue
  if (shipment.milestones && shipment.milestones.length > 0) {
    for (const m of shipment.milestones) {
      if (m.plannedDate && m.status !== 'COMPLETED' && m.status !== 'SKIPPED') {
        const plannedYMD = m.plannedDate.substring(0, 10);
        if (plannedYMD < todayYMD && !m.actualDate) {
          const idempotencyKey = `${shipment.id}_OVERDUE_MILESTONE_${m.id}`;
          
          const exc = await createException({
            companyId,
            shipmentId: shipment.id,
            shipmentNumber: shipment.shipmentNumber,
            quotationId: shipment.quotationId,
            quotationNumber: shipment.quotationNumber,
            customerId: shipment.customerId,
            customerName: shipment.customerName,
            sourceType: 'MILESTONE',
            sourceId: m.id,
            exceptionType: 'OVERDUE_MILESTONE',
            idempotencyKey,
            title: `Mốc vận hành quá hạn: ${m.titleVi || m.titleEn}`,
            description: `Mốc tiến độ "${m.titleVi || m.titleEn}" dự kiến hoàn tất ngày ${plannedYMD} nhưng chưa ghi nhận ngày thực tế.`,
            severity: 'HIGH',
            assignedTo: shipment.assignedTo,
            assignedToName: shipment.assignedToName,
            dueAt: m.plannedDate,
            relatedData: { milestoneCode: m.milestoneCode, sequence: m.sequence },
          }, user);

          detected.push(exc);
        }
      }
    }
  }

  // 2. Check SI Cutoff
  if (shipment.siCutoff) {
    const siYMD = shipment.siCutoff.substring(0, 10);
    if (siYMD < todayYMD && shipment.status === 'DRAFT') {
      const idempotencyKey = `${shipment.id}_SI_CUTOFF_APPROACHING_si`;
      const exc = await createException({
        companyId,
        shipmentId: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        quotationId: shipment.quotationId,
        quotationNumber: shipment.quotationNumber,
        customerId: shipment.customerId,
        customerName: shipment.customerName,
        sourceType: 'BOOKING',
        sourceId: 'si_cutoff',
        exceptionType: 'SI_CUTOFF_APPROACHING',
        idempotencyKey,
        title: `Hạn nộp Shipping Instruction (SI Cutoff) đã qua`,
        description: `SI Cutoff ngày ${siYMD} đã hết hạn trong khi lô hàng vẫn ở trạng thái Dự thảo/Chờ gửi SI.`,
        severity: 'CRITICAL',
        assignedTo: shipment.assignedTo,
        assignedToName: shipment.assignedToName,
        dueAt: shipment.siCutoff,
      }, user);
      detected.push(exc);
    }
  }

  // 3. Check CY Cutoff
  if (shipment.cyCutoff) {
    const cyYMD = shipment.cyCutoff.substring(0, 10);
    if (cyYMD < todayYMD && shipment.status !== 'IN_TRANSIT' && shipment.status !== 'ARRIVED') {
      const idempotencyKey = `${shipment.id}_CY_CUTOFF_MISSED_cy`;
      const exc = await createException({
        companyId,
        shipmentId: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        quotationId: shipment.quotationId,
        quotationNumber: shipment.quotationNumber,
        customerId: shipment.customerId,
        customerName: shipment.customerName,
        sourceType: 'CONTAINER',
        sourceId: 'cy_cutoff',
        exceptionType: 'CY_CUTOFF_MISSED',
        idempotencyKey,
        title: `Hạn đóng bãi hạ container (CY Cutoff) đã qua`,
        description: `Hạn bãi CY ngày ${cyYMD} đã trôi qua. Nguy cơ trễ chuyến tàu hoặc phát sinh phí lưu bãi.`,
        severity: 'CRITICAL',
        assignedTo: shipment.assignedTo,
        assignedToName: shipment.assignedToName,
        dueAt: shipment.cyCutoff,
      }, user);
      detected.push(exc);
    }
  }

  // 4. Check Unassigned Operator
  if (!shipment.assignedTo && shipment.status !== 'DRAFT') {
    const idempotencyKey = `${shipment.id}_UNASSIGNED_OPERATOR_pic`;
    const exc = await createException({
      companyId,
      shipmentId: shipment.id,
      shipmentNumber: shipment.shipmentNumber,
      quotationId: shipment.quotationId,
      quotationNumber: shipment.quotationNumber,
      customerId: shipment.customerId,
      customerName: shipment.customerName,
      sourceType: 'OPERATIONAL',
      sourceId: 'unassigned_pic',
      exceptionType: 'UNASSIGNED_OPERATOR',
      idempotencyKey,
      title: `Lô hàng chưa phân công Nhân viên Điều hành (PIC)`,
      description: `Lô hàng đã được tạo và kích hoạt vận hành nhưng chưa chỉ định Operator phụ trách chính.`,
      severity: 'MEDIUM',
      dueAt: shipment.createdAt,
    }, user);
    detected.push(exc);
  }

  return detected;
}
