import { 
  RateMasterItem, 
  RateSearchParams, 
  RateSearchResult, 
  MatchQuality, 
  MatchingPriorityLevel 
} from '../../types/masterRate';

/**
 * Normalizes string for fuzzy/case-insensitive comparison
 */
function normalizeText(text: string | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if query string is contained in target string loosely
 */
function looseMatch(queryStr: string | undefined, targetStr: string | undefined): boolean {
  if (!queryStr || queryStr.trim() === '') return true;
  if (!targetStr) return false;
  const nQuery = normalizeText(queryStr);
  const nTarget = normalizeText(targetStr);
  return nTarget.includes(nQuery) || nQuery.includes(nTarget);
}

/**
 * Core Rate Search Engine for Freight Forwarding Quotation & Cost Management
 * Implements multi-tier matching (Contract > Lane > Carrier/Supplier > Generic) and As-Of-Date validity verification.
 */
export function searchMatchingRates(
  allRates: RateMasterItem[],
  params: RateSearchParams
): {
  activeMatches: RateSearchResult[];
  expiredMatches: RateSearchResult[];
  futureMatches: RateSearchResult[];
  allFound: RateSearchResult[];
  totalMatches: number;
} {
  const checkDate = params.date || new Date().toISOString().slice(0, 10);
  const checkTime = new Date(checkDate).getTime();
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

  const results: RateSearchResult[] = [];

  allRates.forEach((rate) => {
    // Basic filter by status if explicitly requested
    if (params.status && params.status !== 'ALL') {
      if (params.status === 'ACTIVE' && rate.status !== 'ACTIVE' && rate.status !== 'APPROVED') {
        return;
      } else if (params.status !== 'ACTIVE' && rate.status !== params.status) {
        return;
      }
    } else if (rate.status === 'CANCELLED') {
      return; // Never show cancelled rates unless specifically asked
    }

    // Rate Type filter (BUY / SELL / CONTRACT / REFERENCE)
    if (params.rateType && params.rateType !== 'ALL' && rate.rateType !== params.rateType) {
      return;
    }

    // Service Type filter
    if (params.serviceType && params.serviceType !== 'ALL' && rate.serviceType !== params.serviceType) {
      return;
    }

    // Currency filter
    if (params.currency && rate.sellingCurrency !== params.currency && rate.costCurrency !== params.currency) {
      return;
    }

    // Keyword filter across code, name, carrier, notes
    if (params.keyword && params.keyword.trim() !== '') {
      const kw = params.keyword.trim();
      const matchKw = 
        looseMatch(kw, rate.rateCode) ||
        looseMatch(kw, rate.rateName) ||
        looseMatch(kw, rate.chargeName) ||
        looseMatch(kw, rate.chargeCode) ||
        looseMatch(kw, rate.carrier) ||
        looseMatch(kw, rate.supplierName) ||
        looseMatch(kw, rate.origin) ||
        looseMatch(kw, rate.destination) ||
        looseMatch(kw, rate.contractNo) ||
        looseMatch(kw, rate.notes);
      if (!matchKw) return;
    }

    // Transport Mode filter
    const modeMatches = !params.transportMode || params.transportMode === 'ALL' || rate.transportMode === params.transportMode;
    if (!modeMatches) return;

    // Check validity window
    const fromTime = new Date(rate.effectiveFrom).getTime();
    const toTime = new Date(rate.effectiveTo).getTime();
    const isValidWindow = checkTime >= fromTime && checkTime <= toTime;
    const isExpired = checkTime > toTime || rate.status === 'EXPIRED';
    const isFutureRate = checkTime < fromTime;
    const isExpiringSoon = !isExpired && (toTime - checkTime <= fourteenDaysMs) && (toTime >= checkTime);

    // Calculate match score
    let score = 0;
    let quality: MatchQuality = 'GENERAL_RATE';
    let priority: MatchingPriorityLevel = 5;
    const matchReasonsVi: string[] = [];
    const matchReasonsEn: string[] = [];

    // 0. Customer Contract Match (Top Priority)
    if (params.customerCode && rate.customerCode && looseMatch(params.customerCode, rate.customerCode)) {
      score += 45;
      priority = 1;
      quality = 'CONTRACT_MATCH';
      matchReasonsVi.push(`Hợp đồng riêng của khách hàng [${rate.customerCode}]`);
      matchReasonsEn.push(`Customer specific contract rate [${rate.customerCode}]`);
    } else if (rate.isContractRate) {
      score += 10;
    }

    // 1. Route match (Origin + Destination)
    const originMatch = looseMatch(params.origin, rate.origin) || looseMatch(params.origin, rate.originPort) || looseMatch(params.origin, rate.originCode);
    const destMatch = looseMatch(params.destination, rate.destination) || looseMatch(params.destination, rate.destinationPort) || looseMatch(params.destination, rate.destinationCode);

    if (params.origin && params.destination) {
      if (originMatch && destMatch) {
        score += 35;
        if (priority > 2) priority = 2;
        if (quality === 'GENERAL_RATE') quality = 'EXACT_MATCH';
        matchReasonsVi.push(`Khớp chính xác tuyến đường (${rate.origin} -> ${rate.destination})`);
        matchReasonsEn.push(`Exact lane matched (${rate.origin} -> ${rate.destination})`);
      } else if (originMatch || destMatch) {
        score += 15;
        if (priority > 4) priority = 4;
        if (quality === 'GENERAL_RATE') quality = 'ROUTE_MATCH';
        matchReasonsVi.push(`Khớp một phần cảng/tuyến (${originMatch ? rate.origin : rate.destination})`);
        matchReasonsEn.push(`Partial port/lane matched (${originMatch ? rate.origin : rate.destination})`);
      }
    } else if (params.origin && originMatch) {
      score += 15;
      matchReasonsVi.push(`Khớp điểm đi (${rate.origin})`);
      matchReasonsEn.push(`Origin matched (${rate.origin})`);
    } else if (params.destination && destMatch) {
      score += 15;
      matchReasonsVi.push(`Khớp điểm đến (${rate.destination})`);
      matchReasonsEn.push(`Destination matched (${rate.destination})`);
    }

    // 2. Carrier or Supplier match
    if (params.carrier && looseMatch(params.carrier, rate.carrier)) {
      score += 15;
      if (priority > 3) priority = 3;
      if (quality === 'GENERAL_RATE') quality = 'CARRIER_MATCH';
      matchReasonsVi.push(`Khớp hãng tàu/hàng không (${rate.carrier})`);
      matchReasonsEn.push(`Carrier matched (${rate.carrier})`);
    }
    if (params.supplierId && rate.supplierId === params.supplierId) {
      score += 15;
      matchReasonsVi.push(`Khớp nhà cung cấp đã chọn`);
      matchReasonsEn.push(`Supplier matched`);
    }

    // 3. Equipment match (Container Type)
    if (params.containerType && rate.containerType) {
      if (params.containerType === rate.containerType) {
        score += 15;
        matchReasonsVi.push(`Khớp loại thiết bị/container (${rate.containerType})`);
        matchReasonsEn.push(`Equipment/Container matched (${rate.containerType})`);
      }
    }

    // 4. Validity bonus
    if (isValidWindow) {
      score += 10;
    } else if (isExpired) {
      score = Math.max(0, score - 30);
    }

    // If query has specific parameters and score is 0, skip
    const hasSearchFilters = params.origin || params.destination || params.carrier || params.containerType || params.keyword;
    if (hasSearchFilters && score < 15) {
      return;
    }

    const matchReasonVi = matchReasonsVi.length > 0 ? matchReasonsVi.join(' • ') : 'Bảng giá cước chung';
    const matchReasonEn = matchReasonsEn.length > 0 ? matchReasonsEn.join(' • ') : 'General master rate';

    results.push({
      rate,
      matchScore: Math.min(100, Math.max(0, score)),
      matchQuality: quality,
      priorityLevel: priority,
      matchReasonVi,
      matchReasonEn,
      isExpired,
      isExpiringSoon,
      isFutureRate,
      isValidForDate: isValidWindow,
    });
  });

  // Sort by Priority ascending (1 > 2 > 3 > 4 > 5), then Match Score descending
  results.sort((a, b) => {
    if (a.priorityLevel !== b.priorityLevel) {
      return a.priorityLevel - b.priorityLevel;
    }
    return b.matchScore - a.matchScore;
  });

  const activeMatches = results.filter(r => !r.isExpired && !r.isFutureRate);
  const expiredMatches = results.filter(r => r.isExpired);
  const futureMatches = results.filter(r => r.isFutureRate);

  return {
    activeMatches,
    expiredMatches,
    futureMatches,
    allFound: results,
    totalMatches: results.length,
  };
}
