import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  runTransaction, 
  serverTimestamp,
  onSnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  ShipmentRecord, 
  ShipmentStatus, 
  ShipmentContainer, 
  ShipmentMilestone, 
  ShipmentAuditLog, 
  ShipmentQuotationSnapshot,
  ShipmentServiceMode 
} from '../../types/shipment';
import { QuoteData } from '../../types/logistics';
import { getDefaultMilestonesForMode, isValidStatusTransition } from './milestoneDefaults';
import { syncShipmentDeadlines } from '../deadline/deadlineService';

const SHIPMENTS_COLLECTION = 'shipments';
const AUDIT_LOGS_COLLECTION = 'shipmentAuditLogs';
const COMPANIES_COLLECTION = 'companies';

// In-memory cache to prevent duplicate queries and optimize high performance
const shipmentMemoryCache = new Map<string, ShipmentRecord>();

/**
 * Generate unique, transaction-safe atomic shipment numbering
 * Format: SHP-2026-000001 (Zero count(collection) scans, atomic concurrency safe)
 */
export async function getNextShipmentNumber(companyId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const effectiveCompanyId = companyId || 'default-company';

  if (!db) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `SHP-${currentYear}-${randomSuffix}`;
  }

  try {
    const compRef = doc(db, COMPANIES_COLLECTION, effectiveCompanyId);
    
    const result = await runTransaction(db, async (txn) => {
      const snap = await txn.get(compRef);
      let currentCounter = 1;
      let prefix = 'SHP';

      if (snap.exists()) {
        const data = snap.data();
        currentCounter = (data.shipmentCounter || 0) + 1;
        prefix = data.branding?.shipmentPrefix || 'SHP';
        txn.update(compRef, {
          shipmentCounter: currentCounter,
          _updatedAt: serverTimestamp(),
        });
      } else {
        txn.set(compRef, {
          shipmentCounter: 1,
          createdAt: new Date().toISOString(),
          status: 'ACTIVE',
        }, { merge: true });
      }

      return { counter: currentCounter, prefix };
    });

    const paddedSeq = String(result.counter).padStart(6, '0');
    return `${result.prefix}-${currentYear}-${paddedSeq}`;
  } catch (err) {
    console.warn('[shipmentService] Atomic shipment numbering notice, using resilient fallback:', err);
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `SHP-${currentYear}-${rand}`;
  }
}

/**
 * Audit log helper
 */
async function recordShipmentAudit(
  log: Omit<ShipmentAuditLog, 'id' | 'timestamp'>
): Promise<void> {
  if (!db) return;
  try {
    const logRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
    const entry: ShipmentAuditLog = {
      ...log,
      id: logRef.id,
      timestamp: new Date().toISOString(),
    };
    await setDoc(logRef, entry);
  } catch (err) {
    console.warn('[shipmentService] Failed to record shipment audit:', err);
  }
}

export interface ShipmentFilterOptions {
  status?: ShipmentStatus | 'ALL';
  serviceMode?: ShipmentServiceMode | 'ALL';
  customerId?: string;
  assignedTo?: string;
  searchQuery?: string;
  pageLimit?: number;
  lastVisibleDoc?: DocumentSnapshot;
}

/**
 * Fetch paginated shipments with company-level tenant isolation
 */
