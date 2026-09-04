import { 
  RateMasterItem, 
  RateSearchContext, 
  RateSearchResult, 
  SmartRateScanResult, 
  SmartRateCategoryGroup,
  MatchQuality,
  MatchingPriorityLevel
} from '../../types/masterRate';
import { FeeCategory, ChargeLocation } from '../../types/logistics';

/**
 * Normalizes text for clean fuzzy and case-insensitive comparison
 */
export function normalizeText(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Checks loose substring matching in both directions
 */
export function looseMatch(queryStr: string | undefined | null, targetStr: string | undefined | null): boolean {
  if (!queryStr || queryStr.trim() === '') return true;
  if (!targetStr) return false;
  const nQuery = normalizeText(queryStr);
  const nTarget = normalizeText(targetStr);
  if (!nQuery || !nTarget) return false;
  return nTarget.includes(nQuery) || nQuery.includes(nTarget);
}

/**
 * Extract weight break threshold if present in rate string or code (e.g. "+100KG", "MIN", "+300KG")
 */
function matchAirWeightBreak(rate: RateMasterItem, chargeableWeightKg?: number): { matched: boolean; bonus: number; reason?: string } {
  if (!chargeableWeightKg || chargeableWeightKg <= 0) return { matched: true, bonus: 0 };

  const textToScan = `${rate.rateCode} ${rate.rateName} ${rate.chargeName} ${rate.unit} ${rate.notes || ''}`.toUpperCase();
  
  // Check weight breaks: +1000, +500, +300, +100, +45, MIN
  if (textToScan.includes('+1000') || textToScan.includes('1000KG') || textToScan.includes('+1000KG')) {
    if (chargeableWeightKg >= 1000) return { matched: true, bonus: 25, reason: 'Weight Break +1000KG matched' };
    return { matched: false, bonus: -30, reason: 'Weight break requires >= 1000KG' };
  }
  if (textToScan.includes('+500') || textToScan.includes('500KG') || textToScan.includes('+500KG')) {
    if (chargeableWeightKg >= 500) return { matched: true, bonus: 25, reason: 'Weight Break +500KG matched' };
    return { matched: false, bonus: -25, reason: 'Weight break requires >= 500KG' };
  }
  if (textToScan.includes('+300') || textToScan.includes('300KG') || textToScan.includes('+300KG')) {
    if (chargeableWeightKg >= 300) return { matched: true, bonus: 25, reason: 'Weight Break +300KG matched' };
    return { matched: false, bonus: -25, reason: 'Weight break requires >= 300KG' };
  }
  if (textToScan.includes('+100') || textToScan.includes('100KG') || textToScan.includes('+100KG')) {
    if (chargeableWeightKg >= 100) return { matched: true, bonus: 20, reason: 'Weight Break +100KG matched' };
    return { matched: false, bonus: -20, reason: 'Weight break requires >= 100KG' };
  }
  if (textToScan.includes('+45') || textToScan.includes('45KG') || textToScan.includes('+45KG')) {
    if (chargeableWeightKg >= 45) return { matched: true, bonus: 15, reason: 'Weight Break +45KG matched' };
    return { matched: false, bonus: -15, reason: 'Weight break requires >= 45KG' };
  }

  return { matched: true, bonus: 5 };
}

/**
 * Evaluates single RateMasterItem against the RateSearchContext
 * Returns structured RateSearchResult with exact match score and multi-tier priority level.
 */
export function evaluateRateMatch(rate: RateMasterItem, context: RateSearchContext): RateSearchResult | null {
  const checkDate = context.quotationDate || new Date().toISOString().slice(0, 10);
  const checkTime = new Date(checkDate).getTime();

  // Status Filter
  if (context.status && context.status !== 'ALL' && rate.status !== context.status) {
    return null;
  }

  // Validity Check
  const fromTime = rate.effectiveFrom ? new Date(rate.effectiveFrom).getTime() : 0;
  const toTime = rate.effectiveTo ? new Date(rate.effectiveTo).getTime() : Number.MAX_SAFE_INTEGER;
  const isValidWindow = checkTime >= fromTime && checkTime <= toTime;
  const isExpired = checkTime > toTime || rate.status === 'EXPIRED';
  const isValidForDate = isValidWindow && rate.status === 'ACTIVE';

  // Expiring soon check (within 14 days)
  const fourteenDaysMs = 14 * 86400000;
  const isExpiringSoon = isValidForDate && (toTime - checkTime <= fourteenDaysMs);

  // Keyword check
  if (context.keyword && context.keyword.trim() !== '') {
    const kw = context.keyword.trim();
    const matchKw = 
      looseMatch(kw, rate.rateCode) ||
      looseMatch(kw, rate.rateName) ||
      looseMatch(kw, rate.chargeName) ||
      looseMatch(kw, rate.chargeCode) ||
      looseMatch(kw, rate.carrier) ||
      looseMatch(kw, rate.origin) ||
      looseMatch(kw, rate.destination) ||
      looseMatch(kw, rate.notes);
    if (!matchKw) return null;
  }

  // Fee Category filter if specified
  if (context.chargeCategory && rate.category !== context.chargeCategory) {
    return null;
  }

  // Transport Mode matching
  if (context.transportMode && context.transportMode !== 'ALL') {
    const isModeMatch = rate.transportMode === context.transportMode || rate.transportMode === 'MULTIMODAL';
    if (!isModeMatch) {
      return null;
    }
  }

  let score = 0;
  let priorityLevel: MatchingPriorityLevel = 5;
  let matchQuality: MatchQuality = 'GENERAL_RATE';
  const reasonsVi: string[] = [];
  const reasonsEn: string[] = [];

  // Effective POL and POD
  const originQuery = context.origin || context.pol || '';
  const destQuery = context.destination || context.pod || '';

  // 1. Route Matching
  const originMatches = originQuery ? (looseMatch(originQuery, rate.origin) || looseMatch(originQuery, rate.originPort)) : false;
  const destMatches = destQuery ? (looseMatch(destQuery, rate.destination) || looseMatch(destQuery, rate.destinationPort)) : false;

  const isFullRouteMatch = Boolean(originQuery && destQuery && originMatches && destMatches);
  const isPartialRouteMatch = Boolean((originQuery && originMatches) || (destQuery && destMatches));

  if (isFullRouteMatch) {
    score += 40;
    priorityLevel = 4;
    matchQuality = 'ROUTE_MATCH';
    reasonsVi.push(`Khớp chính xác tuyến đường (${rate.origin} → ${rate.destination})`);
    reasonsEn.push(`Exact route matched (${rate.origin} → ${rate.destination})`);
  } else if (isPartialRouteMatch) {
    score += 18;
    reasonsVi.push(`Khớp một phần cảng/tuyến (${originMatches ? rate.origin : rate.destination})`);
    reasonsEn.push(`Partial route/port matched (${originMatches ? rate.origin : rate.destination})`);
  }

  // 2. Equipment / Container Type Matching (FCL strictness)
  const isEquipmentMismatch = Boolean(
    context.containerType && 
    rate.containerType && 
    normalizeText(context.containerType) !== normalizeText(rate.containerType)
  );

  // If container is incompatible for FCL freight, filter out
  if (isEquipmentMismatch && (rate.transportMode === 'SEA_FCL' || rate.category === 'FREIGHT')) {
    return null;
  }

  if (context.containerType && context.containerType !== '') {
    if (rate.containerType) {
      const qNorm = normalizeText(context.containerType);
      const rNorm = normalizeText(rate.containerType);
      if (qNorm === rNorm) {
        score += 25;
        reasonsVi.push(`Khớp chuẩn loại container (${rate.containerType})`);
        reasonsEn.push(`Exact container type matched (${rate.containerType})`);
      }
    } else {
      score += 5; // Generic container/charge
    }
  }

  // 3. Carrier Matching
  if (context.carrier && context.carrier.trim() !== '') {
    if (rate.carrier && looseMatch(context.carrier, rate.carrier)) {
      score += 20;
      if (priorityLevel > 3) {
        priorityLevel = 3;
        matchQuality = 'CARRIER_MATCH';
      }
      reasonsVi.push(`Khớp hãng vận chuyển (${rate.carrier})`);
      reasonsEn.push(`Carrier matched (${rate.carrier})`);
    }
  }

  // 4. Air Freight Weight Break Check
  if (rate.transportMode === 'AIR_FREIGHT' || context.transportMode === 'AIR_FREIGHT') {
    const airCheck = matchAirWeightBreak(rate, context.chargeableWeight || context.grossWeightKg);
    score += airCheck.bonus;
    if (airCheck.reason) {
      reasonsVi.push(airCheck.reason);
      reasonsEn.push(airCheck.reason);
    }
  }

  // 5. Contract / Special Rate
  if (rate.contractNo || (rate.priority && rate.priority >= 80)) {
    score += 15;
    if (priorityLevel > 2 && isFullRouteMatch) {
      priorityLevel = 2;
      matchQuality = 'CONTRACT_MATCH';
      reasonsVi.push(`Hợp đồng giá ưu đãi (${rate.contractNo || 'Contract Rate'})`);
      reasonsEn.push(`Contracted preferential rate (${rate.contractNo || 'Contract Rate'})`);
    }
  }

  // 6. Customer-Specific Rate (Highest Level 1)
  const custCodeQuery = context.customerCode || context.customerId;
  if (custCodeQuery && rate.customerCode && looseMatch(custCodeQuery, rate.customerCode)) {
    score += 35;
    priorityLevel = 1;
    matchQuality = 'CUSTOMER_MATCH';
    reasonsVi.unshift(`Bảng giá riêng theo khách hàng (${rate.customerName || rate.customerCode})`);
    reasonsEn.unshift(`Customer-specific contracted rate (${rate.customerName || rate.customerCode})`);
  }

  // 7. Full Exact Match Definition
  const isModeMatch = !context.transportMode || context.transportMode === 'ALL' || rate.transportMode === context.transportMode || rate.transportMode === 'MULTIMODAL';
  if (isFullRouteMatch && isModeMatch && (!rate.containerType || normalizeText(rate.containerType) === normalizeText(context.containerType))) {
    if (matchQuality === 'ROUTE_MATCH' || matchQuality === 'CARRIER_MATCH') {
      matchQuality = 'EXACT_MATCH';
    }
    score = Math.max(score, 85);
  }

  // Base priority score inclusion
  score += Math.min(10, Math.max(0, (rate.priority || 10) / 10));

  // Minimum fallback score
  if (score <= 0 && isModeMatch) {
    score = 10;
    reasonsVi.push('Khớp phương thức vận tải chung');
    reasonsEn.push('General transport mode match');
  }

  return {
    rate,
    matchScore: Math.min(100, Math.max(0, Math.round(score))),
    matchQuality,
    priorityLevel,
    matchReasonVi: reasonsVi.join(' • ') || 'Bảng giá chuẩn',
    matchReasonEn: reasonsEn.join(' • ') || 'Standard master rate',
    isExpired,
    isExpiringSoon,
    isValidForDate,
    isFutureRate: checkTime < fromTime,
  };
}

/**
 * Smart Rate Search Service
 * Searches, filters, ranks, and returns matching rate entries.
 */
export function searchSmartRates(
  allRates: RateMasterItem[],
  context: RateSearchContext
): {
  activeMatches: RateSearchResult[];
  expiredMatches: RateSearchResult[];
  allFound: RateSearchResult[];
  exactMatches: RateSearchResult[];
  totalMatches: number;
} {
  const results: RateSearchResult[] = [];

  for (const rate of allRates) {
    const evaluated = evaluateRateMatch(rate, context);
    if (evaluated) {
      results.push(evaluated);
    }
  }

  // Sorting: Valid date first, then by priority level ascending (Level 1 is highest),
  // then matchScore descending, then rate priority descending
  results.sort((a, b) => {
    if (a.isValidForDate !== b.isValidForDate) {
      return a.isValidForDate ? -1 : 1;
    }
    if (a.priorityLevel !== b.priorityLevel) {
      return a.priorityLevel - b.priorityLevel;
    }
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return (b.rate.priority || 0) - (a.rate.priority || 0);
  });

  const activeMatches = results.filter(r => r.isValidForDate);
  const expiredMatches = results.filter(r => !r.isValidForDate);
  const exactMatches = activeMatches.filter(r => r.matchQuality === 'EXACT_MATCH' || r.matchQuality === 'CUSTOMER_MATCH' || r.matchScore >= 80);

  return {
    activeMatches,
    expiredMatches,
    allFound: results,
    exactMatches,
    totalMatches: results.length,
  };
}

/**
 * Automated Quote Building Scanner
 * Automatically segments live Master Rates into logical charge categories for the given shipment context.
 */
export function scanSmartRatesForQuote(
  allRates: RateMasterItem[],
  context: RateSearchContext
): SmartRateScanResult {
  const { activeMatches, expiredMatches } = searchSmartRates(allRates, context);

  // Group definitions
  const freightItems: RateSearchResult[] = [];
  const polItems: RateSearchResult[] = [];
  const podItems: RateSearchResult[] = [];
  const truckingItems: RateSearchResult[] = [];
  const customsItems: RateSearchResult[] = [];
  const otherItems: RateSearchResult[] = [];

  for (const item of activeMatches) {
    const r = item.rate;
    if (r.category === 'FREIGHT' || r.chargeType === 'BASE_FREIGHT') {
      freightItems.push(item);
    } else if (r.category === 'CUSTOMS') {
      customsItems.push(item);
    } else if (r.category === 'TRUCKING') {
      truckingItems.push(item);
    } else if (r.category === 'LOCAL_CHARGE' || r.category === 'SURCHARGE') {
      const text = `${r.chargeCode} ${r.chargeName} ${r.origin || ''} ${r.destination || ''}`.toUpperCase();
      if (text.includes('POL') || text.includes('XUẤT') || text.includes('EXPORT') || text.includes('THC') || text.includes('BL') || text.includes('SEAL') || text.includes('VGM') || text.includes('AMS')) {
        polItems.push(item);
      } else if (text.includes('POD') || text.includes('NHẬP') || text.includes('IMPORT') || text.includes('D/O') || text.includes('DO') || text.includes('CFS') || text.includes('CIC') || text.includes('HANDLING')) {
        podItems.push(item);
      } else {
        polItems.push(item);
      }
    } else {
      otherItems.push(item);
    }
  }

  const groups: SmartRateCategoryGroup[] = [
    {
      categoryKey: 'MAIN_FREIGHT' as const,
      titleVi: '1. Cước Vận Tải Chính (Main Freight)',
      titleEn: '1. Main Freight Charges',
      items: freightItems,
      selectedCount: 0,
    },
    {
      categoryKey: 'POL_LOCAL' as const,
      titleVi: '2. Phụ Phí Đầu Xuất (POL Local Charges)',
      titleEn: '2. Origin / POL Local Charges',
      items: polItems,
      selectedCount: 0,
    },
    {
      categoryKey: 'POD_LOCAL' as const,
      titleVi: '3. Phụ Phí Đầu Nhập (POD Local Charges)',
      titleEn: '3. Destination / POD Local Charges',
      items: podItems,
      selectedCount: 0,
    },
    {
      categoryKey: 'TRUCKING' as const,
      titleVi: '4. Vận Chuyển Nội Địa (Inland Trucking)',
      titleEn: '4. Inland Trucking Services',
      items: truckingItems,
      selectedCount: 0,
    },
    {
      categoryKey: 'CUSTOMS' as const,
      titleVi: '5. Thủ Tục Hải Quan (Customs Clearance)',
      titleEn: '5. Customs Clearance Services',
      items: customsItems,
      selectedCount: 0,
    },
    {
      categoryKey: 'OTHER' as const,
      titleVi: '6. Dịch Vụ & Phụ Phí Khác (Other Services)',
      titleEn: '6. Other Surcharges & Services',
      items: otherItems,
      selectedCount: 0,
    },
  ].filter(g => g.items.length > 0);

  const hasExactFreightMatch = freightItems.some(i => i.matchQuality === 'EXACT_MATCH' || i.matchQuality === 'CUSTOMER_MATCH');
  const recommendedCount = activeMatches.filter(i => i.matchScore >= 50).length;

  return {
    context,
    totalActiveMatches: activeMatches.length,
    totalExpiredMatches: expiredMatches.length,
    groups,
    hasExactFreightMatch,
    recommendedCount,
  };
}
