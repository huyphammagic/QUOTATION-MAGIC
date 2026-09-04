import { RateMasterItem, RateCoverageSummary } from '../../types/masterRate';
import { checkDuplicateAndOverlap } from './rateCompatibilityService';

/**
 * Calculates rate expiration alerts, lane coverage and data hygiene metrics
 */
export function calculateRateAnalytics(rates: RateMasterItem[]): {
  summary: RateCoverageSummary;
  expiringIn7DaysRates: RateMasterItem[];
  expiringIn14DaysRates: RateMasterItem[];
  expiringIn30DaysRates: RateMasterItem[];
  expiredRates: RateMasterItem[];
  dataQualityIssues: {
    rate: RateMasterItem;
    issueType: 'MISSING_COST' | 'MISSING_VALIDITY' | 'MISSING_CARRIER' | 'DUPLICATE' | 'OVERLAP';
    descriptionVi: string;
    descriptionEn: string;
  }[];
} {
  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date(todayStr).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const expiringIn7DaysRates: RateMasterItem[] = [];
  const expiringIn14DaysRates: RateMasterItem[] = [];
  const expiringIn30DaysRates: RateMasterItem[] = [];
  const expiredRates: RateMasterItem[] = [];
  const laneMap = new Map<string, number>();

  let activeCount = 0;
  let pendingApprovalCount = 0;
  let expiredCount = 0;
  let missingCostCount = 0;
  let missingValidityCount = 0;
  let missingSupplierCount = 0;

  const dataQualityIssues: {
    rate: RateMasterItem;
    issueType: 'MISSING_COST' | 'MISSING_VALIDITY' | 'MISSING_CARRIER' | 'DUPLICATE' | 'OVERLAP';
    descriptionVi: string;
    descriptionEn: string;
  }[] = [];

  for (let i = 0; i < rates.length; i++) {
    const rate = rates[i];
    if (rate.status === 'CANCELLED') continue;

    // Track status
    if (rate.status === 'PENDING_APPROVAL') {
      pendingApprovalCount++;
    }

    // Check validity
    if (!rate.effectiveFrom || !rate.effectiveTo) {
      missingValidityCount++;
      dataQualityIssues.push({
        rate,
        issueType: 'MISSING_VALIDITY',
        descriptionVi: 'Thiếu ngày bắt đầu hoặc kết thúc hiệu lực',
        descriptionEn: 'Missing effective from or to date',
      });
    } else {
      const toTime = new Date(rate.effectiveTo).getTime();
      const fromTime = new Date(rate.effectiveFrom).getTime();

      if (now > toTime || rate.status === 'EXPIRED') {
        expiredCount++;
        expiredRates.push(rate);
      } else if (now >= fromTime && now <= toTime) {
        if (rate.status === 'ACTIVE' || rate.status === 'APPROVED') {
          activeCount++;
        }
        const diffDays = Math.ceil((toTime - now) / dayMs);
        if (diffDays <= 7 && diffDays >= 0) {
          expiringIn7DaysRates.push(rate);
        } else if (diffDays <= 14 && diffDays > 7) {
          expiringIn14DaysRates.push(rate);
        } else if (diffDays <= 30 && diffDays > 14) {
          expiringIn30DaysRates.push(rate);
        }
      }
    }

    // Check cost & carrier
    if (rate.costAmount === undefined || rate.costAmount === null || rate.costAmount === 0) {
      missingCostCount++;
      dataQualityIssues.push({
        rate,
        issueType: 'MISSING_COST',
        descriptionVi: 'Chưa nhập giá vốn (Cost Amount = 0 hoặc trống)',
        descriptionEn: 'Missing cost amount (0 or empty)',
      });
    }

    if (!rate.carrier && !rate.supplierName && !rate.supplierId) {
      missingSupplierCount++;
      dataQualityIssues.push({
        rate,
        issueType: 'MISSING_CARRIER',
        descriptionVi: 'Chưa gán Hãng vận chuyển hoặc Nhà cung cấp',
        descriptionEn: 'Missing carrier or supplier assignment',
      });
    }

    // Lane count
    const laneKey = `${rate.origin || 'N/A'} -> ${rate.destination || 'N/A'}`;
    laneMap.set(laneKey, (laneMap.get(laneKey) || 0) + 1);

    // Check duplicate/overlap against other rates
    const rest = rates.filter((_, idx) => idx !== i);
    const { isDuplicate, duplicateRateCode, hasOverlap, overlappingRateCode } = checkDuplicateAndOverlap(rate, rest);
    if (isDuplicate) {
      dataQualityIssues.push({
        rate,
        issueType: 'DUPLICATE',
        descriptionVi: `Trùng lặp với bảng giá [${duplicateRateCode}]`,
        descriptionEn: `Duplicate with rate [${duplicateRateCode}]`,
      });
    } else if (hasOverlap) {
      dataQualityIssues.push({
        rate,
        issueType: 'OVERLAP',
        descriptionVi: `Thời gian hiệu lực đè lên [${overlappingRateCode}]`,
        descriptionEn: `Validity overlaps with [${overlappingRateCode}]`,
      });
    }
  }

  // Top lanes sorted by rate count
  const topLanes = Array.from(laneMap.entries())
    .map(([lane, count]) => ({ lane, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const summary: RateCoverageSummary = {
    totalRates: rates.length,
    activeCount,
    pendingApprovalCount,
    expiredCount,
    expiringIn7Days: expiringIn7DaysRates.length,
    expiringIn14Days: expiringIn14DaysRates.length,
    expiringIn30Days: expiringIn30DaysRates.length,
    topLanes,
    missingCostCount,
    missingValidityCount,
    missingSupplierCount,
  };

  return {
    summary,
    expiringIn7DaysRates,
    expiringIn14DaysRates,
    expiringIn30DaysRates,
    expiredRates,
    dataQualityIssues,
  };
}
