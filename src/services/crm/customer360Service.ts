import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  limit, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { CustomerRecord, QuoteData } from '../../types/logistics';
import { ShipmentRecord } from '../../types/shipment';
import { ContractRecord } from '../../types/contract';
import { 
  CustomerHealthScore, 
  CustomerHealthStatus, 
  HealthScoreIndicator, 
  CustomerContact,
  CustomerServiceInterest,
  CustomerLaneInterest,
  CustomerFollowUp,
  CustomerActivity,
  RateReviewSchedule,
  RateReviewTask,
  CustomerOpportunity
} from '../../types/crm';
import { logCRMAudit } from './crmAuditService';
import { getCustomerActivities } from './customerActivityService';
import { getCustomerFollowUps } from './customerFollowUpService';
import { getRateReviewSchedules, getRateReviewTasks } from './rateReviewService';
import { getCustomerOpportunities } from './customerOpportunityService';

const CONTACTS_COLLECTION = 'customerContacts';

/**
 * Calculates deterministic, explainable Customer Relationship Health based strictly on real operational data.
 * Zero guessing, no fake predictions.
 */
export function calculateCustomerHealth(
  customer: CustomerRecord,
  quotes: QuoteData[],
  shipments: ShipmentRecord[],
  contracts: ContractRecord[],
  followUps: CustomerFollowUp[]
): CustomerHealthScore {
  let score = 70; // Baseline score
  const indicators: HealthScoreIndicator[] = [];

  const now = new Date();
  const nowMs = now.getTime();

  // 1. Follow-up status check
  const overdueFollowUps = followUps.filter(f => f.status === 'OVERDUE');
  const openFollowUps = followUps.filter(f => f.status === 'OPEN' || f.status === 'IN_PROGRESS');

  if (overdueFollowUps.length > 0) {
    score -= 25;
    indicators.push({
      code: 'OVERDUE_FOLLOWUP',
      label: 'Chăm sóc quá hạn',
      impact: 'NEGATIVE',
      reason: `Có ${overdueFollowUps.length} lịch hẹn/follow-up đã quá hạn chưa hoàn tất.`,
      scoreDelta: -25
    });
  } else if (openFollowUps.length > 0) {
    score += 5;
    indicators.push({
      code: 'ACTIVE_FOLLOWUP_SCHEDULED',
      label: 'Có lịch chăm sóc sắp tới',
      impact: 'POSITIVE',
      reason: `Đã lên lịch chăm sóc (${openFollowUps.length} việc) đúng hạn.`,
      scoreDelta: 5
    });
  }

  // 2. Quotation analysis
  const customerQuotes = quotes.filter(q => 
    q.customer?.id === customer.id || 
    q.customer?.companyName === customer.companyName ||
    (customer.taxId && q.customer?.taxId === customer.taxId)
  );

  let lastQuotationDate: string | undefined;
  let expiringQuotationsCount = 0;
  let openQuotationsCount = 0;
  let acceptedQuotesCount = 0;
  let rejectedQuotesCount = 0;

  customerQuotes.forEach(q => {
    if (!lastQuotationDate || new Date(q.createdDate).getTime() > new Date(lastQuotationDate).getTime()) {
      lastQuotationDate = q.createdDate;
    }

    if (q.status === 'SENT' || q.status === 'DRAFT') {
      openQuotationsCount++;
      // Check if validityDate is within 4 days
      const validityDate = q.terms?.validityDate;
      if (validityDate) {
        const validMs = new Date(validityDate).getTime();
        const diffDays = (validMs - nowMs) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays <= 4) {
          expiringQuotationsCount++;
        }
      }
    } else if (q.status === 'ACCEPTED') {
      acceptedQuotesCount++;
    } else if (q.status === 'REJECTED') {
      rejectedQuotesCount++;
    }
  });

  if (expiringQuotationsCount > 0) {
    score -= 10;
    indicators.push({
      code: 'EXPIRING_QUOTATIONS',
      label: 'Báo giá sắp hết hạn',
      impact: 'NEGATIVE',
      reason: `Có ${expiringQuotationsCount} báo giá sắp hết hiệu lực trong 4 ngày tới cần chốt với khách.`,
      scoreDelta: -10
    });
  }

  if (acceptedQuotesCount > 0) {
    const bonus = Math.min(20, acceptedQuotesCount * 5);
    score += bonus;
    indicators.push({
      code: 'ACCEPTED_QUOTATIONS',
      label: 'Tỷ lệ chốt báo giá tốt',
      impact: 'POSITIVE',
      reason: `Khách đã chấp thuận ${acceptedQuotesCount} báo giá thành công.`,
      scoreDelta: bonus
    });
  }

  if (rejectedQuotesCount > 0 && acceptedQuotesCount === 0) {
    score -= 10;
    indicators.push({
      code: 'HIGH_REJECTION_RATE',
      label: 'Báo giá bị từ chối',
      impact: 'NEGATIVE',
      reason: `Có ${rejectedQuotesCount} báo giá gần đây bị từ chối, cần phân tích nguyên nhân giá/dịch vụ.`,
      scoreDelta: -10
    });
  }

  // 3. Operational Shipments Analysis
  const customerShipments = shipments.filter(s => 
    s.customerId === customer.id || 
    s.customerName === customer.companyName ||
    s.customerName === customer.customerName
  );

  let lastShipmentDate: string | undefined;
  let activeShipmentsCount = 0;

  customerShipments.forEach(s => {
    const sDate = s.cargoReadyDate || s.etdPlanned;
    if (sDate && (!lastShipmentDate || new Date(sDate).getTime() > new Date(lastShipmentDate).getTime())) {
      lastShipmentDate = sDate;
    }
    if (s.status !== 'DELIVERED' && s.status !== 'CANCELLED') {
      activeShipmentsCount++;
    }
  });

  if (activeShipmentsCount > 0) {
    score += 15;
    indicators.push({
      code: 'ACTIVE_SHIPMENTS_RUNNING',
      label: 'Lô hàng đang vận hành',
      impact: 'POSITIVE',
      reason: `Đang có ${activeShipmentsCount} lô hàng đang thực hiện (in-transit/customs).`,
      scoreDelta: 15
    });
  }

  // 4. Contract Analysis
  const customerContracts = contracts.filter(c => 
    c.partyId === customer.id || 
    c.partyName === customer.companyName
  );
  const activeContractsCount = customerContracts.filter(c => c.status === 'ACTIVE').length;

  if (activeContractsCount > 0) {
    score += 10;
    indicators.push({
      code: 'ACTIVE_CONTRACT',
      label: 'Có hợp đồng dịch vụ hiệu lực',
      impact: 'POSITIVE',
      reason: `Đang có ${activeContractsCount} hợp đồng logistics còn hiệu lực.`,
      scoreDelta: 10
    });
  }

  // 5. Recency / Dormancy Check
  let daysSinceLastAction = 999;
  if (lastShipmentDate || lastQuotationDate) {
    const latestMs = Math.max(
      lastShipmentDate ? new Date(lastShipmentDate).getTime() : 0,
      lastQuotationDate ? new Date(lastQuotationDate).getTime() : 0
    );
    daysSinceLastAction = Math.floor((nowMs - latestMs) / (1000 * 60 * 60 * 24));
  }

  let status: CustomerHealthStatus = 'HEALTHY';
  let primaryReason = 'Khách hàng có tương tác ổn định và quy trình logistics diễn ra đều đặn.';

  if (overdueFollowUps.length > 0) {
    status = 'FOLLOW_UP_REQUIRED';
    primaryReason = `Cần liên hệ gấp: Có ${overdueFollowUps.length} việc chăm sóc đã quá hạn.`;
  } else if (expiringQuotationsCount > 0) {
    status = 'NEEDS_ATTENTION';
    primaryReason = `Báo giá sắp hết hạn: Cần follow-up để chốt giữ chỗ booking.`;
  } else if (daysSinceLastAction > 60 && customerQuotes.length > 0) {
    score -= 30;
    status = 'DORMANT';
    primaryReason = `Khách hàng ngủ đông: Đã hơn ${daysSinceLastAction} ngày chưa có báo giá hoặc lô hàng mới.`;
    indicators.push({
      code: 'CUSTOMER_DORMANT',
      label: 'Khách hàng lâu chưa phát sinh booking',
      impact: 'NEGATIVE',
      reason: `Không có hoạt động mới trong ${daysSinceLastAction} ngày. Cần chiến dịch kích hoạt lại (Reactivation).`,
      scoreDelta: -30
    });
  } else if (customerQuotes.length === 0 && customerShipments.length === 0) {
    status = 'NEEDS_ATTENTION';
    primaryReason = 'Khách hàng mới chưa có báo giá hoặc lô hàng nào được tạo.';
    indicators.push({
      code: 'NEW_CUSTOMER_NO_QUOTE',
      label: 'Chưa có báo giá đầu tiên',
      impact: 'NEUTRAL',
      reason: 'Cần khảo sát nhu cầu tuyến hàng và gửi báo giá mở đầu.',
      scoreDelta: 0
    });
  } else if (score < 60) {
    status = 'NEEDS_ATTENTION';
    primaryReason = 'Điểm sức khỏe quan hệ khách hàng giảm do tỷ lệ phản hồi thấp hoặc báo giá quá hạn.';
  }

  // Clamp score
  score = Math.max(10, Math.min(100, score));

  return {
    score,
    status,
    primaryReason,
    indicators,
    calculatedAt: now.toISOString(),
    lastQuotationDate,
    lastShipmentDate,
    openQuotationsCount,
    expiringQuotationsCount,
    activeContractsCount,
    overdueFollowUpsCount: overdueFollowUps.length,
  };
}