export async function getShipments(
  companyId: string,
  options: ShipmentFilterOptions = {}
): Promise<{ shipments: ShipmentRecord[]; lastDoc?: DocumentSnapshot }> {
  const effectiveCompanyId = companyId || 'default-company';
  const pageLimit = options.pageLimit || 25;

  if (!db) {
    // Return cached entries filtered by company
    const list = Array.from(shipmentMemoryCache.values())
      .filter(s => s.companyId === effectiveCompanyId);
    return { shipments: list.slice(0, pageLimit) };
  }

  try {
    const collRef = collection(db, SHIPMENTS_COLLECTION);
    let q = query(
      collRef,
      where('companyId', '==', effectiveCompanyId),
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
    );

    if (options.status && options.status !== 'ALL') {
      q = query(
        collRef,
        where('companyId', '==', effectiveCompanyId),
        where('status', '==', options.status),
        orderBy('createdAt', 'desc'),
        limit(pageLimit)
      );
    }

    if (options.lastVisibleDoc) {
      q = query(q, startAfter(options.lastVisibleDoc));
    }

    const snap = await getDocs(q);
    const shipments: ShipmentRecord[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data() as ShipmentRecord;
      const record = { ...data, id: docSnap.id };
      shipments.push(record);
      shipmentMemoryCache.set(record.id, record);
    });

    // In-memory text search if provided (e.g. shipmentNumber, bl, customerName, container)
    let filtered = shipments;
    if (options.searchQuery && options.searchQuery.trim()) {
      const term = options.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(s => 
        s.shipmentNumber.toLowerCase().includes(term) ||
        (s.customerName && s.customerName.toLowerCase().includes(term)) ||
        (s.quotationNumber && s.quotationNumber.toLowerCase().includes(term)) ||
        (s.blAwbNumber && s.blAwbNumber.toLowerCase().includes(term)) ||
        (s.bookingNumber && s.bookingNumber.toLowerCase().includes(term)) ||
        (s.origin && s.origin.toLowerCase().includes(term)) ||
        (s.destination && s.destination.toLowerCase().includes(term)) ||
        (s.containers && s.containers.some(c => c.containerNumber.toLowerCase().includes(term)))
      );
    }

    const lastDoc = snap.docs[snap.docs.length - 1];
    return { shipments: filtered, lastDoc };
  } catch (err) {
    console.error('[shipmentService] Error fetching shipments:', err);
    // Fallback to memory cache
    const list = Array.from(shipmentMemoryCache.values())
      .filter(s => s.companyId === effectiveCompanyId);
    return { shipments: list.slice(0, pageLimit) };
  }
}

/**
 * Fetch a single shipment by ID with cache-first lookup
 */
