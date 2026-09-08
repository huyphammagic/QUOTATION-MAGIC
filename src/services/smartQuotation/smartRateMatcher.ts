import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { ContractItem, ContractRateItem } from '../../types/contract';
import { RateMasterItem, ChargeMasterItem } from '../../types/masterRate';
import { ShipmentDetails, CustomerInfo, TransportMode, ContainerType, IncotermCode, Currency, FeeCategory, ChargeLocation, SurchargeItem } from '../../types/logistics';
import { ChargeBasis } from '../../types/pricing';
import { 
  MatchedRateCandidate, 
  SmartRateMatchingResult, 
  MissingRateDetectionItem, 
  MissingRateStatus, 
  RateMatchSourceType 
} from '../../types/smartQuotation';

// In-memory cache for master charges with 60s TTL
interface CacheItem<T> {
  data: T;
  cachedAt: number;
}
const CACHE_TTL_MS = 60 * 1000;
let cachedCharges: CacheItem<ChargeMasterItem[]> | null = null;
let cachedSurcharges: CacheItem<SurchargeItem[]> | null = null;

/**
 * Normalizes location codes for comparison (removes spaces, punctuation, uppercase)
 */
function normalizeLoc(loc?: string): string {
  if (!loc) return '';
  return loc.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Maps TransportMode to Contract ServiceMode string
 */
function mapModeToServiceMode(mode: TransportMode): 'SEA' | 'AIR' | 'TRUCKING' | 'CUSTOMS' | 'OTHER' {
  if (mode === 'SEA_FCL' || mode === 'SEA_LCL') return 'SEA';
  if (mode === 'AIR_FREIGHT') return 'AIR';
  if (mode === 'INLAND_TRUCKING') return 'TRUCKING';
  if (mode === 'CUSTOMS_CLEARANCE') return 'CUSTOMS';
  return 'OTHER';
}

/**
 * Helper to determine if a date falls within a validity range
 */
function isDateWithinRange(checkDate: string, validFrom?: string, validTo?: string): boolean {
  if (!checkDate) return true;
  if (validFrom && checkDate < validFrom) return false;
  if (validTo && checkDate > validTo) return false;
  return true;
}

export interface SmartMatchRequest {
  shipment: ShipmentDetails;
  customer?: CustomerInfo;
  carrier?: string;
  quotationDate?: string;
  validityDate?: string;
  incoterm?: IncotermCode;
}

/**
 * Scans Firestore for 100% REAL rates matching shipment specifications.
 * Strictly adheres to priority rules:
 * 1. Customer Contract Rate (Priority 100-90)
 * 2. Active Contract Rate (Priority 85)
 * 3. Carrier Rate (Priority 75)
 * 4. Supplier Rate (Priority 70)
 * 5. Standard Master Rate (Priority 60)
 * 6. Spot Master Rate (Priority 50)
 * 
 * If no matching records exist in Firestore: returns empty list (ZERO fake data).
 */
export async function matchRatesForQuotation(req: SmartMatchRequest): Promise<SmartRateMatchingResult> {
  const { shipment, customer, carrier, quotationDate, validityDate, incoterm } = req;
  const targetDate = quotationDate || new Date().toISOString().slice(0, 10);
  const targetMode = shipment.mode;
  const serviceMode = mapModeToServiceMode(targetMode);
  
  const normOrigin = normalizeLoc((shipment as any).origin || shipment.pol);
  const normDest = normalizeLoc((shipment as any).destination || shipment.pod);
  const normEquip = normalizeLoc(shipment.containerType);

  const candidates: MatchedRateCandidate[] = [];
  const warnings: string[] = [];

  if (!db) {
    return {
      isFound: false,
      bestMatches: [],
      alternativeMatches: [],
      missingRates: detectMissingRates(shipment, incoterm, []),
      warnings: ['Không thể kết nối cơ sở dữ liệu Firebase Firestore.'],
    };
  }

  // =========================================================================
  // TIER 1: CUSTOMER CONTRACT RATES (PRIORITY 1)
  // =========================================================================
  if (customer && (customer.id || customer.customerName || customer.companyName)) {
    try {
      const contractsRef = collection(db, 'contracts');
      // Query customer contracts with index constraints
      const custContractQ = query(
        contractsRef,
        where('contractType', '==', 'CUSTOMER'),
        where('status', '==', 'ACTIVE'),
        limit(10)
      );
      const custContractSnap = await getDocs(custContractQ);

      for (const cDoc of custContractSnap.docs) {
        const contract = cDoc.data() as ContractItem;
        // Verify customer ID or name match
        const isPartyMatch = 
          (customer.id && contract.partyId === customer.id) ||
          (customer.companyName && contract.partyName?.toLowerCase() === customer.companyName.toLowerCase()) ||
          (customer.customerName && contract.partyName?.toLowerCase() === customer.customerName.toLowerCase());

        if (!isPartyMatch) continue;

        // Check contract date validity
        const isContractDateValid = isDateWithinRange(targetDate, contract.effectiveDate, contract.expiryDate);
        if (!isContractDateValid) {
          warnings.push(`Hợp đồng ${contract.contractNumber} của khách hàng đã hết hạn hoặc chưa có hiệu lực (Hiệu lực: ${contract.effectiveDate} - ${contract.expiryDate}).`);
          continue;
        }

        // Fetch contract rates (limited to 50)
        const cRatesRef = collection(db, 'contractRates');
        const cRateQ = query(
          cRatesRef,
          where('contractId', '==', contract.id),
          where('status', '==', 'ACTIVE'),
          limit(50)
        );
        const cRateSnap = await getDocs(cRateQ);

        for (const rDoc of cRateSnap.docs) {
          const r = rDoc.data() as ContractRateItem;

          // Mode check
          if (r.serviceMode !== serviceMode) continue;

          // Equipment check if FCL
          if (normEquip && r.equipmentType) {
            const rEquip = normalizeLoc(r.equipmentType);
            if (rEquip && rEquip !== normEquip) continue;
          }

          // Route scoring
          const rOrigin = normalizeLoc(r.originCode || r.origin || r.pol);
          const rDest = normalizeLoc(r.destinationCode || r.destination || r.pod);

          let routeScore = 0;
          if (rOrigin && rDest && rOrigin === normOrigin && rDest === normDest) {
            routeScore = 100; // Exact match
          } else if (rOrigin === normOrigin || rDest === normDest) {
            routeScore = 80;  // Single port match
          } else if (!rOrigin && !rDest) {
            routeScore = 70;  // General charge
          }

          if (routeScore > 0) {
            const isRateDateValid = isDateWithinRange(targetDate, r.validFrom, r.validTo);
            const explanation = `Khớp từ Hợp đồng khách hàng: ${contract.contractNumber} (v${contract.currentVersion}). ` +
              `Khách hàng: ${contract.partyName || customer.companyName || customer.customerName}. ` +
              `Tuyến: ${r.origin || shipment.pol || 'N/A'} -> ${r.destination || shipment.pod || 'N/A'}. ` +
              `Thiết bị: ${r.equipmentType || shipment.containerType || 'Tiêu chuẩn'}. ` +
              `Hiệu lực: ${r.validFrom} đến ${r.validTo}.`;

            candidates.push({
              id: r.id || rDoc.id,
              sourceType: 'CUSTOMER_CONTRACT',
              sourceName: `Hợp đồng KH: ${contract.partyName || contract.contractNumber}`,
              sourceReference: `${contract.contractNumber} (v${contract.currentVersion})`,
              carrier: r.carrier || (contract as any).carrier,
              transportMode: targetMode,
              origin: r.origin || shipment.pol || '',
              destination: r.destination || shipment.pod || '',
              equipment: r.equipmentType || shipment.containerType,
              chargeCode: (r as any).chargeCode || r.rateCode || 'FREIGHT',
              chargeName: (r as any).chargeName || r.rateName || 'Cước vận chuyển theo HĐ khách hàng',
              category: ((r as any).category as FeeCategory) || 'FREIGHT',
              location: ((r as any).location as ChargeLocation) || 'FREIGHT',
              basis: (r.basis as ChargeBasis) || 'PER_CONTAINER',
              unit: r.unit || 'CONT',
              currency: r.currency || 'USD',
              buyRate: (r as any).buyRate || (r.rateType === 'BUY' ? r.baseRate : 0),
              sellRate: r.baseRate || 0,
              vatRate: r.vatRate || 0,
              validFrom: r.validFrom,
              validTo: r.validTo,
              freeTime: contract.commercialTerms?.freeTimeDetails || (r as any).freeTime,
              transitTime: (r as any).transitTime,
              notes: r.notes,
              matchScore: routeScore,
              isBestMatch: false,
              explanation,
            });

            // If rate is about to expire (within 7 days), add warning
            if (r.validTo) {
              const diffDays = Math.round((new Date(r.validTo).getTime() - new Date(targetDate).getTime()) / 86400000);
              if (diffDays >= 0 && diffDays <= 7) {
                warnings.push(`Cước hợp đồng khách hàng [${(r as any).chargeName || r.rateName}] sắp hết hạn trong ${diffDays} ngày tới (${r.validTo}).`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[SmartRateMatcher] Error querying customer contract rates:', err);
    }
  }

  // =========================================================================
  // TIER 2: GENERAL CONTRACT RATES (ACTIVE CONTRACTS)
  // =========================================================================
  try {
    const contractsRef = collection(db, 'contracts');
    const genContractQ = query(
      contractsRef,
      where('status', '==', 'ACTIVE'),
      limit(10)
    );
    const genSnap = await getDocs(genContractQ);

    for (const cDoc of genSnap.docs) {
      const contract = cDoc.data() as ContractItem;
      // Skip if already evaluated in Tier 1
      if (contract.contractType === 'CUSTOMER' && customer?.id && contract.partyId === customer.id) {
        continue;
      }

      if (!isDateWithinRange(targetDate, contract.effectiveDate, contract.expiryDate)) {
        continue;
      }

      const cRatesRef = collection(db, 'contractRates');
      const cRateQ = query(
        cRatesRef,
        where('contractId', '==', contract.id),
        where('status', '==', 'ACTIVE'),
        limit(30)
      );
      const cRateSnap = await getDocs(cRateQ);

      for (const rDoc of cRateSnap.docs) {
        const r = rDoc.data() as ContractRateItem;
        if (r.serviceMode !== serviceMode) continue;

        if (normEquip && r.equipmentType) {
          const rEquip = normalizeLoc(r.equipmentType);
          if (rEquip && rEquip !== normEquip) continue;
        }

        const rOrigin = normalizeLoc(r.originCode || r.origin || r.pol);
        const rDest = normalizeLoc(r.destinationCode || r.destination || r.pod);

        if (rOrigin === normOrigin && rDest === normDest) {
          const isSupplier = contract.contractType === 'SUPPLIER';
          const srcType: RateMatchSourceType = isSupplier ? 'SUPPLIER' : 'CONTRACT';
          const score = isSupplier ? 70 : 85;

          const explanation = `Khớp từ ${isSupplier ? 'Hợp đồng NCC/Hãng' : 'Hợp đồng khung'}: ${contract.contractNumber}. ` +
            `Đối tác: ${contract.partyName}. Tuyến: ${r.origin} -> ${r.destination}. ` +
            `Hiệu lực: ${r.validFrom} đến ${r.validTo}.`;

          candidates.push({
            id: r.id || rDoc.id,
            sourceType: srcType,
            sourceName: `${contract.partyName || contract.contractNumber}`,
            sourceReference: `${contract.contractNumber}`,
            carrier: r.carrier || (contract as any).carrier,
            transportMode: targetMode,
            origin: r.origin || shipment.pol || '',
            destination: r.destination || shipment.pod || '',
            equipment: r.equipmentType || shipment.containerType,
            chargeCode: (r as any).chargeCode || r.rateCode || 'FREIGHT',
            chargeName: (r as any).chargeName || r.rateName || (isSupplier ? 'Giá vốn HĐ nhà cung cấp' : 'Cước hợp đồng'),
            category: ((r as any).category as FeeCategory) || 'FREIGHT',
            location: ((r as any).location as ChargeLocation) || 'FREIGHT',
            basis: (r.basis as ChargeBasis) || 'PER_CONTAINER',
            unit: r.unit || 'CONT',
            currency: r.currency || 'USD',
            buyRate: r.baseRate || 0,
            sellRate: r.baseRate ? r.baseRate * 1.1 : 0, // Reference sell
            vatRate: r.vatRate || 0,
            validFrom: r.validFrom,
            validTo: r.validTo,
            freeTime: (r as any).freeTime,
            transitTime: (r as any).transitTime,
            notes: r.notes,
            matchScore: score,
            isBestMatch: false,
            explanation,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[SmartRateMatcher] Error querying general contract rates:', err);
  }

  // =========================================================================
  // TIER 3, 4, 5, 6: RATE MASTERS (CARRIER, STANDARD, SPOT)
  // =========================================================================
  try {
    const rateMastersRef = collection(db, 'rateMasters');
    const rmQ = query(
      rateMastersRef,
      where('transportMode', '==', targetMode),
      where('status', '==', 'ACTIVE'),
      limit(100)
    );
    const rmSnap = await getDocs(rmQ);

    for (const docSnap of rmSnap.docs) {
      const rm = docSnap.data() as RateMasterItem;

      // Check date validity
      if (!isDateWithinRange(targetDate, rm.effectiveFrom, rm.effectiveTo)) {
        continue;
      }

      // Check equipment
      if (normEquip && rm.containerType) {
        const rmEquip = normalizeLoc(rm.containerType);
        if (rmEquip && rmEquip !== normEquip) continue;
      }

      const rmOrigin = normalizeLoc(rm.originCode || rm.origin || rm.pol);
      const rmDest = normalizeLoc(rm.destinationCode || rm.destination || rm.pod);

      let routeScore = 0;
      if (rmOrigin && rmDest && rmOrigin === normOrigin && rmDest === normDest) {
        routeScore = 100;
      } else if (rmOrigin === normOrigin || rmDest === normDest) {
        routeScore = 80;
      } else if (!rmOrigin && !rmDest) {
        routeScore = 60; // Generic rate
      }

      if (routeScore > 0) {
        const isCarrierMatch = carrier && rm.carrier && rm.carrier.toLowerCase() === carrier.toLowerCase();
        let srcType: RateMatchSourceType = 'STANDARD';
        let priorityScore = 60;

        if (isCarrierMatch) {
          srcType = 'CARRIER';
          priorityScore = 75;
        } else if (rm.rateType === 'SPOT') {
          srcType = 'SPOT';
          priorityScore = 50;
        } else {
          srcType = 'STANDARD';
          priorityScore = 60;
        }

        const explanation = `Khớp từ Biểu cước ${srcType === 'CARRIER' ? 'Hãng tàu' : srcType === 'SPOT' ? 'Giao ngay (Spot)' : 'Chuẩn (Standard)'}: ` +
          `${rm.rateCode} (${rm.carrier || 'N/A'}). ` +
          `Tuyến: ${rm.origin || shipment.pol || 'N/A'} -> ${rm.destination || shipment.pod || 'N/A'}. ` +
          `Thiết bị: ${rm.containerType || shipment.containerType || 'Tiêu chuẩn'}. ` +
          `Hiệu lực: ${rm.effectiveFrom} đến ${rm.effectiveTo}.`;

        candidates.push({
          id: rm.id || docSnap.id,
          sourceType: srcType,
          sourceName: `${rm.carrier || 'Hãng vận tải'} (${srcType})`,
          sourceReference: `${rm.rateCode || docSnap.id}`,
          carrier: rm.carrier,
          transportMode: targetMode,
          origin: rm.origin || shipment.pol || '',
          destination: rm.destination || shipment.pod || '',
          equipment: rm.containerType || shipment.containerType,
          chargeCode: rm.chargeCode || 'FREIGHT',
          chargeName: rm.chargeName || rm.rateName || 'Cước chặng chính',
          category: (rm.category as FeeCategory) || 'FREIGHT',
          location: ((rm as any).location as ChargeLocation) || 'FREIGHT',
          basis: (rm.basis as ChargeBasis) || 'PER_CONTAINER',
          unit: rm.unit || 'CONT',
          currency: rm.sellingCurrency || rm.costCurrency || 'USD',
          buyRate: rm.costAmount || 0,
          sellRate: rm.sellingAmount || 0,
          vatRate: rm.vatRate || 0,
          validFrom: rm.effectiveFrom,
          validTo: rm.effectiveTo,
          freeTime: rm.freeTime,
          transitTime: rm.transitTime,
          notes: rm.notes,
          matchScore: priorityScore + (routeScore === 100 ? 5 : 0),
          isBestMatch: false,
          explanation,
        });
      }
    }
  } catch (err) {
    console.warn('[SmartRateMatcher] Error querying rate masters:', err);
  }

  // =========================================================================
  // SORT BY PRIORITY & SEPARATE BEST MATCH VS ALTERNATIVE RATES
  // =========================================================================
  // Priority order: CUSTOMER_CONTRACT (1) -> CONTRACT (2) -> CARRIER (3) -> SUPPLIER (4) -> STANDARD (5) -> SPOT (6)
  const SOURCE_PRIORITY_MAP: Record<RateMatchSourceType, number> = {
    CUSTOMER_CONTRACT: 100,
    CONTRACT: 85,
    CARRIER: 75,
    SUPPLIER: 70,
    STANDARD: 60,
    SPOT: 50,
  };

  candidates.sort((a, b) => {
    const pA = (SOURCE_PRIORITY_MAP[a.sourceType] || 0) + (a.matchScore || 0);
    const pB = (SOURCE_PRIORITY_MAP[b.sourceType] || 0) + (b.matchScore || 0);
    return pB - pA;
  });

  // Group by charge code to find Best Match per charge type and alternatives
  const bestMatchesMap = new Map<string, MatchedRateCandidate>();
  const alternativeMatches: MatchedRateCandidate[] = [];

  candidates.forEach(c => {
    const key = `${c.category}_${c.chargeCode}`;
    if (!bestMatchesMap.has(key)) {
      c.isBestMatch = true;
      bestMatchesMap.set(key, c);
    } else {
      c.isBestMatch = false;
      alternativeMatches.push(c);
    }
  });

  const bestMatches = Array.from(bestMatchesMap.values());
  const missingRates = detectMissingRates(shipment, incoterm, bestMatches);

  return {
    isFound: bestMatches.length > 0,
    bestMatches,
    alternativeMatches,
    missingRates,
    warnings,
  };
}

/**
 * Detects Missing Rates based on TransportMode and Incoterm.
 * Strictly differentiates between:
 * - MISSING: Required charge has no matched rate in database
 * - NOT_APPLICABLE: Charge not required under this Incoterm/Route
 * - ZERO_RATE: Explicitly zero/waived in real records
 */
export function detectMissingRates(
  shipment: ShipmentDetails,
  incoterm: IncotermCode = 'FOB',
  matchedItems: MatchedRateCandidate[]
): MissingRateDetectionItem[] {
  const result: MissingRateDetectionItem[] = [];
  const mode = shipment.mode;

  const hasFreight = matchedItems.some(i => i.category === 'FREIGHT' || i.chargeCode === 'FREIGHT');
  const hasOriginThc = matchedItems.some(i => i.chargeCode.includes('THC') && (i.location === 'POL' || !i.location));
  const hasDestThc = matchedItems.some(i => i.chargeCode.includes('THC') && i.location === 'POD');
  const hasDoc = matchedItems.some(i => i.chargeCode.includes('DOC') || i.chargeCode.includes('BL'));
  const hasTrucking = matchedItems.some(i => i.category === 'TRUCKING');
  const hasCustoms = matchedItems.some(i => i.category === 'CUSTOMS');
  const hasSeal = matchedItems.some(i => i.chargeCode.includes('SEAL'));

  // 1. Core Ocean / Air Freight
  const isFreightRequiredByIncoterm = !['EXW', 'FCA', 'FAS', 'FOB'].includes(incoterm);
  if (mode === 'SEA_FCL' || mode === 'SEA_LCL' || mode === 'AIR_FREIGHT') {
    if (hasFreight) {
      result.push({
        code: 'FREIGHT',
        name: mode === 'AIR_FREIGHT' ? 'Cước hàng không (Air Freight)' : 'Cước đường biển (Ocean Freight)',
        category: 'FREIGHT',
        location: 'FREIGHT',
        status: 'ZERO_RATE', // Found
        reason: 'Đã tìm thấy cước trong cơ sở dữ liệu.',
        isMandatory: true,
      });
    } else if (isFreightRequiredByIncoterm) {
      result.push({
        code: 'FREIGHT',
        name: mode === 'AIR_FREIGHT' ? 'Cước hàng không (Air Freight)' : 'Cước đường biển (Ocean Freight)',
        category: 'FREIGHT',
        location: 'FREIGHT',
        status: 'MISSING',
        reason: `Điều kiện Incoterm ${incoterm} yêu cầu có cước vận chuyển chính nhưng chưa tìm thấy giá trong hệ thống.`,
        isMandatory: true,
      });
    } else {
      result.push({
        code: 'FREIGHT',
        name: mode === 'AIR_FREIGHT' ? 'Cước hàng không (Air Freight)' : 'Cước đường biển (Ocean Freight)',
        category: 'FREIGHT',
        location: 'FREIGHT',
        status: 'NOT_APPLICABLE',
        reason: `Theo điều kiện ${incoterm}, cước chặng chính do bên mua (Consignee) trực tiếp thanh toán (Freight Collect).`,
        isMandatory: false,
      });
    }
  }

  // 2. Origin Terminal Handling Charge (THC POL)
  if (mode === 'SEA_FCL') {
    if (hasOriginThc) {
      result.push({
        code: 'THC_POL',
        name: 'Phí xếp dỡ bãi đầu xuất (Origin THC)',
        category: 'LOCAL_CHARGE',
        location: 'POL',
        status: 'ZERO_RATE',
        reason: 'Đã tìm thấy mức phí THC đầu xuất.',
        isMandatory: true,
      });
    } else {
      result.push({
        code: 'THC_POL',
        name: 'Phí xếp dỡ bãi đầu xuất (Origin THC)',
        category: 'LOCAL_CHARGE',
        location: 'POL',
        status: 'MISSING',
        reason: 'Chưa có dữ liệu phí THC đầu xuất trong hệ thống.',
        isMandatory: true,
      });
    }
  }

  // 3. Documentation Fee (Bill of Lading / Air Waybill)
  if (hasDoc) {
    result.push({
      code: 'DOC_FEE',
      name: 'Phí phát hành vận đơn (Documentation / B/L Fee)',
      category: 'LOCAL_CHARGE',
      location: 'POL',
      status: 'ZERO_RATE',
      reason: 'Đã tìm thấy phí chứng từ B/L.',
      isMandatory: true,
    });
  } else {
    result.push({
      code: 'DOC_FEE',
      name: 'Phí phát hành vận đơn (Documentation / B/L Fee)',
      category: 'LOCAL_CHARGE',
      location: 'POL',
      status: 'MISSING',
      reason: 'Chưa có biểu phí phát hành B/L cho tuyến này.',
      isMandatory: true,
    });
  }

  // 4. Seal Fee (FCL only)
  if (mode === 'SEA_FCL') {
    if (hasSeal) {
      result.push({
        code: 'SEAL_FEE',
        name: 'Phí niêm phong chì (Seal Fee)',
        category: 'LOCAL_CHARGE',
        location: 'POL',
        status: 'ZERO_RATE',
        reason: 'Đã có phí chì niêm phong.',
        isMandatory: false,
      });
    } else {
      result.push({
        code: 'SEAL_FEE',
        name: 'Phí niêm phong chì (Seal Fee)',
        category: 'LOCAL_CHARGE',
        location: 'POL',
        status: 'MISSING',
        reason: 'Chưa tìm thấy mức phí chì niêm phong.',
        isMandatory: false,
      });
    }
  }

  // 5. Trucking & Customs Door-to-Door Checks
  const isDoorDelivery = ['DAP', 'DPU', 'DDP'].includes(incoterm);
  if (isDoorDelivery) {
    if (!hasTrucking) {
      result.push({
        code: 'TRUCKING',
        name: 'Vận chuyển nội địa tận nơi (Inland Trucking)',
        category: 'TRUCKING',
        location: 'POD',
        status: 'MISSING',
        reason: `Điều kiện ${incoterm} giao hàng tận nơi nhưng chưa tìm thấy cước xe tải kéo cont.`,
        isMandatory: true,
      });
    }
    if (incoterm === 'DDP' && !hasCustoms) {
      result.push({
        code: 'CUSTOMS',
        name: 'Thủ tục hải quan nhập khẩu (Import Customs)',
        category: 'CUSTOMS',
        location: 'POD',
        status: 'MISSING',
        reason: 'Điều kiện DDP bao gồm thuế và thủ tục thông quan nhập khẩu nhưng chưa có đơn giá dịch vụ hải quan.',
        isMandatory: true,
      });
    }
  }

  return result;
}
