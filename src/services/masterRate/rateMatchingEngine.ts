import { 
  RateMasterItem, 
  RateMatchQueryCriteria, 
  RateMatchOutcome, 
  RateSearchResult, 
  MissingRateEvent 
} from '../../types/masterRate';
import { searchMatchingRates } from './rateSearchEngine';
import { detectMatchingConflict, detectRateOverlap } from './rateIdentityService';

/**
 * In-memory buffer or persistence hook for missing rate events to notify pricing teams
 */
const missingRateEventsCache: MissingRateEvent[] = [];

/**
 * Records a missing rate query event if no applicable rate is found.
 * Deduplicates by lane + mode + equipment.
 */
export function logMissingRateEvent(criteria: RateMatchQueryCriteria, requestedBy: string = 'SALES_QUOTATION'): MissingRateEvent {
  const laneKey = `${criteria.transportMode}_${criteria.origin}_${criteria.destination}_${criteria.equipment || 'ANY'}`.toUpperCase();
  
  const existing = missingRateEventsCache.find(
    e => `${e.transportMode}_${e.origin}_${e.destination}_${e.equipment || 'ANY'}`.toUpperCase() === laneKey &&
         e.status === 'PENDING'
  );

  const now = new Date().toISOString();

  if (existing) {
    existing.hitCount += 1;
    existing.lastRequestedAt = now;
    return existing;
  }

  const newEvent: MissingRateEvent = {
    id: `mre-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    companyId: criteria.companyId,
    transportMode: criteria.transportMode,
    serviceType: criteria.serviceType,
    origin: criteria.origin,
    destination: criteria.destination,
    equipment: criteria.equipment,
    carrier: criteria.carrier,
    requestedDate: criteria.effectiveDate || now.slice(0, 10),
    requestedBy,
    hitCount: 1,
    createdAt: now,
    lastRequestedAt: now,
    status: 'PENDING',
    notes: `Hệ thống ghi nhận tuyến chưa có giá Master: ${criteria.origin} -> ${criteria.destination} (${criteria.transportMode})`,
  };

  missingRateEventsCache.unshift(newEvent);
  return newEvent;
}

export function getMissingRateEvents(): MissingRateEvent[] {
  return [...missingRateEventsCache];
}

export function resolveMissingRateEvent(id: string): void {
  const target = missingRateEventsCache.find(e => e.id === id);
  if (target) {
    target.status = 'RESOLVED';
  }
}

/**
 * Advanced Rate Matching Engine for Phase 13
 * Strictly executes prioritized multi-tier lookup:
 * Tier 1: Customer-specific Contract
 * Tier 2: Carrier Direct Contract
 * Tier 3: Supplier / Vendor Contract
 * Tier 4: Spot Rate
 * Tier 5: General Default Rate
 * 
 * Enforces NO SILENT FALLBACK and detects conflicts/overlaps.
 */
export function executeRateMatching(
  rates: RateMasterItem[],
  criteria: RateMatchQueryCriteria,
  recordMissingEvent: boolean = true
): RateMatchOutcome {
  const searchDate = criteria.effectiveDate || new Date().toISOString().slice(0, 10);

  // 1. Search matching rates via search engine
  const searchResponse = searchMatchingRates(rates, {
    transportMode: criteria.transportMode,
    serviceType: criteria.serviceType,
    rateType: criteria.rateType,
    origin: criteria.origin,
    destination: criteria.destination,
    carrier: criteria.carrier,
    supplierId: criteria.supplierId,
    containerType: criteria.equipment,
    customerCode: criteria.customerCode,
    currency: criteria.currency,
    date: searchDate,
    status: 'ACTIVE',
  });

  const validCandidates = searchResponse.activeMatches;

  // 2. No applicable rate found -> NO SILENT FALLBACK
  if (validCandidates.length === 0) {
    let missingLogged = false;
    if (recordMissingEvent && criteria.origin && criteria.destination) {
      logMissingRateEvent(criteria);
      missingLogged = true;
    }

    return {
      status: 'NO_APPLICABLE_RATE_FOUND',
      bestMatch: undefined,
      matchingCandidates: [],
      conflictRates: undefined,
      conflictReason: 'Không tìm thấy bảng giá hợp lệ (Active) còn hiệu lực khớp với tiêu chí tuyến đường và thời gian.',
      queryCriteria: criteria,
      missingRateEventLogged: missingLogged,
    };
  }

  // 3. Check for conflict among top candidates
  const conflictCheck = detectMatchingConflict(validCandidates);
  if (conflictCheck.hasConflict) {
    return {
      status: 'RATE_CONFLICT',
      bestMatch: validCandidates[0],
      matchingCandidates: validCandidates,
      conflictRates: conflictCheck.conflictRates,
      conflictReason: conflictCheck.reason,
      queryCriteria: criteria,
      missingRateEventLogged: false,
    };
  }

  // 4. Check best match for potential date overlap with other rates of the same carrier/lane
  const best = validCandidates[0];
  const overlapCheck = detectRateOverlap(best.rate, rates);
  if (overlapCheck.hasOverlap && overlapCheck.overlappingRates.length > 0) {
    // If there's an overlap with another active rate, flag it
    const activeOverlaps = overlapCheck.overlappingRates.filter(r => r.id !== best.rate.id && r.status === 'ACTIVE');
    if (activeOverlaps.length > 0) {
      return {
        status: 'RATE_OVERLAP_CONFLICT',
        bestMatch: best,
        matchingCandidates: validCandidates,
        conflictRates: [best.rate, ...activeOverlaps],
        conflictReason: `Cảnh báo: Bảng giá ${best.rate.rateCode} bị trùng lặp thời gian hiệu lực với ${activeOverlaps.map(r => r.rateCode).join(', ')}.`,
        queryCriteria: criteria,
        missingRateEventLogged: false,
      };
    }
  }

  // 5. Successful match
  return {
    status: 'MATCH_FOUND',
    bestMatch: best,
    matchingCandidates: validCandidates,
    queryCriteria: criteria,
    missingRateEventLogged: false,
  };
}
