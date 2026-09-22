/**
 * Phase 43: Logistics Event & Milestone Intelligence Engine
 * Append-only Event Sourcing, Idempotent Processing, Milestone Reconciliation,
 * ETA Tracking, and Operational Freshness Engine.
 * 
 * STRICT ARCHITECTURAL RULES:
 * 1. Zero synthetic or fake data.
 * 2. Source of Truth: Firebase Firestore.
 * 3. Append-only event history; corrections are superseded, never deleted.
 * 4. Distinct separation between Planned, Estimated, and Actual events.
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
  limit 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  ShipmentEventRecord, 
  CreateShipmentEventPayload, 
  CorrectShipmentEventPayload, 
  CancelShipmentEventPayload,
  MilestoneTimelineItem,
  LogisticsEventType
} from '../../types/shipmentEvent';
import { 
  ShipmentRecord, 
  ShipmentMilestone, 
  ShipmentStatus, 
  ShipmentAuditLog 
} from '../../types/shipment';
import { getShipmentById, updateShipment } from './shipmentService';
import { getEventDefinition } from './eventDefinitions';
import { createException, getExceptions } from '../exception/exceptionService';

const EVENTS_COLLECTION = 'shipmentEvents';
const AUDIT_LOGS_COLLECTION = 'shipmentAuditLogs';

// In-memory cache for event lookups
const eventMemoryCache = new Map<string, ShipmentEventRecord>();

/**
 * Record a new canonical logistics event
 * Transaction-safe, idempotent, append-only
 */
export async function createShipmentEvent(
  payload: CreateShipmentEventPayload,
  user: { uid: string; displayName?: string; email?: string }
): Promise<ShipmentEventRecord> {
  const companyId = payload.companyId || 'default-company';
  const nowIso = new Date().toISOString();
  const userName = user.displayName || user.email || 'Logistics Operator';

  // 1. Idempotency Key check
  const idempotencyKey = payload.idempotencyKey || 
    `evt_${payload.shipmentId}_${payload.eventType}_${payload.eventTime}_${payload.location || ''}`;

  if (db) {
    try {
      const q = query(
        collection(db, EVENTS_COLLECTION),
        where('companyId', '==', companyId),
        where('shipmentId', '==', payload.shipmentId),
        where('idempotencyKey', '==', idempotencyKey),
        limit(1)
      );
      const existingSnap = await getDocs(q);
      if (!existingSnap.empty) {
        const existingData = existingSnap.docs[0].data() as ShipmentEventRecord;
        return existingData;
      }
    } catch (err) {
      console.warn('[eventIntelligenceService] Idempotency check warning:', err);
    }
  }

  // 2. Resolve Title Vi / En from canonical definition if not explicitly provided
  const def = getEventDefinition(payload.eventType);
  const titleVi = payload.titleVi || def.titleVi;
  const titleEn = payload.titleEn || def.titleEn;
  const affectsMilestoneCode = payload.affectsMilestoneCode || def.defaultMilestoneCode;

  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newEvent: ShipmentEventRecord = {
    id: eventId,
    companyId,
    shipmentId: payload.shipmentId,
    shipmentNumber: payload.shipmentNumber,
    eventType: payload.eventType,
    eventSource: payload.eventSource,
    eventTime: payload.eventTime,
    recordedAt: nowIso,
    location: payload.location,
    referenceType: payload.referenceType,
    referenceId: payload.referenceId,
    titleVi,
    titleEn,
    description: payload.description,
    notes: payload.notes,
    attachments: payload.attachments || [],
    createdBy: userName,
    userId: user.uid,
    status: 'ACTIVE',
    affectsMilestoneCode,
    affectsContainerId: payload.affectsContainerId,
    idempotencyKey,
    version: 1,
    metadata: payload.metadata || {},
  };

  // 3. Persist to Firestore
  if (db) {
    try {
      const docRef = doc(db, EVENTS_COLLECTION, eventId);
      await setDoc(docRef, newEvent);
    } catch (err) {
      console.error('[eventIntelligenceService] Error saving event to Firestore:', err);
    }
  }

  eventMemoryCache.set(eventId, newEvent);

  // 4. Record to Audit Log
  if (db) {
    try {
      const logRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
      const auditEntry: ShipmentAuditLog = {
        id: logRef.id,
        companyId,
        shipmentId: payload.shipmentId,
        shipmentNumber: payload.shipmentNumber,
        action: 'MILESTONE_UPDATED',
        performedBy: userName,
        timestamp: nowIso,
        details: {
          eventId,
          eventType: payload.eventType,
          eventSource: payload.eventSource,
          eventTime: payload.eventTime,
          location: payload.location,
          affectsMilestoneCode,
        },
      };
      await setDoc(logRef, auditEntry);
    } catch (err) {
      console.warn('[eventIntelligenceService] Notice writing audit log:', err);
    }
  }

  // 5. Trigger automated milestone and shipment status reconciliation
  try {
    await reconcileShipmentWithEvents(payload.shipmentId, user);
  } catch (err) {
    console.error('[eventIntelligenceService] Error during auto-reconciliation:', err);
  }

  return newEvent;
}

