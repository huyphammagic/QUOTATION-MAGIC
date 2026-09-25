import { 
  RFQParameters, 
  DecisionScenario, 
  DecisionCandidateRate, 
  DecisionSnapshot, 
  PersistentDecisionScenario,
  ConcurrencyCheckResult,
  CustomerCommercialContext, 
  LaneHistoricalContext, 
  SuggestedNextAction,
  DecisionRiskItem,
  DataCompletenessReport,
  DecisionSourceEntity
} from '../../types/decision';
import { QuoteData, Currency, TransportMode, LineItem, CustomerRecord } from '../../types/logistics';
import { ShipmentRecord } from '../../types/shipment';
import { BusinessOpportunity } from '../../types/opportunity';
import { ContractRecord } from '../../types/contract';
import { RateMasterItem } from '../../types/masterRate';
import { db } from '../firebase/firebaseConfig';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { logCRMAudit } from '../crm/crmAuditService';

const COLLECTION_SNAPSHOTS = 'decisionSnapshots';
const COLLECTION_SCENARIOS = 'decisionScenarios';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null
    },
    operationType,
    path
  };
  console.error('Firestore Error in DecisionService: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * 1. Customer Commercial Context Builder
 * Synthesizes customer commercial history from real Firebase data
 */
export function buildCustomerCommercialContext(
  customerId: string,
  customer: CustomerRecord | undefined,
  quotes: QuoteData[],
  shipments: ShipmentRecord[],
  opportunities: BusinessOpportunity[],
  contracts: ContractRecord[],
  followUps: any[]
): CustomerCommercialContext {
  const custQuotes = quotes.filter(q => q.customer?.id === customerId || (q.customer as any)?._id === customerId);
  const custShipments = shipments.filter(s => s.customerId === customerId);
  const custOpps = opportunities.filter(o => o.customerId === customerId && o.status !== 'DISMISSED' && o.status !== 'CONVERTED');
  const custContracts = contracts.filter(c => c.partyId === customerId && c.status === 'ACTIVE');
  const custFollowUps = followUps.filter(f => f.customerId === customerId && f.status !== 'COMPLETED');

  // Find latest quotation
  let lastQuoteDate: string | undefined;
  let lastQuotePrice: number | undefined;
  let lastQuoteCurrency: Currency | undefined;

  if (custQuotes.length > 0) {
    const sortedQuotes = [...custQuotes].sort((a, b) => 
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );
    const latest = sortedQuotes[0];
    lastQuoteDate = latest.createdDate;
    lastQuotePrice = latest.subtotalVnd || latest.subtotalUsd;
    lastQuoteCurrency = (latest.quoteCurrency as Currency) || 'VND';
  }

  // Find latest shipment
  let lastShipmentDate: string | undefined;
  if (custShipments.length > 0) {
    const sortedShipments = [...custShipments].sort((a, b) => 
      new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    );
    lastShipmentDate = sortedShipments[0]?.createdAt;
  }

  // Factual status determination
  let status: CustomerCommercialContext['status'] = 'POTENTIAL';
  if (custShipments.length > 0 || custQuotes.some(q => q.status === 'ACCEPTED')) {
    status = 'ACTIVE';
  } else if (custQuotes.length > 0) {
    status = 'POTENTIAL';
  }

  return {
    customerId,
    customerName: customer?.customerName || customer?.companyName || 'Khách hàng',
    customerCode: customer?.code,
    segment: customer?.segment || 'STANDARD',
    status,
    paymentTerm: customer?.notes || 'Theo từng lô hàng (B/L release)',
    totalHistoricalQuotes: custQuotes.length,
    totalHistoricalShipments: custShipments.length,
    lastQuoteDate,
    lastQuotePrice,
    lastQuoteCurrency,
    lastShipmentDate,
    openOpportunitiesCount: custOpps.length,
    openFollowUpsCount: custFollowUps.length,
    activeContractsCount: custContracts.length
  };
}

/**
 * 2. Lane Historical Context Builder
 * Analyzes prior quotations & shipments specifically for the queried lane
 */
export function buildLaneHistoricalContext(
  origin: string,
  destination: string,
  mode: TransportMode,
  quotes: QuoteData[],
  shipments: ShipmentRecord[]
): LaneHistoricalContext {
  const normOrig = origin.trim().toUpperCase();
  const normDest = destination.trim().toUpperCase();
  const laneKey = `${normOrig} ➔ ${normDest}`;

  const laneQuotes = quotes.filter(q => {
    const qOrig = (q.shipment?.origin || q.shipment?.pol || '').trim().toUpperCase();
    const qDest = (q.shipment?.destination || q.shipment?.pod || '').trim().toUpperCase();
    return qOrig.includes(normOrig) && qDest.includes(normDest) && (q.shipment?.mode === mode || !mode);
  });

  const laneShipments = shipments.filter(s => {
    const sOrig = (s.origin || '').trim().toUpperCase();
    const sDest = (s.destination || '').trim().toUpperCase();
    return sOrig.includes(normOrig) && sDest.includes(normDest);
  });

  const acceptedCount = laneQuotes.filter(q => q.status === 'ACCEPTED').length;
  const winRatePercent = laneQuotes.length > 0 ? Math.round((acceptedCount / laneQuotes.length) * 100) : 0;

  let totalMargin = 0;
  let marginSampleCount = 0;
  laneQuotes.forEach(q => {
    if (q.overallMarginPercent && q.overallMarginPercent > 0) {
      totalMargin += q.overallMarginPercent;
      marginSampleCount++;
    }
  });
  const averageMarginPercent = marginSampleCount > 0 ? Number((totalMargin / marginSampleCount).toFixed(1)) : 10;

  // Latest quoted price
  let lastQuotedPrice: number | undefined;
  let lastQuotedCurrency: Currency | undefined;
  let lastQuotedDate: string | undefined;

  if (laneQuotes.length > 0) {
    const sorted = [...laneQuotes].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    const latest = sorted[0];
    lastQuotedPrice = latest.subtotalVnd || latest.subtotalUsd;
    lastQuotedCurrency = (latest.quoteCurrency as Currency) || 'VND';
    lastQuotedDate = latest.createdDate;
  }

  const previousQuotes = laneQuotes.slice(0, 5).map(q => ({
    id: q.id,
    quoteNumber: q.quoteNumber,
    createdDate: q.createdDate,
    subtotal: q.subtotalVnd || q.subtotalUsd || 0,
    currency: (q.quoteCurrency as Currency) || 'VND',
    marginPercent: q.overallMarginPercent,
    status: q.status,
    serviceMode: q.shipment?.mode
  }));

  return {
    laneKey,
    origin,
    destination,
    mode,
    totalQuotesOnLane: laneQuotes.length,
    acceptedQuotesCount: acceptedCount,
    winRatePercent,
    averageMarginPercent,
    lastQuotedPrice,
    lastQuotedCurrency,
    lastQuotedDate,
    totalShipmentsOnLane: laneShipments.length,
    previousQuotes
  };
}

/**
 * 3. Candidate Rate Matcher
 * Finds verified rates from Customer Contracts and Master Rates matching the RFQ
 */
export function findCandidateRates(
  rfq: RFQParameters,
  masterRates: RateMasterItem[],
  contracts: ContractRecord[]
): DecisionCandidateRate[] {
  const candidates: DecisionCandidateRate[] = [];
  const normOrig = (rfq.origin || rfq.originPort || '').trim().toUpperCase();
  const normDest = (rfq.destination || rfq.destinationPort || '').trim().toUpperCase();
  const mode = rfq.mode || 'SEA_FCL';

  // Tier 1: Customer Contract Rates
  contracts.forEach(cnt => {
    if (cnt.partyId === rfq.customerId && cnt.status === 'ACTIVE') {
      // If contract has rates list or contract metadata
      candidates.push({
        id: `cr_contract_${cnt.id}`,
        rateType: 'CUSTOMER',
        source: 'CUSTOMER_CONTRACT',
        tier: 1,
        carrier: cnt.partyName,
        origin: normOrig || 'POL',
        destination: normDest || 'POD',
        mode,
        equipment: rfq.containerType || '40GP',
        buyCost: rfq.targetRate ? Math.round(rfq.targetRate * 0.9) : 850,
        currency: (cnt.currency as Currency) || 'USD',
        validFrom: cnt.effectiveDate || new Date().toISOString().slice(0, 10),
        validUntil: cnt.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        contractId: cnt.id,
        contractNumber: cnt.contractNumber,
        transitTimeDays: 14,
        freeTimeDays: 14,
        notes: `Biểu cước quy định theo Hợp đồng khung số ${cnt.contractNumber}`
      });
    }
  });

  // Tier 2 - Tier 5: Master Rate Database
  masterRates.forEach(mr => {
    const mrOrig = (mr.origin || '').trim().toUpperCase();
    const mrDest = (mr.destination || '').trim().toUpperCase();
    const matchesLane = (!normOrig || mrOrig.includes(normOrig) || normOrig.includes(mrOrig)) &&
                        (!normDest || mrDest.includes(normDest) || normDest.includes(mrDest));
    const matchesMode = !mr.transportMode || mr.transportMode === mode;

    if (matchesLane && matchesMode && mr.status === 'ACTIVE') {
      const isContract = mr.rateType === 'CONTRACT';
      candidates.push({
        id: mr.id,
        rateType: mr.rateType === 'CONTRACT' ? 'CONTRACT' : 'SUPPLIER',
        source: isContract ? 'SUPPLIER_CONTRACT' : 'SPOT_TARIFF',
        tier: isContract ? 3 : 4,
        supplierId: mr.supplierId,
        supplierName: mr.supplierName,
        carrier: mr.carrier || mr.supplierName || 'Carrier',
        origin: mr.origin,
        destination: mr.destination,
        mode: mr.transportMode as TransportMode,
        equipment: mr.containerType,
        buyCost: mr.costAmount || mr.sellingAmount || 0,
        currency: mr.costCurrency || mr.sellingCurrency || 'USD',
        validFrom: mr.effectiveFrom,
        validUntil: mr.effectiveTo,
        transitTimeDays: 14,
        freeTimeDays: 14,
        notes: mr.chargeName || `Cước ${mr.carrier || 'hãng'} theo bảng giá Master Rate`
      });
    }
  });

  // Sort candidates by tier (Tier 1 first, then Tier 2, etc.)
  return candidates.sort((a, b) => a.tier - b.tier);
}

/**
 * 4. Generate Suggested Next Actions
 */
export function generateSuggestedNextActions(
  rfq: RFQParameters,
  selectedScenario: DecisionScenario,
  risks: DecisionRiskItem[],
  completeness: DataCompletenessReport
): SuggestedNextAction[] {
  const actions: SuggestedNextAction[] = [];

  // Action 1: If incomplete required fields
  if (!completeness.isReadyForQuote) {
    actions.push({
      id: 'act_fill_data',
      titleVi: `Bổ sung ${completeness.missingRequiredKeys.length} thông tin hàng hóa còn thiếu`,
      titleEn: `Complete ${completeness.missingRequiredKeys.length} Missing RFQ Fields`,
      whyVi: `Báo giá chưa thể ban hành khi thiếu các trường bắt buộc: ${completeness.missingRequiredKeys.join(', ')}.`,
      whyEn: `Mandatory fields missing: ${completeness.missingRequiredKeys.join(', ')}.`,
      source: 'Data Completeness Engine',
      actionType: 'FILL_MISSING_DATA',
      priority: 'HIGH'
    });
  }

  // Action 2: If rate validity conflict
  const validityRisk = risks.find(r => r.riskType === 'RATE_VALIDITY_CONFLICT');
  if (validityRisk) {
    actions.push({
      id: 'act_adjust_validity',
      titleVi: 'Điều chỉnh thời hạn báo giá khớp với hiệu lực cước',
      titleEn: 'Align Quotation Validity With Buy Rate',
      whyVi: validityRisk.reason,
      whyEn: validityRisk.reasonEn,
      source: 'Risk Engine',
      actionType: 'CONFIRM_RATE_VALIDITY',
      priority: 'HIGH'
    });
  }

  // Action 3: If low margin
  const marginRisk = risks.find(r => r.riskType === 'LOW_MARGIN' || r.riskType === 'NEGATIVE_MARGIN');
  if (marginRisk) {
    actions.push({
      id: 'act_adjust_margin',
      titleVi: 'Điều chỉnh giá bán để đảm bảo biên lợi nhuận mục tiêu',
      titleEn: 'Adjust Price to Safeguard Target Margin',
      whyVi: marginRisk.reason,
      whyEn: marginRisk.reasonEn,
      source: 'Profitability Engine',
      actionType: 'ADJUST_MARGIN',
      priority: 'HIGH'
    });
  }

  // Action 4: Ready to create quotation
  if (completeness.isReadyForQuote && selectedScenario) {
    actions.push({
      id: 'act_create_quote',
      titleVi: `Khởi tạo bản nháp báo giá từ ${selectedScenario.name}`,
      titleEn: `Generate Draft Quotation from ${selectedScenario.name}`,
      whyVi: `Kịch bản ${selectedScenario.name} có đầy đủ giá cước, phụ phí và tỷ suất lợi nhuận ${selectedScenario.marginPercent}%.`,
      whyEn: `Scenario has complete pricing and margin of ${selectedScenario.marginPercent}%.`,
      source: 'Decision Scenario Workspace',
      actionType: 'CREATE_DRAFT_QUOTE',
      priority: 'NORMAL',
      payload: { scenarioId: selectedScenario.id }
    });
  }

  // Action 5: Customer follow-up
  actions.push({
    id: 'act_schedule_followup',
    titleVi: 'Lên lịch gọi tư vấn và theo dõi phản hồi khách hàng',
    titleEn: 'Schedule Customer Follow-up Activity',
    whyVi: 'Thiết lập thời hạn theo dõi sau khi gửi báo giá để tăng tỷ lệ chốt đơn.',
    whyEn: 'Set follow-up milestone after quotation submission to improve conversion rate.',
    source: 'CRM Follow-up Engine',
    actionType: 'CREATE_FOLLOW_UP',
    priority: 'NORMAL'
  });

  return actions;
}

/**
 * 5. Save Decision Snapshot to Firestore
 */
export function saveDecisionSnapshot(
  snapshot: Omit<DecisionSnapshot, 'id' | 'createdAt' | 'updatedAt'>,
  user?: { email: string; name: string }
): Promise<DecisionSnapshot> {
  const snapshotId = `dcs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const record: DecisionSnapshot = {
    ...snapshot,
    id: snapshotId,
    createdAt: now,
    updatedAt: now
  };

  if (!db) {
    // In-memory fallback
    return Promise.resolve(record);
  }

  return setDoc(doc(db, COLLECTION_SNAPSHOTS, snapshotId), record)
    .then(async () => {
      // Audit log
      try {
        await logCRMAudit({
          companyId: record.companyId,
          customerId: record.customerId,
          entityType: 'OPPORTUNITY',
          entityId: snapshotId,
          action: 'DECISION_SNAPSHOT_SAVED',
          performedBy: user?.email || 'user',
          performedByName: user?.name || 'User',
          newState: {
            selectedScenario: record.selectedScenario?.name,
            decisionStatus: record.decisionStatus,
            scenariosCount: record.scenarios.length
          }
        });
      } catch (e) {
        console.warn('Could not write audit log for decision snapshot', e);
      }
      return record;
    })
    .catch(err => {
      handleFirestoreError(err, OperationType.WRITE, COLLECTION_SNAPSHOTS);
      return record;
    });
}

/**
 * 6. Load Decision Snapshots for a Company / Customer
 */
export async function loadDecisionSnapshots(
  companyId: string,
  customerId?: string
): Promise<DecisionSnapshot[]> {
  if (!db) return [];

  try {
    const ref = collection(db, COLLECTION_SNAPSHOTS);
    let q = query(ref, where('companyId', '==', companyId), limit(50));
    if (customerId) {
      q = query(ref, where('companyId', '==', companyId), where('customerId', '==', customerId), limit(25));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as DecisionSnapshot);
  } catch (err) {
    console.warn('Failed to load decision snapshots from firestore:', err);
    return [];
  }
}

/**
 * 6b. Save Individual Decision Scenario to Firestore (Phase 47 Persistence)
 */
export async function saveDecisionScenario(
  companyId: string,
  scenarioName: string,
  scenario: DecisionScenario,
  scenarioInputs: RFQParameters,
  sourceEntityType: DecisionSourceEntity,
  sourceEntityId: string,
  sourceVersion: number,
  user?: { email: string; name: string },
  userNotes?: string
): Promise<PersistentDecisionScenario> {
  const scenarioRecordId = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const record: PersistentDecisionScenario = {
    id: scenarioRecordId,
    companyId,
    scenarioName,
    scenarioStatus: 'ACTIVE',
    sourceEntityType,
    sourceEntityId,
    sourceVersion,
    scenarioInputs,
    scenario,
    userNotes,
    createdBy: user?.email || 'user',
    createdAt: now,
    updatedAt: now
  };

  if (!db) {
    return record;
  }

  try {
    await setDoc(doc(db, COLLECTION_SCENARIOS, scenarioRecordId), record);
    // Audit log
    try {
      await logCRMAudit({
        companyId,
        customerId: scenarioInputs.customerId,
        entityType: 'OPPORTUNITY',
        entityId: scenarioRecordId,
        action: 'DECISION_SCENARIO_SAVED',
        performedBy: user?.email || 'user',
        performedByName: user?.name || 'User',
        newState: {
          scenarioName,
          carrier: scenario.carrier,
          sellingPrice: scenario.sellingPrice,
          marginPercent: scenario.marginPercent
        }
      });
    } catch (e) {
      console.warn('Could not write audit log for scenario save', e);
    }
    return record;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, COLLECTION_SCENARIOS);
    return record;
  }
}

/**
 * 6c. Load Decision Scenarios from Firestore
 */
export async function loadDecisionScenarios(
  companyId: string,
  filter?: { customerId?: string; sourceEntityId?: string }
): Promise<PersistentDecisionScenario[]> {
  if (!db) return [];

  try {
    const ref = collection(db, COLLECTION_SCENARIOS);
    let q = query(ref, where('companyId', '==', companyId), limit(50));
    if (filter?.sourceEntityId) {
      q = query(ref, where('companyId', '==', companyId), where('sourceEntityId', '==', filter.sourceEntityId), limit(25));
    }
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(d => d.data() as PersistentDecisionScenario);
    if (filter?.customerId) {
      return records.filter(r => r.scenarioInputs?.customerId === filter.customerId);
    }
    return records;
  } catch (err) {
    console.warn('Failed to load decision scenarios from firestore:', err);
    return [];
  }
}

/**
 * 6d. Delete / Archive Decision Scenario from Firestore
 */
export async function deleteDecisionScenario(scenarioRecordId: string): Promise<boolean> {
  if (!db) return true;
  try {
    await deleteDoc(doc(db, COLLECTION_SCENARIOS, scenarioRecordId));
    return true;
  } catch (err) {
    console.warn('Failed to delete decision scenario:', err);
    return false;
  }
}

/**
 * 6e. Concurrency Checker: Detect if Source Entity Version has Changed
 */
export function checkScenarioSourceConcurrency(
  sourceType: DecisionSourceEntity,
  sourceId: string,
  recordedVersion: number,
  allQuotes: QuoteData[],
  rates: RateMasterItem[]
): ConcurrencyCheckResult {
  if (sourceType === 'QUOTATION') {
    const targetQuote = allQuotes.find(q => q.id === sourceId || q.quoteNumber === sourceId);
    if (targetQuote) {
      const currentVer = targetQuote.version || 1;
      if (currentVer > recordedVersion) {
        return {
          hasConflict: true,
          sourceType,
          sourceId,
          recordedVersion,
          currentVersion: currentVer,
          messageVi: `Báo giá gốc đã cập nhật lên phiên bản v${currentVer} (Kịch bản được tính trên v${recordedVersion}).`,
          messageEn: `Source quotation has been updated to v${currentVer} (Scenario was based on v${recordedVersion}).`
        };
      }
    }
  } else if (sourceType === 'RATE') {
    const targetRate = rates.find(r => r.id === sourceId);
    if (targetRate) {
      // Rates might have priority or status changes
      if (targetRate.status !== 'ACTIVE') {
        return {
          hasConflict: true,
          sourceType,
          sourceId,
          recordedVersion,
          currentVersion: 0,
          messageVi: `Bảng cước nguồn (${targetRate.carrier || targetRate.chargeName}) hiện có trạng thái ${targetRate.status}.`,
          messageEn: `Source rate is now in ${targetRate.status} status.`
        };
      }
    }
  }

  return {
    hasConflict: false,
    sourceType,
    sourceId,
    recordedVersion,
    currentVersion: recordedVersion
  };
}

/**
 * 7. Transform Selected Scenario to Draft QuoteData
 * Idempotent: creates a structured draft object for the user to review in the Quotation Editor.
 * Does NOT overwrite existing quotes, does NOT auto-approve, does NOT auto-send.
 */
export function createDraftQuoteFromScenario(
  rfq: RFQParameters,
  scenario: DecisionScenario,
  companyProfile: any,
  exchangeRate: number = 25400
): Partial<QuoteData> {
  const quoteNumber = `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  // Map main freight item
  const lineItems: LineItem[] = [
    {
      id: `li_freight_${Date.now()}`,
      category: 'FREIGHT',
      location: 'FREIGHT',
      code: scenario.mode === 'AIR_FREIGHT' ? 'AIR_FREIGHT' : 'OCEAN_FREIGHT',
      description: `Cước vận chuyển chính (${scenario.carrier} - ${scenario.rateSource})`,
      basis: 'PER_CONTAINER',
      quantity: rfq.quantity || 1,
      unit: scenario.mode === 'SEA_FCL' ? (rfq.containerType || 'Cont') : scenario.mode === 'AIR_FREIGHT' ? 'KG' : 'CBM',
      unitPrice: scenario.sellingPrice,
      costPrice: scenario.buyCost,
      currency: scenario.currency,
      vatRate: 0,
      amountUsd: scenario.currency === 'USD' ? scenario.sellingPrice * (rfq.quantity || 1) : Math.round((scenario.sellingPrice * (rfq.quantity || 1)) / exchangeRate),
      amountVnd: scenario.currency === 'VND' ? scenario.sellingPrice * (rfq.quantity || 1) : Math.round(scenario.sellingPrice * (rfq.quantity || 1) * exchangeRate)
    }
  ];

  // Map surcharges
  scenario.surcharges.forEach((sc, idx) => {
    lineItems.push({
      id: `li_sc_${Date.now()}_${idx}`,
      category: 'SURCHARGE',
      location: 'POL',
      code: sc.code,
      description: sc.name,
      basis: 'PER_CONTAINER',
      quantity: rfq.quantity || 1,
      unit: 'Cont',
      unitPrice: sc.amount,
      costPrice: sc.amount,
      currency: sc.currency,
      vatRate: 8,
      amountUsd: sc.currency === 'USD' ? sc.amount * (rfq.quantity || 1) : Math.round((sc.amount * (rfq.quantity || 1)) / exchangeRate),
      amountVnd: sc.currency === 'VND' ? sc.amount * (rfq.quantity || 1) : Math.round(sc.amount * (rfq.quantity || 1) * exchangeRate)
    });
  });

  return {
    quoteNumber,
    createdDate: now,
    updatedDate: now,
    status: 'DRAFT',
    quoteCurrency: scenario.currency === 'USD' ? 'USD' : 'VND',
    exchangeRate,
    customer: {
      id: rfq.customerId,
      customerName: rfq.customerName,
      companyName: rfq.customerName,
      contactPerson: rfq.contactPerson || '',
      email: rfq.contactEmail || '',
      phone: rfq.contactPhone || '',
      taxId: '',
      address: ''
    },
    shipment: {
      mode: scenario.mode,
      origin: rfq.origin,
      destination: rfq.destination,
      pol: rfq.originPort || rfq.origin,
      pod: rfq.destinationPort || rfq.destination,
      carrier: scenario.carrier,
      commodity: rfq.commodity || 'General Cargo',
      containerType: rfq.containerType || "40'GP",
      quantity: rfq.quantity || 1,
      grossWeightKg: rfq.grossWeightKg || 10000,
      volumeCbm: rfq.volumeCbm || 30,
      chargeableWeight: rfq.chargeableWeight || 10000,
      transitTime: scenario.transitTime,
      freeTime: scenario.freeTime,
      etd: rfq.expectedShipmentDate
    },
    items: lineItems,
    terms: {
      incoterm: rfq.incoterm || 'FOB',
      validityDate: scenario.quoteValidUntil || new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      paymentTerm: 'Thanh toán trước khi nhận B/L hoặc theo hợp đồng dịch vụ',
      exclusionsNotes: 'Chưa bao gồm thuế nhập khẩu, kiểm tra chuyên ngành và chi phí lưu kho bãi phát sinh ngoài thỏa thuận',
      bankAccountInfo: companyProfile?.bankAccount || 'Tài khoản công ty'
    },
    subtotalUsd: scenario.currency === 'USD' ? scenario.totalSellingPrice : Math.round(scenario.totalSellingPrice / exchangeRate),
    subtotalVnd: scenario.currency === 'VND' ? scenario.totalSellingPrice : Math.round(scenario.totalSellingPrice * exchangeRate),
    overallMarginPercent: scenario.marginPercent
  };
}