/**
 * Computes customer service modes and lane interests from actual quotes and shipments.
 * Displays "Chưa đủ dữ liệu" if insufficient data.
 */
export function getCustomerServiceAndLaneInterests(
  quotes: QuoteData[],
  shipments: ShipmentRecord[]
): {
  serviceInterests: CustomerServiceInterest[];
  laneInterests: CustomerLaneInterest[];
  hasSufficientData: boolean;
} {
  const modeCountMap: Record<string, { quoteCount: number; shipmentCount: number; lastUsed?: string }> = {};
  const laneCountMap: Record<string, { origin: string; destination: string; mode: any; count: number; lastUsed?: string }> = {};

  let totalPoints = 0;

  quotes.forEach(q => {
    totalPoints++;
    const mode = q.shipment?.mode || 'SEA_FCL';
    if (!modeCountMap[mode]) modeCountMap[mode] = { quoteCount: 0, shipmentCount: 0 };
    modeCountMap[mode].quoteCount++;
    modeCountMap[mode].lastUsed = q.createdDate;

    const origin = q.shipment?.origin || q.shipment?.pol || '';
    const dest = q.shipment?.destination || q.shipment?.pod || '';
    if (origin && dest) {
      const laneKey = `${origin} ➔ ${dest}`;
      if (!laneCountMap[laneKey]) {
        laneCountMap[laneKey] = { origin, destination: dest, mode, count: 0 };
      }
      laneCountMap[laneKey].count++;
      laneCountMap[laneKey].lastUsed = q.createdDate;
    }
  });

  shipments.forEach(s => {
    totalPoints++;
    const mode = s.serviceMode || 'SEA_FCL';
    if (!modeCountMap[mode]) modeCountMap[mode] = { quoteCount: 0, shipmentCount: 0 };
    modeCountMap[mode].shipmentCount++;
    const sDate = s.cargoReadyDate || s.etdPlanned || '';
    modeCountMap[mode].lastUsed = sDate;

    const origin = s.origin || s.originPort || '';
    const dest = s.destination || s.destinationPort || '';
    if (origin && dest) {
      const laneKey = `${origin} ➔ ${dest}`;
      if (!laneCountMap[laneKey]) {
        laneCountMap[laneKey] = { origin, destination: dest, mode, count: 0 };
      }
      laneCountMap[laneKey].count++;
      laneCountMap[laneKey].lastUsed = sDate;
    }
  });

  const serviceInterests: CustomerServiceInterest[] = Object.keys(modeCountMap).map(mode => ({
    mode: mode as any,
    quoteCount: modeCountMap[mode].quoteCount,
    shipmentCount: modeCountMap[mode].shipmentCount,
    lastUsedDate: modeCountMap[mode].lastUsed,
  }));

  const laneInterests: CustomerLaneInterest[] = Object.keys(laneCountMap).map(lane => ({
    lane,
    origin: laneCountMap[lane].origin,
    destination: laneCountMap[lane].destination,
    mode: laneCountMap[lane].mode,
    count: laneCountMap[lane].count,
    lastUsedDate: laneCountMap[lane].lastUsed,
  })).sort((a, b) => b.count - a.count);

  return {
    serviceInterests,
    laneInterests,
    hasSufficientData: totalPoints > 0,
  };
}