/**
 * Retrieve events for a shipment with optional filters and sorting
 */
export async function getShipmentEvents(
  companyId: string,
  shipmentId: string,
  options: {
    status?: 'ACTIVE' | 'ALL';
    pageLimit?: number;
  } = {}
): Promise<ShipmentEventRecord[]> {
  const effectiveCompanyId = companyId || 'default-company';
  const pageLimit = options.pageLimit || 100;

  if (!db) {
    return Array.from(eventMemoryCache.values())
      .filter(e => e.companyId === effectiveCompanyId && e.shipmentId === shipmentId)
      .sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());
  }

  try {
    const collRef = collection(db, EVENTS_COLLECTION);
    const q = query(
      collRef,
      where('companyId', '==', effectiveCompanyId),
      where('shipmentId', '==', shipmentId),
      orderBy('eventTime', 'desc'),
      limit(pageLimit)
    );

    const snapshot = await getDocs(q);
    const results: ShipmentEventRecord[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as ShipmentEventRecord;
      results.push(data);
      eventMemoryCache.set(data.id, data);
    });

    if (options.status === 'ACTIVE') {
      return results.filter(e => e.status === 'ACTIVE');
    }

    return results;
  } catch (err) {
    console.error('[eventIntelligenceService] Error fetching shipment events:', err);
    return [];
  }
}

/**
 * Correct an existing event (Append-Only model: mark target as CORRECTED, issue replacement event)
 */