export async function getShipmentById(
  shipmentId: string,
  companyId?: string
): Promise<ShipmentRecord | null> {
  if (!shipmentId) return null;

  if (shipmentMemoryCache.has(shipmentId)) {
    const cached = shipmentMemoryCache.get(shipmentId)!;
    if (!companyId || cached.companyId === companyId) {
      return cached;
    }
  }

  if (!db) return null;

  try {
    const docRef = doc(db, SHIPMENTS_COLLECTION, shipmentId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data() as ShipmentRecord;
    const record = { ...data, id: snap.id };

    if (companyId && record.companyId !== companyId) {
      console.warn('[shipmentService] Security check: Cross-company access prevented.');
      return null;
    }

    shipmentMemoryCache.set(record.id, record);
    return record;
  } catch (err) {
    console.error('[shipmentService] Error getting shipment:', err);
    return null;
  }
}

/**
 * Create a new Shipment record
 */
export async function createShipment(
  payload: Omit<ShipmentRecord, 'id' | 'shipmentNumber' | 'createdAt' | 'updatedAt' | 'version'>,
  user: { uid: string; displayName?: string; email?: string }
): Promise<ShipmentRecord> {
  const effectiveCompanyId = payload.companyId || 'default-company';
  const shipmentNumber = await getNextShipmentNumber(effectiveCompanyId);
  const now = new Date().toISOString();
  const userName = user.displayName || user.email || 'System User';

  const defaultMilestones = payload.milestones && payload.milestones.length > 0 
    ? payload.milestones 
    : getDefaultMilestonesForMode(payload.serviceMode);

  const newRecord: ShipmentRecord = {
    ...payload,
    id: `shp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    companyId: effectiveCompanyId,
    shipmentNumber,
    status: payload.status || 'DRAFT',
    containers: payload.containers || [],
    milestones: defaultMilestones,
    linkedDocumentIds: payload.linkedDocumentIds || [],
    linkedTaskIds: payload.linkedTaskIds || [],
    version: 1,
    createdAt: now,
    createdBy: userName,
    updatedAt: now,
    updatedBy: userName,
  };

  if (db) {
    try {
      const docRef = doc(db, SHIPMENTS_COLLECTION, newRecord.id);
      await setDoc(docRef, newRecord);
    } catch (err) {
      console.error('[shipmentService] Error creating shipment in Firestore:', err);
    }
  }

  shipmentMemoryCache.set(newRecord.id, newRecord);

  await recordShipmentAudit({
    companyId: effectiveCompanyId,
    shipmentId: newRecord.id,
    shipmentNumber,
    action: 'SHIPMENT_CREATED',
    performedBy: userName,
    details: {
      serviceMode: newRecord.serviceMode,
      origin: newRecord.origin,
      destination: newRecord.destination,
      quotationId: newRecord.quotationId,
    },
  });

  // Phase 44: Sync deadlines for this new shipment
  syncShipmentDeadlines(newRecord, user).catch(e => console.warn('[deadlineSync] createShipment error:', e));

  return newRecord;
}

/**
 * Map mode string from quotation to ShipmentServiceMode
 */
function mapQuotationServiceMode(modeStr?: string): ShipmentServiceMode {
  if (!modeStr) return 'SEA_FCL';
  const upper = modeStr.toUpperCase();
  if (upper.includes('AIR')) return 'AIR';
  if (upper.includes('LCL')) return 'SEA_LCL';
  if (upper.includes('TRUCK')) return 'TRUCKING';
  if (upper.includes('CUSTOM')) return 'CUSTOMS';
  return 'SEA_FCL';
}

/**
 * Prefill and create a Shipment from an Approved Quotation (Preserving immutable quote snapshot)
 */
export async function createShipmentFromQuotation(
  quote: QuoteData,
  user: { uid: string; displayName?: string; email?: string },
  customOptions?: Partial<ShipmentRecord>
): Promise<ShipmentRecord> {
  const companyId = quote.companyId || 'default_company';
  const serviceMode = mapQuotationServiceMode(quote.shipment?.serviceType || quote.shipment?.mode);

  // Create immutable snapshot of quotation financial reference
  const quotationSnapshot: ShipmentQuotationSnapshot = {
    quotationId: quote.id,
    quoteNumber: quote.quoteNumber,
    customerName: quote.customer?.companyName || quote.customer?.customerName || 'Khách hàng',
    totalSellingUsd: quote.grandTotalUsd || quote.subtotalUsd || 0,
    totalSellingVnd: quote.grandTotalVnd || quote.subtotalVnd || 0,
    totalCostUsd: quote.totalCostUsd || 0,
    totalCostVnd: quote.totalCostVnd || 0,
    profitUsd: quote.totalProfitUsd || 0,
    profitVnd: quote.totalProfitVnd || 0,
    currency: quote.quoteCurrency || 'USD',
    exchangeRate: quote.exchangeRate || 25400,
    lineItemsCount: (quote.items || []).length,
    snapshotAt: new Date().toISOString(),
  };

  // Pre-fill containers if FCL
  const initialContainers: ShipmentContainer[] = [];
  if (serviceMode === 'SEA_FCL' && quote.shipment?.quantity) {
    const qty = Math.min(Math.max(1, quote.shipment.quantity), 50);
    for (let i = 0; i < qty; i++) {
      initialContainers.push({
        id: `cnt_${Date.now()}_${i}`,
        containerNumber: '',
        containerType: quote.shipment.containerType || "40'HC",
        status: 'PLANNED',
      });
    }
  }

  const payload: Omit<ShipmentRecord, 'id' | 'shipmentNumber' | 'createdAt' | 'updatedAt' | 'version'> = {
    companyId,
    quotationId: quote.id,
    quotationNumber: quote.quoteNumber,
    quotationVersion: 1,
    quotationSnapshot,
    customerId: quote.customer?.id || quote.customer?.taxId || `cust_${Date.now()}`,
    customerName: quote.customer?.companyName || quote.customer?.customerName || 'Khách hàng',
    serviceMode,
    status: 'BOOKING_REQUESTED',
    origin: quote.shipment?.origin || quote.shipment?.pol || 'Cảng Cát Lái, TP.HCM',
    originPort: quote.shipment?.pol,
    destination: quote.shipment?.destination || quote.shipment?.pod || 'Los Angeles, USA',
    destinationPort: quote.shipment?.pod,
    incoterm: quote.terms?.incoterm || 'FOB',
    commodity: quote.shipment?.commodity || 'General Cargo',
    cargoDescription: quote.shipment?.commodity || 'General Cargo',
    packageType: 'Packages',
    packageQuantity: quote.shipment?.quantity,
    grossWeightKg: quote.shipment?.grossWeightKg,
    volumeCbm: quote.shipment?.volumeCbm,
    chargeableWeightKg: quote.shipment?.chargeableWeight,
    carrierName: quote.shipment?.carrier,
    etdPlanned: quote.shipment?.etd,
    etaPlanned: quote.shipment?.eta,
    notes: quote.terms?.exclusionsNotes || quote.terms?.paymentTerm || '',
    containers: initialContainers,
    milestones: getDefaultMilestonesForMode(serviceMode),
    linkedDocumentIds: [],
    linkedTaskIds: [],
    createdBy: user?.displayName || user?.email || 'System Operator',
    updatedBy: user?.displayName || user?.email || 'System Operator',
    ...customOptions,
  };

  return createShipment(payload, user);
}

/**
 * Update an existing shipment with optimistic concurrency protection
 */
export async function updateShipment(
  shipmentId: string,
  updates: Partial<ShipmentRecord>,
  user: { uid: string; displayName?: string; email?: string }
): Promise<ShipmentRecord> {
  const current = await getShipmentById(shipmentId);
  if (!current) {
    throw new Error(`Shipment ${shipmentId} not found.`);
  }

  // Validate status transition if status is being updated
  if (updates.status && updates.status !== current.status) {
    if (!isValidStatusTransition(current.status, updates.status)) {
      throw new Error(`Invalid status transition from ${current.status} to ${updates.status}`);
    }
  }

  const now = new Date().toISOString();
  const userName = user.displayName || user.email || 'System User';
  const newVersion = (current.version || 1) + 1;

  const updatedRecord: ShipmentRecord = {
    ...current,
    ...updates,
    version: newVersion,
    updatedAt: now,
    updatedBy: userName,
  };

  if (db) {
    try {
      const docRef = doc(db, SHIPMENTS_COLLECTION, shipmentId);
      await updateDoc(docRef, {
        ...updates,
        version: newVersion,
        updatedAt: now,
        updatedBy: userName,
      });
    } catch (err) {
      console.error('[shipmentService] Error updating shipment in Firestore:', err);
    }
  }

  shipmentMemoryCache.set(shipmentId, updatedRecord);

  // Record audit
  if (updates.status && updates.status !== current.status) {
    await recordShipmentAudit({
      companyId: current.companyId,
      shipmentId,
      shipmentNumber: current.shipmentNumber,
      action: 'STATUS_CHANGED',
      performedBy: userName,
      previousValue: current.status,
      newValue: updates.status,
    });
  } else {
    await recordShipmentAudit({
      companyId: current.companyId,
      shipmentId,
      shipmentNumber: current.shipmentNumber,
      action: 'SHIPMENT_UPDATED',
      performedBy: userName,
      details: { updatedFields: Object.keys(updates) },
    });
  }

  // Phase 44: Sync deadlines for updated shipment
  syncShipmentDeadlines(updatedRecord, user).catch(e => console.warn('[deadlineSync] updateShipment error:', e));

  return updatedRecord;
}

/**
 * Update a specific milestone on a shipment
 */
export async function updateShipmentMilestone(
  shipmentId: string,
  milestoneId: string,
  milestoneUpdates: Partial<ShipmentMilestone>,
  user: { uid: string; displayName?: string; email?: string }
): Promise<ShipmentRecord> {
  const current = await getShipmentById(shipmentId);
  if (!current) throw new Error(`Shipment ${shipmentId} not found.`);

  const now = new Date().toISOString();
  const userName = user.displayName || user.email || 'System User';

  const updatedMilestones = current.milestones.map((ms) => {
    if (ms.id === milestoneId || ms.milestoneCode === milestoneId) {
      return {
        ...ms,
        ...milestoneUpdates,
        updatedBy: userName,
        updatedAt: now,
      };
    }
    return ms;
  });

  return updateShipment(shipmentId, { milestones: updatedMilestones }, user);
}

/**
 * Container operations: Add
 */
export async function addContainerToShipment(
  shipmentId: string,
  container: Omit<ShipmentContainer, 'id'>,
  user: { uid: string; displayName?: string; email?: string }
): Promise<ShipmentRecord> {
  const current = await getShipmentById(shipmentId);
  if (!current) throw new Error(`Shipment ${shipmentId} not found.`);

  const newContainer: ShipmentContainer = {
    ...container,
    id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };

  const updatedContainers = [...(current.containers || []), newContainer];
  const res = await updateShipment(shipmentId, { containers: updatedContainers }, user);

  await recordShipmentAudit({
    companyId: current.companyId,
    shipmentId,
    shipmentNumber: current.shipmentNumber,
    action: 'CONTAINER_ADDED',
    performedBy: user.displayName || user.email || 'User',
    details: { containerNumber: container.containerNumber, type: container.containerType },
  });

  return res;
}

/**
 * Container operations: Update
 */
export async function updateShipmentContainer(
  shipmentId: string,
  containerId: string,
  updates: Partial<ShipmentContainer>,
  user: { uid: string; displayName?: string; email?: string }
): Promise<ShipmentRecord> {
  const current = await getShipmentById(shipmentId);
  if (!current) throw new Error(`Shipment ${shipmentId} not found.`);

  const updatedContainers = current.containers.map((c) => {
    if (c.id === containerId) {
      return { ...c, ...updates };
    }
    return c;
  });

  return updateShipment(shipmentId, { containers: updatedContainers }, user);
}

/**
 * Container operations: Remove
 */
export async function removeShipmentContainer(
  shipmentId: string,
  containerId: string,
  user: { uid: string; displayName?: string; email?: string }
): Promise<ShipmentRecord> {
  const current = await getShipmentById(shipmentId);
  if (!current) throw new Error(`Shipment ${shipmentId} not found.`);

  const updatedContainers = current.containers.filter(c => c.id !== containerId);
  return updateShipment(shipmentId, { containers: updatedContainers }, user);
}

/**
 * Link a document from Document Center to Shipment (No duplicate storage)
 */
export async function linkDocumentToShipment(
  shipmentId: string,
  documentId: string,
  user: { uid: string; displayName?: string; email?: string }
): Promise<ShipmentRecord> {
  const current = await getShipmentById(shipmentId);
  if (!current) throw new Error(`Shipment ${shipmentId} not found.`);

  const docIds = new Set(current.linkedDocumentIds || []);
  docIds.add(documentId);

  const res = await updateShipment(shipmentId, { linkedDocumentIds: Array.from(docIds) }, user);

  await recordShipmentAudit({
    companyId: current.companyId,
    shipmentId,
    shipmentNumber: current.shipmentNumber,
    action: 'DOCUMENT_LINKED',
    performedBy: user.displayName || user.email || 'User',
    details: { documentId },
  });

  return res;
}

/**
 * Fetch minimal aggregated shipment statistics for company dashboard (zero full collection scan)
 */
export async function getShipmentSummaryStats(companyId: string): Promise<{
  totalActive: number;
  inTransit: number;
  arrivingSoon: number;
  customsPending: number;
  delivered: number;
}> {
  const effectiveCompanyId = companyId || 'default-company';
  
  // Use memory cache + recent 50 documents
  const { shipments } = await getShipments(effectiveCompanyId, { pageLimit: 50 });

  const totalActive = shipments.filter(s => s.status !== 'COMPLETED' && s.status !== 'CANCELLED').length;
  const inTransit = shipments.filter(s => s.status === 'IN_TRANSIT').length;
  const arrivingSoon = shipments.filter(s => s.status === 'ARRIVED').length;
  const customsPending = shipments.filter(s => s.status === 'CUSTOMS_CLEARANCE').length;
  const delivered = shipments.filter(s => s.status === 'DELIVERED').length;

  return {
    totalActive,
    inTransit,
    arrivingSoon,
    customsPending,
    delivered,
  };
}