/**
 * Manage Customer Contacts in Firestore
 */
export async function getCustomerContacts(companyId: string, customerId: string): Promise<CustomerContact[]> {
  if (!db || !customerId) return [];
  try {
    const collRef = collection(db, CONTACTS_COLLECTION);
    const q = query(
      collRef,
      where('companyId', '==', companyId || 'default-company'),
      where('customerId', '==', customerId),
      limit(50)
    );
    const snap = await getDocs(q);
    const contacts: CustomerContact[] = [];
    snap.forEach(d => contacts.push(d.data() as CustomerContact));
    return contacts;
  } catch (err) {
    console.error('[Customer360Service] Failed to get customer contacts:', err);
    return [];
  }
}

export async function saveCustomerContact(
  contact: Partial<CustomerContact> & { customerId: string; name: string; email: string },
  user?: { email?: string; name?: string }
): Promise<CustomerContact> {
  const id = contact.id || `cc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const fullContact: CustomerContact = {
    id,
    companyId: contact.companyId || 'default-company',
    customerId: contact.customerId,
    name: contact.name.trim(),
    title: contact.title?.trim() || '',
    email: contact.email.trim(),
    phone: contact.phone?.trim() || '',
    isPrimary: contact.isPrimary || false,
    department: contact.department?.trim() || '',
    notes: contact.notes?.trim() || '',
    createdAt: contact.createdAt || now,
    updatedAt: now,
  };

  if (db) {
    try {
      const docRef = doc(db, CONTACTS_COLLECTION, id);
      const cleanData: Record<string, any> = { ...fullContact, serverCreatedAt: serverTimestamp() };
      Object.keys(cleanData).forEach(k => cleanData[k] === undefined && delete cleanData[k]);
      await setDoc(docRef, cleanData);

      await logCRMAudit({
        companyId: fullContact.companyId,
        customerId: fullContact.customerId,
        entityType: 'CONTACT',
        entityId: id,
        action: 'CONTACT_SAVED',
        performedBy: user?.email || 'user',
        performedByName: user?.name || 'User',
        newState: { name: fullContact.name, title: fullContact.title, email: fullContact.email }
      });
    } catch (err) {
      console.error('[Customer360Service] Failed to save contact:', err);
    }
  }

  return fullContact;
}

export async function deleteCustomerContact(contactId: string, customerId: string, companyId: string): Promise<void> {
  if (!db || !contactId) return;
  try {
    const docRef = doc(db, CONTACTS_COLLECTION, contactId);
    await deleteDoc(docRef);

    await logCRMAudit({
      companyId: companyId || 'default-company',
      customerId,
      entityType: 'CONTACT',
      entityId: contactId,
      action: 'CONTACT_DELETED',
      performedBy: 'user',
      performedByName: 'User',
    });
  } catch (err) {
    console.error('[Customer360Service] Failed to delete contact:', err);
  }
}

export interface Customer360DataResult {
  activities: CustomerActivity[];
  followUps: CustomerFollowUp[];
  rateReviewSchedules: RateReviewSchedule[];
  rateReviewTasks: RateReviewTask[];
  opportunities: CustomerOpportunity[];
  healthScore: CustomerHealthScore | null;
}

/**
 * Fetch unified Customer 360 data across all CRM modules
 */
export async function fetchCustomer360Data(
  customerId: string,
  companyId: string = 'default-company',
  customer?: CustomerRecord,
  quotes: QuoteData[] = [],
  shipments: ShipmentRecord[] = [],
  contracts: ContractRecord[] = []
): Promise<Customer360DataResult> {
  const [activities, followUps, rateReviewSchedules, rateReviewTasks, opportunities] = await Promise.all([
    getCustomerActivities(companyId, customerId, 100),
    getCustomerFollowUps(companyId, { customerId }),
    getRateReviewSchedules(companyId, customerId),
    getRateReviewTasks(companyId, { customerId }),
    getCustomerOpportunities(companyId, { customerId }),
  ]);

  let healthScore: CustomerHealthScore | null = null;
  if (customer) {
    healthScore = calculateCustomerHealth(customer, quotes, shipments, contracts, followUps);
  }

  return {
    activities,
    followUps,
    rateReviewSchedules,
    rateReviewTasks,
    opportunities,
    healthScore,
  };
}