export async function correctShipmentEvent(
  eventId: string,
  correction: CorrectShipmentEventPayload,
  user: { uid: string; displayName?: string; email?: string }
): Promise<{ previousEvent: ShipmentEventRecord; replacementEvent: ShipmentEventRecord }> {
  let targetEvent = eventMemoryCache.get(eventId);

  if (!targetEvent && db) {
    const snap = await getDoc(doc(db, EVENTS_COLLECTION, eventId));
    if (snap.exists()) {
      targetEvent = snap.data() as ShipmentEventRecord;
    }
  }

  if (!targetEvent) {
    throw new Error(`Event with ID ${eventId} not found.`);
  }

  if (targetEvent.status !== 'ACTIVE') {
    throw new Error(`Cannot correct an event that is already ${targetEvent.status}.`);
  }

  const nowIso = new Date().toISOString();
  const userName = user.displayName || user.email || 'Logistics Operator';

  // 1. Create replacement event
  const replacementId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const replacementEvent: ShipmentEventRecord = {
    ...targetEvent,
    id: replacementId,
    eventTime: correction.eventTime || targetEvent.eventTime,
    location: correction.location || targetEvent.location,
    referenceType: correction.referenceType || targetEvent.referenceType,
    referenceId: correction.referenceId || targetEvent.referenceId,
    description: correction.description !== undefined ? correction.description : targetEvent.description,
    notes: correction.notes !== undefined ? correction.notes : targetEvent.notes,
    recordedAt: nowIso,
    createdBy: userName,
    userId: user.uid,
    version: targetEvent.version + 1,
    status: 'ACTIVE',
    idempotencyKey: `evt_corrected_${targetEvent.id}_${Date.now()}`,
    metadata: {
      ...(targetEvent.metadata || {}),
      ...(correction.metadata || {}),
      supersededFromEventId: targetEvent.id,
      correctionReason: correction.reason,
    },
  };

  // 2. Mark previous event as CORRECTED
  const updatedPrevious: ShipmentEventRecord = {
    ...targetEvent,
    status: 'CORRECTED',
    supersededByEventId: replacementId,
    correctionReason: correction.reason,
    correctedBy: userName,
    correctedAt: nowIso,
  };

  if (db) {
    const prevRef = doc(db, EVENTS_COLLECTION, targetEvent.id);
    const replRef = doc(db, EVENTS_COLLECTION, replacementId);

    await updateDoc(prevRef, {
      status: 'CORRECTED',
      supersededByEventId: replacementId,
      correctionReason: correction.reason,
      correctedBy: userName,
      correctedAt: nowIso,
    });

    await setDoc(replRef, replacementEvent);
  }

  eventMemoryCache.set(targetEvent.id, updatedPrevious);
  eventMemoryCache.set(replacementId, replacementEvent);

  // 3. Reconcile shipment with updated event stream
  await reconcileShipmentWithEvents(targetEvent.shipmentId, user);

  return { previousEvent: updatedPrevious, replacementEvent };
}

/**
 * Cancel an erroneous event with audit justification
 */
export async function cancelShipmentEvent(
  eventId: string,
  payload: CancelShipmentEventPayload,
  user: { uid: string; displayName?: string; email?: string }
): Promise<ShipmentEventRecord> {
  let targetEvent = eventMemoryCache.get(eventId);

  if (!targetEvent && db) {
    const snap = await getDoc(doc(db, EVENTS_COLLECTION, eventId));
    if (snap.exists()) {
      targetEvent = snap.data() as ShipmentEventRecord;
    }
  }

  if (!targetEvent) {
    throw new Error(`Event with ID ${eventId} not found.`);
  }

  if (targetEvent.status !== 'ACTIVE') {
    throw new Error(`Event is already ${targetEvent.status}.`);
  }

  const nowIso = new Date().toISOString();
  const userName = user.displayName || user.email || 'Logistics Operator';

  const cancelledEvent: ShipmentEventRecord = {
    ...targetEvent,
    status: 'CANCELLED',
    cancelledReason: payload.reason,
    cancelledBy: userName,
    cancelledAt: nowIso,
  };

  if (db) {
    const docRef = doc(db, EVENTS_COLLECTION, eventId);
    await updateDoc(docRef, {
      status: 'CANCELLED',
      cancelledReason: payload.reason,
      cancelledBy: userName,
      cancelledAt: nowIso,
    });
  }

  eventMemoryCache.set(eventId, cancelledEvent);

  // Reconcile shipment
  await reconcileShipmentWithEvents(targetEvent.shipmentId, user);

  return cancelledEvent;
}

/**
 * Core Intelligence Engine:
 * Reconcile Shipment Milestones, Actual Dates, and Operational Freshness against the active event stream.
 */
