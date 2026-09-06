import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { ContractItem, ContractRateItem } from '../../types/contract';
import { RateMasterItem } from '../../types/masterRate';
import { LineItem, TransportMode, ContainerType, IncotermCode, Currency } from '../../types/logistics';
import { saveMissingRateEventToFirestore } from '../firebase/firestoreService';

export interface RateResolutionRequest {
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  carrier?: string;
  origin: string;              // e.g. "Cat Lai", "VNSGN"
  destination: string;         // e.g. "Los Angeles", "USLAX"
  mode: TransportMode;         // 'SEA_FCL' | 'SEA_LCL' | 'AIR_FREIGHT' | 'INLAND_TRUCKING' | 'CUSTOMS_CLEARANCE'
  equipment?: ContainerType | string;
  incoterm?: IncotermCode;
  weightKg?: number;
  volumeCbm?: number;
  quantity?: number;
  shipmentDate?: string;       // YYYY-MM-DD
}

export interface RateResolutionResult {
  isFound: boolean;
  priceSource: 'CUSTOMER_CONTRACT' | 'SUPPLIER_CONTRACT' | 'STANDARD_RATE' | 'SPOT_RATE' | 'MANUAL';
  sellUnitPrice: number;
  costUnitPrice: number;
  currency: Currency;
  vatRate: number;
  unit: string;
  basis: any;
  sourceContractId?: string;
  sourceContractNumber?: string;
  sourceVersion?: number | string;
  sourceRateId?: string;
  priceTraceability: string;
  freeTime?: string;
  transitTime?: string;
  surcharges?: {
    code: string;
    name: string;
    amount: number;
    currency: Currency;
    basis: any;
    unit: string;
  }[];
  notes?: string;
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
 * Normalizes location codes for comparison (removes punctuation, uppercase)
 */
function normalizeLoc(loc?: string): string {
  if (!loc) return '';
  return loc.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Resolves pricing for a Quotation request following the strict Rate Priority Engine:
 * 1. Customer Contract Rate (Priority 100/90/80)
 * 2. Supplier Contract Rate (for Cost Price)
 * 3. Standard Master Rate
 * 4. Spot Rate
 * 5. Missing Rate Event Logging
 */
export async function resolveQuotationPricing(
  req: RateResolutionRequest,
  availableMasterRates: RateMasterItem[] = []
): Promise<RateResolutionResult> {
  const shipmentDate = req.shipmentDate || new Date().toISOString().slice(0, 10);
  const serviceMode = mapModeToServiceMode(req.mode);
  const normOrigin = normalizeLoc(req.origin);
  const normDest = normalizeLoc(req.destination);
  const normEquip = normalizeLoc(req.equipment);

  let bestCustomerRate: ContractRateItem | null = null;
  let parentCustomerContract: ContractItem | null = null;
  let bestScore = -1;

  // =========================================================================
  // TIER 1: LOOKUP CUSTOMER CONTRACT (SELL RATE)
  // =========================================================================
  if (req.customerId && db) {
    try {
      // Find Active Customer Contracts for this customer
      const contractsRef = collection(db, 'contracts');
      const contractQ = query(
        contractsRef,
        where('contractType', '==', 'CUSTOMER'),
        where('partyId', '==', req.customerId),
        where('status', '==', 'ACTIVE'),
        limit(5)
      );
      const contractSnap = await getDocs(contractQ);

      for (const cDoc of contractSnap.docs) {
        const contract = cDoc.data() as ContractItem;
        // Check date validity of contract
        if (contract.effectiveDate <= shipmentDate && contract.expiryDate >= shipmentDate) {
          // Fetch candidate rates for this contract
          const ratesRef = collection(db, 'contractRates');
          const rateQ = query(
            ratesRef,
            where('contractId', '==', contract.id),
            where('status', '==', 'ACTIVE'),
            limit(50)
          );
          const rateSnap = await getDocs(rateQ);

          for (const rDoc of rateSnap.docs) {
            const rate = rDoc.data() as ContractRateItem;

            // Check rate validity period
            if (rate.validFrom > shipmentDate || rate.validTo < shipmentDate) {
              continue;
            }

            // Check service mode
            if (rate.serviceMode !== serviceMode) {
              continue;
            }

            // Check equipment (if applicable)
            if (normEquip && rate.equipmentType) {
              const rateEquipNorm = normalizeLoc(rate.equipmentType);
              if (rateEquipNorm && rateEquipNorm !== normEquip) {
                continue;
              }
            }

            // Route scoring
            const rateOrigin = normalizeLoc(rate.originCode || rate.origin || rate.pol);
            const rateDest = normalizeLoc(rate.destinationCode || rate.destination || rate.pod);

            let score = 0;
            if (rateOrigin === normOrigin && rateDest === normDest) {
              score = 100; // Exact POL & POD
            } else if (
              (rate.originCountry && normOrigin.includes(normalizeLoc(rate.originCountry))) &&
              (rate.destinationCountry && normDest.includes(normalizeLoc(rate.destinationCountry)))
            ) {
              score = 90; // Country level match
            } else if (rateOrigin === normOrigin || rateDest === normDest) {
              score = 80; // Single end match
            }

            if (score > bestScore) {
              bestScore = score;
              bestCustomerRate = rate;
              parentCustomerContract = contract;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error during customer contract lookup in Resolver:', err);
    }
  }

  // =========================================================================
  // TIER 2: LOOKUP SUPPLIER CONTRACT (BUY / COST RATE)
  // =========================================================================
  let bestSupplierRate: ContractRateItem | null = null;
  let parentSupplierContract: ContractItem | null = null;

  if (db) {
    try {
      const supplierContractsRef = collection(db, 'contracts');
      const suppQConstraints: any[] = [
        where('contractType', '==', 'SUPPLIER'),
        where('status', '==', 'ACTIVE'),
      ];
      if (req.supplierId) {
        suppQConstraints.push(where('partyId', '==', req.supplierId));
      }
      suppQConstraints.push(limit(5));

      const suppContractSnap = await getDocs(query(supplierContractsRef, ...suppQConstraints));

      for (const scDoc of suppContractSnap.docs) {
        const sContract = scDoc.data() as ContractItem;
        if (sContract.effectiveDate <= shipmentDate && sContract.expiryDate >= shipmentDate) {
          const sRatesRef = collection(db, 'contractRates');
          const sRateQ = query(
            sRatesRef,
            where('contractId', '==', sContract.id),
            where('status', '==', 'ACTIVE'),
            limit(30)
          );
          const sRateSnap = await getDocs(sRateQ);

          for (const srDoc of sRateSnap.docs) {
            const sRate = srDoc.data() as ContractRateItem;
            if (sRate.validFrom <= shipmentDate && sRate.validTo >= shipmentDate) {
              if (sRate.serviceMode === serviceMode) {
                const sRateOrigin = normalizeLoc(sRate.originCode || sRate.origin || sRate.pol);
                const sRateDest = normalizeLoc(sRate.destinationCode || sRate.destination || sRate.pod);
                if (sRateOrigin === normOrigin && sRateDest === normDest) {
                  bestSupplierRate = sRate;
                  parentSupplierContract = sContract;
                  break;
                }
              }
            }
          }
          if (bestSupplierRate) break;
        }
      }
    } catch (err) {
      console.warn('Error during supplier contract cost lookup:', err);
    }
  }

  // =========================================================================
  // CALCULATE SELLING & COST RATES
  // =========================================================================
  if (bestCustomerRate && parentCustomerContract) {
    let sellPrice = bestCustomerRate.baseRate;

    // Handle AIR Weight Breaks if provided
    if (serviceMode === 'AIR' && req.weightKg && bestCustomerRate.weightBreaks) {
      const wKg = req.weightKg;
      const matchedBreak = bestCustomerRate.weightBreaks.find(wb => {
        const minW = wb.minWeightKg;
        const maxW = wb.maxWeightKg ?? Infinity;
        return wKg >= minW && wKg < maxW;
      });
      if (matchedBreak) {
        sellPrice = matchedBreak.ratePerKg;
      }
    }

    const costPrice = bestSupplierRate ? bestSupplierRate.baseRate : 0;
    const versionLabel = `V${parentCustomerContract.currentVersion}`;
    const traceability = `Hợp đồng KH: ${parentCustomerContract.contractNumber} (${versionLabel}) - Tuyến: ${bestCustomerRate.origin} -> ${bestCustomerRate.destination} | Hiệu lực: ${bestCustomerRate.validFrom} đến ${bestCustomerRate.validTo}`;

    return {
      isFound: true,
      priceSource: 'CUSTOMER_CONTRACT',
      sellUnitPrice: sellPrice,
      costUnitPrice: costPrice,
      currency: bestCustomerRate.currency,
      vatRate: bestCustomerRate.vatRate ?? 0,
      unit: bestCustomerRate.unit,
      basis: bestCustomerRate.basis,
      sourceContractId: parentCustomerContract.id,
      sourceContractNumber: parentCustomerContract.contractNumber,
      sourceVersion: parentCustomerContract.currentVersion,
      sourceRateId: bestCustomerRate.id,
      priceTraceability: traceability,
      freeTime: parentCustomerContract.commercialTerms.freeTimeDetails,
      surcharges: bestCustomerRate.surcharges?.map(s => ({
        code: s.code,
        name: s.name,
        amount: s.amount,
        currency: s.currency,
        basis: s.basis,
        unit: s.unit,
      })),
      notes: bestCustomerRate.notes,
    };
  }

  // =========================================================================
  // TIER 3 & 4: FALLBACK TO MASTER RATES (STANDARD / SPOT)
  // =========================================================================
  const validMasterRates = availableMasterRates.filter(r => 
    r.status === 'ACTIVE' && 
    r.effectiveFrom <= shipmentDate && 
    r.effectiveTo >= shipmentDate &&
    r.transportMode === req.mode
  );

  const matchedMaster = validMasterRates.find(r => {
    const o = normalizeLoc(r.originCode || r.origin || r.pol);
    const d = normalizeLoc(r.destinationCode || r.destination || r.pod);
    return o === normOrigin && d === normDest;
  });

  if (matchedMaster) {
    const isSpot = matchedMaster.rateType === 'SPOT';
    const sourceLabel = isSpot ? 'SPOT_RATE' : 'STANDARD_RATE';
    const traceability = `Biểu cước ${isSpot ? 'Spot' : 'Chuẩn'}: ${matchedMaster.rateCode} (${matchedMaster.carrier}) | Hiệu lực: ${matchedMaster.effectiveFrom} đến ${matchedMaster.effectiveTo}`;

    return {
      isFound: true,
      priceSource: sourceLabel,
      sellUnitPrice: matchedMaster.sellingAmount,
      costUnitPrice: matchedMaster.costAmount,
      currency: matchedMaster.sellingCurrency,
      vatRate: matchedMaster.vatRate ?? 0,
      unit: matchedMaster.unit,
      basis: matchedMaster.basis,
      sourceRateId: matchedMaster.id,
      sourceContractNumber: matchedMaster.contractNo,
      sourceVersion: matchedMaster.version,
      priceTraceability: traceability,
      freeTime: matchedMaster.freeTime,
      transitTime: matchedMaster.transitTime,
      notes: matchedMaster.notes,
    };
  }

  // =========================================================================
  // TIER 5: MISSING RATE EVENT LOGGING
  // =========================================================================
  if (req.origin && req.destination) {
    const nowIso = new Date().toISOString();
    saveMissingRateEventToFirestore({
      id: `missing-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      transportMode: req.mode,
      origin: req.origin,
      destination: req.destination,
      equipment: typeof req.equipment === 'string' ? req.equipment : undefined,
      requestedDate: req.shipmentDate || nowIso.slice(0, 10),
      requestedBy: req.customerName || 'Sales User',
      hitCount: 1,
      createdAt: nowIso,
      lastRequestedAt: nowIso,
      status: 'PENDING',
      notes: `Live rate lookup missed for ${req.customerName || req.customerId || 'Unknown'}`,
    }).catch(e => console.warn('Could not record missing rate event:', e));
  }

  return {
    isFound: false,
    priceSource: 'MANUAL',
    sellUnitPrice: 0,
    costUnitPrice: 0,
    currency: 'USD',
    vatRate: 0,
    unit: 'Container',
    basis: 'PER_CONTAINER',
    priceTraceability: 'Chưa có biểu cước hợp đồng hoặc cước chuẩn phù hợp (Cần nhập tay hoặc hỏi Pricing)',
  };
}

/**
 * Applies resolved contract pricing to a quotation LineItem
 */
export function applyContractPricingToLineItem(
  lineItem: LineItem,
  resolved: RateResolutionResult
): LineItem {
  return {
    ...lineItem,
    unitPrice: resolved.sellUnitPrice > 0 ? resolved.sellUnitPrice : lineItem.unitPrice,
    costPrice: resolved.costUnitPrice > 0 ? resolved.costUnitPrice : lineItem.costPrice,
    currency: resolved.currency || lineItem.currency,
    vatRate: resolved.vatRate !== undefined ? resolved.vatRate : lineItem.vatRate,
    unit: resolved.unit || lineItem.unit,
    priceSource: resolved.priceSource,
    sourceId: resolved.sourceContractId || resolved.sourceRateId,
    sourceContractNumber: resolved.sourceContractNumber,
    sourceVersion: resolved.sourceVersion,
    sourceRateId: resolved.sourceRateId,
    priceTraceability: resolved.priceTraceability,
    freeTime: resolved.freeTime || lineItem.freeTime,
    transitTime: resolved.transitTime || lineItem.transitTime,
  };
}
