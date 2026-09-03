import { RateMasterItem, RateSearchParams, RateSearchResult, MatchQuality, MatchingPriorityLevel } from '../../types/masterRate';

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
 * Core Rate Search Engine for Freight Forwarding Quotation
 * Implements multi-tier matching (Exact > Route > Generic) and validity verification.
 */
export function searchMatchingRates(
  allRates: RateMasterItem[],
  params: RateSearchParams
): {
  activeMatches: RateSearchResult[];
  expiredMatches: RateSearchResult[];
  allFound: RateSearchResult[];
  totalMatches: number;
} {
  const checkDate = params.date || new Date().toISOString().slice(0, 10);
  const checkTime = new Date(checkDate).getTime();

  const results: RateSearchResult[] = [];

  allRates.forEach((rate) => {
    // Basic filter by status if explicitly requested
    if (params.status && params.status !== 'ALL' && rate.status !== params.status) {
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
        looseMatch(kw, rate.origin) ||
        looseMatch(kw, rate.destination) ||
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

    // Calculate match score
    let score = 0;
    const matchReasonsVi: string[] = [];
    const matchReasonsEn: string[] = [];

    // 1. Route match (Origin + Destination)
    const originMatch = looseMatch(params.origin, rate.origin) || looseMatch(params.origin, rate.originPort);
    const destMatch = looseMatch(params.destination, rate.destination) || looseMatch(params.destination, rate.destinationPort);

    if (params.origin && params.destination) {
      if (originMatch && destMatch) {
        score += 40;
        matchReasonsVi.push(`Khớp chính xác tuyến đường (${rate.origin} -> ${rate.destination})`);
        matchReasonsEn.push(`Exact route matched (${rate.origin} -> ${rate.destination})`);
      } else if (originMatch || destMatch) {
        score += 15;
        matchReasonsVi.push(`Khớp một phần cảng/tuyến (${originMatch ? rate.origin : rate.destination})`);
        matchReasonsEn.push(`Partial port/route matched (${originMatch ? rate.origin : rate.destination})`);
      }
    } else if (params.origin && originMatch) {
      score += 20;
      matchReasonsVi.push(`Khớp điểm đi (${rate.origin})`);
      matchReasonsEn.push(`Origin matched (${rate.origin})`);
    } else if (params.destination && destMatch) {
      score += 20;
      matchReasonsVi.push(`Khớp điểm đến (${rate.destination})`);
      matchReasonsEn.push(`Destination matched (${rate.destination})`);
    }

    // 2. Equipment / Container Type match for FCL
    if (params.containerType && params.containerType !== '') {
      if (rate.containerType && normalizeText(rate.containerType) === normalizeText(params.containerType)) {
        score += 25;
        matchReasonsVi.push(`Khớp loại container (${rate.containerType})`);
        matchReasonsEn.push(`Container type matched (${rate.containerType})`);
      } else if (!rate.containerType) {
        score += 5; // Generic container
      } else {
        // Container type mismatch
        score -= 20;
      }
    }

    // 3. Carrier match
    if (params.carrier && params.carrier.trim() !== '') {
      if (looseMatch(params.carrier, rate.carrier)) {
        score += 20;
        matchReasonsVi.push(`Khớp hãng tàu/vận chuyển (${rate.carrier})`);
        matchReasonsEn.push(`Carrier matched (${rate.carrier})`);
      }
    }

    // 4. Customer-specific rate priority bonus
    if (params.customerCode && rate.customerCode && looseMatch(params.customerCode, rate.customerCode)) {
      score += 30;
      matchReasonsVi.push(`Bảng giá riêng theo khách hàng (${rate.customerName || rate.customerCode})`);
      matchReasonsEn.push(`Customer-specific contracted rate (${rate.customerName || rate.customerCode})`);
    }

    // Add base priority from rate master
    score += (rate.priority || 10) / 10;

    // Minimum baseline score for category/mode match
    if (score <= 0 && modeMatches) {
      score = 10;
      matchReasonsVi.push('Phù hợp phương thức vận tải chung');
      matchReasonsEn.push('General transport mode match');
    }

    const isValidForDate = isValidWindow && rate.status === 'ACTIVE';
    const roundedScore = Math.round(score);
    const matchQuality: MatchQuality = roundedScore >= 80 ? 'EXACT_MATCH' : roundedScore >= 50 ? 'ROUTE_MATCH' : 'GENERAL_RATE';
    const isExpiringSoon = isValidForDate && Boolean(rate.effectiveTo && (new Date(rate.effectiveTo).getTime() - new Date().getTime() <= 7 * 86400000));
    const priorityLevel: MatchingPriorityLevel = (Math.min(5, Math.max(1, Math.round((rate.priority || 10) / 2))) as MatchingPriorityLevel);

    results.push({
      rate,
      matchScore: roundedScore,
      matchQuality,
      matchReasonVi: matchReasonsVi.join(', ') || 'Bảng giá khả dụng',
      matchReasonEn: matchReasonsEn.join(', ') || 'Available rate',
      isExpired,
      isValidForDate,
      isExpiringSoon,
      priorityLevel,
    });
  });

  // Sort results: Valid first, then by match score descending, then by priority descending
  results.sort((a, b) => {
    if (a.isValidForDate !== b.isValidForDate) {
      return a.isValidForDate ? -1 : 1;
    }
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return (b.rate.priority || 0) - (a.rate.priority || 0);
  });

  const activeMatches = results.filter(r => r.isValidForDate);
  const expiredMatches = results.filter(r => !r.isValidForDate);

  return {
    activeMatches,
    expiredMatches,
    allFound: results,
    totalMatches: results.length,
  };
}