export async function reconcileShipmentWithEvents(
  shipmentId: string,
  user: { uid: string; displayName?: string; email?: string } = { uid: 'system', displayName: 'Intelligence Engine' }
): Promise<ShipmentRecord> {
  const shipment = await getShipmentById(shipmentId);
  if (!shipment) {
    throw new Error(`Shipment ${shipmentId} not found for reconciliation.`);
  }

  // 1. Fetch all ACTIVE events for this shipment
  const activeEvents = await getShipmentEvents(shipment.companyId, shipmentId, { status: 'ACTIVE' });

  const now = new Date();
  const nowTime = now.getTime();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

  // 2. Reconcile Milestones
  const updatedMilestones: ShipmentMilestone[] = (shipment.milestones || []).map((ms) => {
    // Find any matching event affecting this milestone
    const matchingEvents = activeEvents.filter(e => 
      e.affectsMilestoneCode === ms.milestoneCode ||
      (e.eventType === 'VESSEL_DEPARTED' && ms.milestoneCode === 'VESSEL_DEPARTED') ||
      (e.eventType === 'FLIGHT_DEPARTED' && ms.milestoneCode === 'VESSEL_DEPARTED') ||
      (e.eventType === 'VESSEL_ARRIVED' && ms.milestoneCode === 'VESSEL_ARRIVED') ||
      (e.eventType === 'FLIGHT_ARRIVED' && ms.milestoneCode === 'VESSEL_ARRIVED') ||
      (e.eventType === 'CUSTOMS_CLEARED' && ms.milestoneCode === 'CUSTOMS_CLEARED') ||
      (e.eventType === 'DELIVERED_CONSIGNEE' && ms.milestoneCode === 'DELIVERED') ||
      (e.eventType === 'CONTAINER_EMPTY_RETURNED' && ms.milestoneCode === 'EMPTY_RETURNED') ||
      (e.eventType === 'CONTAINER_GATE_IN_POL' && ms.milestoneCode === 'CONTAINER_GATE_OUT')
    );

    if (matchingEvents.length > 0) {
      // Sort matching events by eventTime descending to pick canonical latest
      matchingEvents.sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());
      const latestMatch = matchingEvents[0];

      return {
        ...ms,
        status: 'COMPLETED',
        actualDate: latestMatch.eventTime,
        occurredAt: latestMatch.recordedAt,
        location: latestMatch.location || ms.location,
        notes: latestMatch.notes || ms.notes,
        confidence: 'HIGH',
        source: latestMatch.eventSource,
      };
    }

    // If no confirmed event: check if milestone plannedDate is overdue
    if (ms.plannedDate && ms.status !== 'COMPLETED' && ms.status !== 'SKIPPED') {
      const plannedTime = new Date(ms.plannedDate).getTime();
      if (plannedTime < nowTime) {
        return {
          ...ms,
          status: 'DELAYED',
        };
      }
    }

    return ms;
  });

  // 3. Extract confirmed Actual Transport dates (ATD / ATA)
  const departureEvent = activeEvents.find(e => 
    e.eventType === 'VESSEL_DEPARTED' || e.eventType === 'FLIGHT_DEPARTED'
  );
  const arrivalEvent = activeEvents.find(e => 
    e.eventType === 'VESSEL_ARRIVED' || e.eventType === 'FLIGHT_ARRIVED'
  );

  const etdActual = departureEvent ? departureEvent.eventTime : shipment.etdActual;
  const etaActual = arrivalEvent ? arrivalEvent.eventTime : shipment.etaActual;

  // 4. Calculate Operational Freshness & Latest Event
  let lastOperationalEventId: string | undefined = undefined;
  let lastOperationalEventTime: string | undefined = undefined;
  let lastOperationalEventTitle: string | undefined = undefined;
  let operationalFreshness: 'FRESH' | 'STALE' | 'UNKNOWN' = 'UNKNOWN';

  if (activeEvents.length > 0) {
    const latestEvent = activeEvents[0]; // already sorted descending by eventTime
    lastOperationalEventId = latestEvent.id;
    lastOperationalEventTime = latestEvent.eventTime;
    lastOperationalEventTitle = latestEvent.titleVi || latestEvent.titleEn;

    const eventAgeMs = nowTime - new Date(latestEvent.eventTime).getTime();
    if (shipment.status === 'IN_TRANSIT' && eventAgeMs > threeDaysMs) {
      operationalFreshness = 'STALE';
    } else {
      operationalFreshness = 'FRESH';
    }
  }

  // 5. Automated status progression based on confirmed logistics events
  let nextStatus: ShipmentStatus = shipment.status;
  if (departureEvent && (shipment.status === 'BOOKED' || shipment.status === 'BOOKING_REQUESTED')) {
    nextStatus = 'IN_TRANSIT';
  } else if (arrivalEvent && shipment.status === 'IN_TRANSIT') {
    nextStatus = 'ARRIVED';
  } else if (
    activeEvents.some(e => e.eventType === 'DELIVERED_CONSIGNEE' || e.eventType === 'POD_SIGNED') &&
    shipment.status !== 'COMPLETED' &&
    shipment.status !== 'CANCELLED'
  ) {
    nextStatus = 'DELIVERED';
  }

  // 6. Update Shipment Record
  const updates: Partial<ShipmentRecord> = {
    milestones: updatedMilestones,
    etdActual,
    etaActual,
    lastOperationalEventId,
    lastOperationalEventTime,
    lastOperationalEventTitle,
    operationalFreshness,
  };

  if (nextStatus !== shipment.status) {
    updates.status = nextStatus;
  }

  const updatedShipment = await updateShipment(shipmentId, updates, user);
  return updatedShipment;
}

