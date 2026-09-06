import { RateMasterItem, RateSearchResult } from '../../types/masterRate';

/**
 * Normalizes text components for canonical rate identity calculation
 */
function cleanKeyPart(val: string | undefined | null): string {
  if (!val) return 'ANY';
  return val
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Generates a deterministic canonical Rate Identity Key for duplicate and overlap detection.
 * Format: [COMPANY]#[MODE]#[RATETYPE]#[CARRIER_OR_SUPPLIER]#[ORIGIN]#[DEST]#[EQUIPMENT_OR_UNIT]
 */
export function generateRateIdentityKey(rate: Partial<RateMasterItem>): string {
  const company = cleanKeyPart(rate.companyId || 'DEFAULT');
  const mode = cleanKeyPart(rate.transportMode || 'SEA_FCL');
  const rateType = cleanKeyPart(rate.rateType || 'SELL');
  const provider = cleanKeyPart(rate.carrierCode || rate.carrier || rate.supplierId || rate.supplierName || 'GENERAL');
  const origin = cleanKeyPart(rate.originPort || rate.originCode || rate.origin);
  const destination = cleanKeyPart(rate.destinationPort || rate.destinationCode || rate.destination);
  const charge = cleanKeyPart(rate.chargeCode || 'OFR');
  const equipment = cleanKeyPart(rate.containerType || rate.unit || 'UNIT');

  return `${company}:${mode}:${rateType}:${provider}:${origin}->${destination}:${charge}:${equipment}`;
}

/**
 * Helper to test if two date strings overlap: [from1, to1] and [from2, to2]
 */
export function datesOverlap(from1: string, to1: string, from2: string, to2: string): boolean {
  const f1 = new Date(from1).getTime();
  const t1 = new Date(to1).getTime();
  const f2 = new Date(from2).getTime();
  const t2 = new Date(to2).getTime();

  if (isNaN(f1) || isNaN(t1) || isNaN(f2) || isNaN(t2)) return false;
  return f1 <= t2 && t1 >= f2;
}

/**
 * Checks if a candidate rate has date overlap with any active rate sharing the same canonical identity key.
 */
export function detectRateOverlap(
  candidate: Partial<RateMasterItem>,
  existingRates: RateMasterItem[]
): {
  hasOverlap: boolean;
  overlappingRates: RateMasterItem[];
  exactDuplicate?: RateMasterItem;
} {
  const candidateKey = candidate.rateIdentityKey || generateRateIdentityKey(candidate);
  const candidateFrom = candidate.effectiveFrom;
  const candidateTo = candidate.effectiveTo;

  if (!candidateFrom || !candidateTo) {
    return { hasOverlap: false, overlappingRates: [] };
  }

  const overlapping: RateMasterItem[] = [];
  let exactDup: RateMasterItem | undefined = undefined;

  for (const existing of existingRates) {
    // Skip self and non-active/cancelled rates
    if (candidate.id && existing.id === candidate.id) continue;
    if (existing.status === 'CANCELLED' || existing.status === 'INACTIVE') continue;

    const existingKey = existing.rateIdentityKey || generateRateIdentityKey(existing);
    if (existingKey === candidateKey) {
      // Check exact match dates
      if (existing.effectiveFrom === candidateFrom && existing.effectiveTo === candidateTo) {
        exactDup = existing;
      }

      // Check date range overlap
      if (datesOverlap(candidateFrom, candidateTo, existing.effectiveFrom, existing.effectiveTo)) {
        overlapping.push(existing);
      }
    }
  }

  return {
    hasOverlap: overlapping.length > 0,
    overlappingRates: overlapping,
    exactDuplicate: exactDup,
  };
}

/**
 * Detects Rate Conflict among matched candidates.
 * A conflict occurs when two or more active rates have identical top priority and matching score,
 * but offer differing amounts/currencies without an explicit discriminator.
 */
export function detectMatchingConflict(candidates: RateSearchResult[]): {
  hasConflict: boolean;
  conflictRates: RateMasterItem[];
  reason?: string;
} {
  if (candidates.length < 2) {
    return { hasConflict: false, conflictRates: [] };
  }

  // Filter only active & valid candidates
  const validCandidates = candidates.filter(c => c.isValidForDate && !c.isExpired);
  if (validCandidates.length < 2) {
    return { hasConflict: false, conflictRates: [] };
  }

  const topPriority = validCandidates[0].priorityLevel;
  const topScore = validCandidates[0].matchScore;

  // Find competitors sharing the same top priority and within 5 score points
  const topTier = validCandidates.filter(
    c => c.priorityLevel === topPriority && Math.abs(c.matchScore - topScore) <= 5
  );

  if (topTier.length >= 2) {
    // Check if they have different prices or conflicting providers
    const firstRate = topTier[0].rate;
    const hasPriceDiff = topTier.some(
      c => c.rate.sellingAmount !== firstRate.sellingAmount || 
           c.rate.sellingCurrency !== firstRate.sellingCurrency
    );

    if (hasPriceDiff) {
      return {
        hasConflict: true,
        conflictRates: topTier.map(c => c.rate),
        reason: `Phát hiện xung đột giá: Có ${topTier.length} bảng giá cùng mức ưu tiên (${topPriority}) với đơn giá khác nhau. Vui lòng chọn thủ công hoặc tinh chỉnh tiêu chí tìm kiếm.`,
      };
    }
  }

  return { hasConflict: false, conflictRates: [] };
}