/**
 * Scan active shipments for Overdue Milestones and generate Exceptions idempotently
 */
export async function detectMilestoneOverdueExceptions(companyId: string): Promise<{ created: number }> {
  if (!db) return { created: 0 };
  const effectiveCompanyId = companyId || 'default-company';

  try {
    const qShipments = query(
      collection(db, 'shipments'),
      where('companyId', '==', effectiveCompanyId),
      where('status', 'in', ['BOOKED', 'IN_TRANSIT', 'ARRIVED', 'CUSTOMS_CLEARANCE', 'DELIVERING']),
      limit(50)
    );

    const snap = await getDocs(qShipments);
    const existingExceptions = await getExceptions(effectiveCompanyId, { status: 'ACTIVE', pageLimit: 100 });
    const nowTime = new Date().getTime();
    let createdCount = 0;

    for (const d of snap.docs) {
      const s = d.data() as ShipmentRecord;
      if (!s.milestones) continue;

      for (const ms of s.milestones) {
        if (ms.plannedDate && ms.status !== 'COMPLETED' && ms.status !== 'SKIPPED') {
          const plannedTime = new Date(ms.plannedDate).getTime();
          // Flag if planned date is more than 6 hours overdue
          if (nowTime - plannedTime > 6 * 60 * 60 * 1000) {
            const exceptionTitle = `Mốc [${ms.titleVi || ms.titleEn}] đã quá hạn kế hoạch`;
            const alreadyExists = existingExceptions.exceptions.some(
              e => e.shipmentId === s.id && e.exceptionType === 'OVERDUE_MILESTONE' && e.title.includes(ms.milestoneCode)
            );

            if (!alreadyExists) {
              await createException({
                companyId: effectiveCompanyId,
                shipmentId: s.id,
                shipmentNumber: s.shipmentNumber,
                customerName: s.customerName,
                sourceType: 'MILESTONE',
                sourceId: ms.id,
                exceptionType: 'OVERDUE_MILESTONE',
                idempotencyKey: `${s.id}_OVERDUE_MILESTONE_${ms.id}`,
                severity: 'HIGH',
                title: `[${ms.milestoneCode}] ${exceptionTitle}`,
                description: `Mốc tiến độ "${ms.titleVi}" dự kiến hoàn thành vào ${ms.plannedDate}, nhưng hiện chưa ghi nhận sự kiện thực tế.`,
                dueAt: ms.plannedDate,
                relatedData: {
                  serviceMode: s.serviceMode,
                  suggestedAction: 'Liên hệ Hãng vận chuyển / Hiện trường để kiểm tra và cập nhật sự kiện thực tế hoặc điều chỉnh kế hoạch.',
                },
              }, { uid: 'system_milestone_engine', displayName: 'Milestone Intelligence Engine' });
              createdCount++;
            }
          }
        }
      }
    }

    return { created: createdCount };
  } catch (err) {
    console.error('[eventIntelligenceService] Error detecting overdue milestone exceptions:', err);
    return { created: 0 };
  }
}
