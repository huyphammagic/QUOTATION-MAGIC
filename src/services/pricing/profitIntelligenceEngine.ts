import { Currency, LineItem, QuoteData } from '../../types/logistics';
import { 
  ProfitMarginSummary, 
  PricingPolicyItem, 
  MarginStatus, 
  PriceRiskLevel,
  ApprovalLevel, 
  LineProfitabilityDetail,
  DiscountIntelligenceSummary,
  PricingWarningItem,
  PricingRecommendationItem,
  RateSourceTraceabilityItem,
  PricingScenarioComparison,
  WhatIfScenarioRequest,
  WhatIfScenarioResult
} from '../../types/pricingIntelligence';
import { roundCurrency, convertCurrency } from './currencyCalculator';
import { DEFAULT_GLOBAL_PRICING_POLICY } from './pricingPolicyService';

/**
 * Pure Mathematical Core for Profit & Margin Calculations
 * Guarantees zero NaN, zero Infinity, zero negative zeros, deterministic precision.
 */

export function calculateGrossProfit(totalSell: number, totalCost: number): number {
  if (isNaN(totalSell) || !isFinite(totalSell)) totalSell = 0;
  if (isNaN(totalCost) || !isFinite(totalCost)) totalCost = 0;
  return totalSell - totalCost;
}

export function calculateGrossMarginPercent(profit: number, sell: number): number {
  if (isNaN(profit) || !isFinite(profit) || isNaN(sell) || !isFinite(sell) || sell <= 0) {
    return 0;
  }
  const raw = (profit / sell) * 100;
  return Math.round((raw + Number.EPSILON) * 100) / 100;
}

export function calculateMarkupPercent(profit: number, cost: number): number {
  if (isNaN(profit) || !isFinite(profit) || isNaN(cost) || !isFinite(cost) || cost <= 0) {
    return 0;
  }
  const raw = (profit / cost) * 100;
  return Math.round((raw + Number.EPSILON) * 100) / 100;
}

/**
 * Recommended Selling Price based on Target Margin % or Target Profit
 * Formula: Sell = Cost / (1 - Target Margin %)
 */
export function calculateRecommendedSellPrice(
  cost: number, 
  targetMarginPercent: number, 
  targetProfitAmount?: number
): number {
  if (cost <= 0) return 0;
  const safeMargin = Math.min(Math.max(targetMarginPercent, 0), 99.99);
  const sellByMargin = cost / (1 - (safeMargin / 100));
  
  if (targetProfitAmount && targetProfitAmount > 0) {
    const sellByProfit = cost + targetProfitAmount;
    return Math.max(sellByMargin, sellByProfit);
  }
  return sellByMargin;
}

/**
 * Minimum Selling Price (Price Floor)
 * Formula: Min Sell = Cost / (1 - Minimum Margin %)
 */
export function calculateMinimumSellPrice(
  cost: number,
  minMarginPercent: number,
  minProfitAmount: number = 0,
  priceFloorType: 'MIN_MARGIN' | 'MIN_PROFIT' | 'HIGHER_OF_BOTH' = 'MIN_MARGIN'
): number {
  if (cost <= 0) return 0;
  const safeMargin = Math.min(Math.max(minMarginPercent, 0), 99.99);
  const sellByMargin = cost / (1 - (safeMargin / 100));
  const sellByProfit = cost + Math.max(0, minProfitAmount);

  if (priceFloorType === 'MIN_PROFIT') {
    return sellByProfit;
  } else if (priceFloorType === 'HIGHER_OF_BOTH') {
    return Math.max(sellByMargin, sellByProfit);
  }
  return sellByMargin;
}

/**
 * Maximum Acceptable Discount without dropping below Minimum Selling Price
 */
export function calculateMaximumDiscount(
  currentSell: number,
  minimumSell: number
): { maxDiscountAmount: number; maxDiscountPercent: number } {
  if (currentSell <= 0 || minimumSell >= currentSell) {
    return { maxDiscountAmount: 0, maxDiscountPercent: 0 };
  }
  const maxDiscountAmount = currentSell - minimumSell;
  const maxDiscountPercent = (maxDiscountAmount / currentSell) * 100;
  return {
    maxDiscountAmount: Math.round((maxDiscountAmount + Number.EPSILON) * 100) / 100,
    maxDiscountPercent: Math.round((maxDiscountPercent + Number.EPSILON) * 100) / 100,
  };
}

/**
 * Evaluates Price Risk Level for Phase 28 Smart Pricing Intelligence
 * SAFE: Margin >= Target Margin
 * NORMAL: Margin between (Minimum Margin + 2%) and Target Margin
 * HIGH_RISK: Margin between Minimum Margin and (Minimum Margin + 2%)
 * LOW_MARGIN: Margin < Minimum Margin
 * LOSS: Gross Profit < 0
 * BLOCKED: Margin < Block Margin threshold
 * NO_COST: Cost <= 0
 * NO_SELL: Sell <= 0
 */
export function evaluatePriceRiskLevel(
  actualMargin: number,
  grossProfitUsd: number,
  policy: PricingPolicyItem,
  totalCostUsd: number,
  totalSellUsd: number
): PriceRiskLevel {
  if (totalCostUsd <= 0) return 'NO_COST';
  if (totalSellUsd <= 0) return 'NO_SELL';
  if (grossProfitUsd < 0) return 'LOSS';

  const blockMargin = policy.approvalThresholds?.blockMargin ?? 8.0;
  const minMargin = policy.minimumMarginPercent ?? 15.0;
  const targetMargin = policy.targetMarginPercent ?? 20.0;

  if (actualMargin < blockMargin) return 'BLOCKED';
  if (actualMargin < minMargin) return 'LOW_MARGIN';
  if (actualMargin < minMargin + 2.0) return 'HIGH_RISK';
  if (actualMargin >= targetMargin) return 'SAFE';
  return 'NORMAL';
}

/**
 * Calculates complete Discount Intelligence for Phase 28
 * Accurately analyzes Original Selling, Discount Amount, Discount %, Final Net Selling,
 * Net Profit, Net Margin %, and Maximum Safe Discount.
 */
export function calculateDiscountIntelligence(
  originalSellUsd: number,
  originalSellVnd: number,
  discountPercent: number = 0,
  discountAmountUsd: number = 0,
  exchangeRate: number = 25400,
  totalCostUsd: number = 0,
  minimumSellUsd: number = 0
): DiscountIntelligenceSummary {
  const safeOrigUsd = Math.max(0, originalSellUsd);
  const safeOrigVnd = Math.max(0, originalSellVnd);

  let finalDiscountUsd = 0;
  let finalDiscountPercent = 0;

  if (discountAmountUsd > 0) {
    finalDiscountUsd = Math.min(discountAmountUsd, safeOrigUsd);
    finalDiscountPercent = safeOrigUsd > 0 ? (finalDiscountUsd / safeOrigUsd) * 100 : 0;
  } else if (discountPercent > 0) {
    finalDiscountPercent = Math.min(Math.max(discountPercent, 0), 100);
    finalDiscountUsd = (safeOrigUsd * finalDiscountPercent) / 100;
  }

  const roundedDiscountUsd = roundCurrency(finalDiscountUsd, 'USD');
  const roundedDiscountVnd = roundCurrency(roundedDiscountUsd * exchangeRate, 'VND');

  const finalSellUsd = roundCurrency(Math.max(0, safeOrigUsd - roundedDiscountUsd), 'USD');
  const finalSellVnd = roundCurrency(Math.max(0, safeOrigVnd - roundedDiscountVnd), 'VND');

  const netProfitUsd = roundCurrency(finalSellUsd - totalCostUsd, 'USD');
  const netProfitVnd = roundCurrency(netProfitUsd * exchangeRate, 'VND');
  const netMarginPercent = calculateGrossMarginPercent(netProfitUsd, finalSellUsd);

  const maxAllowedDiscountUsd = Math.max(0, roundCurrency(safeOrigUsd - minimumSellUsd, 'USD'));
  const maxAllowedDiscountPercent = safeOrigUsd > 0 ? Math.round(((maxAllowedDiscountUsd / safeOrigUsd) * 100 + Number.EPSILON) * 100) / 100 : 0;

  const isDiscountExcessive = roundedDiscountUsd > maxAllowedDiscountUsd;

  return {
    originalSellingPriceUsd: safeOrigUsd,
    originalSellingPriceVnd: safeOrigVnd,
    discountAmountUsd: roundedDiscountUsd,
    discountAmountVnd: roundedDiscountVnd,
    discountPercent: Math.round((finalDiscountPercent + Number.EPSILON) * 100) / 100,
    finalSellingPriceUsd: finalSellUsd,
    finalSellingPriceVnd: finalSellVnd,
    netProfitUsd,
    netProfitVnd,
    netMarginPercent,
    maxAllowedDiscountAmountUsd: maxAllowedDiscountUsd,
    maxAllowedDiscountPercent,
    isDiscountExcessive,
  };
}

/**
 * Calculates Minimum Safe Selling Price Floor with prioritized rule source hierarchy
 * 1. Customer Contract / Customer-specific rule
 * 2. Resolved Pricing Policy
 * 3. Company configuration fallback
 * Formula: Minimum Safe Selling Price = Total Cost / (1 - Minimum Margin %)
 */
export function calculateMinimumSafeSellingPrice(
  totalCostUsd: number,
  exchangeRate: number = 25400,
  policy: PricingPolicyItem,
  customerRule?: { minMarginPercent?: number }
): {
  minimumSafeSellPriceUsd: number;
  minimumSafeSellPriceVnd: number;
  isConfigured: boolean;
  source: 'CUSTOMER_CONTRACT' | 'PRICING_POLICY' | 'COMPANY_CONFIG' | 'NONE';
} {
  if (totalCostUsd <= 0) {
    return {
      minimumSafeSellPriceUsd: 0,
      minimumSafeSellPriceVnd: 0,
      isConfigured: false,
      source: 'NONE',
    };
  }

  let minMargin = 0;
  let source: 'CUSTOMER_CONTRACT' | 'PRICING_POLICY' | 'COMPANY_CONFIG' | 'NONE' = 'NONE';

  if (customerRule && customerRule.minMarginPercent !== undefined && customerRule.minMarginPercent > 0) {
    minMargin = customerRule.minMarginPercent;
    source = 'CUSTOMER_CONTRACT';
  } else if (policy && policy.minimumMarginPercent !== undefined && policy.minimumMarginPercent > 0) {
    minMargin = policy.minimumMarginPercent;
    source = 'PRICING_POLICY';
  } else {
    minMargin = 15;
    source = 'COMPANY_CONFIG';
  }

  const safeMargin = Math.min(Math.max(minMargin, 0), 99.9);
  const minSafeUsd = roundCurrency(totalCostUsd / (1 - safeMargin / 100), 'USD');
  const minSafeVnd = roundCurrency(minSafeUsd * exchangeRate, 'VND');

  return {
    minimumSafeSellPriceUsd: minSafeUsd,
    minimumSafeSellPriceVnd: minSafeVnd,
    isConfigured: minMargin > 0,
    source,
  };
}

/**
 * Audits Rate Source Traceability for each line item (Contract, Carrier Rate, Spot, Manual)
 */
export function auditRateSourceTraceability(items: LineItem[]): RateSourceTraceabilityItem[] {
  const nowStr = new Date().toISOString().slice(0, 10);
  const nowTime = new Date(nowStr).getTime();

  return items.map(item => {
    let expiryStatus: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNKNOWN' = 'UNKNOWN';
    let daysToExpiry: number | undefined = undefined;

    if (item.effectiveTo) {
      const expTime = new Date(item.effectiveTo).getTime();
      if (!isNaN(expTime)) {
        daysToExpiry = Math.ceil((expTime - nowTime) / (1000 * 60 * 60 * 24));
        if (daysToExpiry < 0) {
          expiryStatus = 'EXPIRED';
        } else if (daysToExpiry <= 7) {
          expiryStatus = 'EXPIRING_SOON';
        } else {
          expiryStatus = 'VALID';
        }
      }
    } else if (item.priceSource === 'CUSTOMER_CONTRACT' || item.priceSource === 'STANDARD_RATE') {
      expiryStatus = 'VALID';
    }

    return {
      itemId: item.id,
      itemCode: item.code || 'CHARGE',
      itemDescription: item.description || '',
      category: item.category || 'LOCAL_CHARGE',
      location: item.location,
      priceSource: item.priceSource || (item.sourceContractNumber ? 'CUSTOMER_CONTRACT' : item.rateId ? 'STANDARD_RATE' : 'MANUAL'),
      sourceId: item.sourceId || item.rateId,
      sourceContractNumber: item.sourceContractNumber,
      carrier: item.carrier,
      effectiveTo: item.effectiveTo,
      expiryStatus,
      daysToExpiry,
      costCurrency: item.currency || 'USD',
      costUnitPrice: Number(item.costPrice) || 0,
      sellUnitPrice: Number(item.unitPrice) || 0,
      marginPercent: item.marginPercent || 0,
    };
  });
}

/**
 * Audits Pricing Warnings across 12 specific dimensions (Bilingual VI/EN)
 */
export function auditPricingWarnings(
  quote: Partial<QuoteData>,
  items: LineItem[],
  metrics: {
    totalBuyCostUsd: number;
    totalSellUsd: number;
    grossMarginPercent: number;
    grossProfitUsd: number;
    minimumSafeSellPriceUsd: number;
    maximumDiscountPercent: number;
    discountPercent?: number;
    discountAmountUsd?: number;
  },
  exchangeRate: number,
  policy: PricingPolicyItem
): PricingWarningItem[] {
  const warnings: PricingWarningItem[] = [];

  // 1. Missing exchange rate
  if (!exchangeRate || exchangeRate <= 0) {
    warnings.push({
      id: 'warn-rate-missing',
      code: 'MISSING_EXCHANGE_RATE',
      severity: 'CRITICAL',
      titleVi: 'Thiếu tỷ giá quy đổi USD/VNĐ',
      titleEn: 'Missing USD/VND Exchange Rate',
      messageVi: 'Tỷ giá báo giá chưa được thiết lập hoặc bằng 0. Cần cập nhật tỷ giá để chuyển đổi tiền tệ chính xác.',
      messageEn: 'Quotation exchange rate is missing or zero. Update the exchange rate for accurate multi-currency calculations.',
      actionableSuggestionVi: 'Thiết lập tỷ giá hợp lệ trong thẻ tổng quan báo giá (ví dụ: 25,400).',
      actionableSuggestionEn: 'Set a valid exchange rate in the summary card (e.g., 25,400).',
    });
  }

  // 2. Missing cost on items
  const missingCostItems = items.filter(i => (Number(i.costPrice) || 0) <= 0 && (Number(i.unitPrice) || 0) > 0);
  if (missingCostItems.length > 0) {
    warnings.push({
      id: 'warn-cost-missing',
      code: 'MISSING_COST',
      severity: 'WARNING',
      titleVi: `Có ${missingCostItems.length} hạng mục chưa nhập giá vốn (BUY = 0)`,
      titleEn: `${missingCostItems.length} line items have missing cost (BUY = 0)`,
      messageVi: `Các mục: ${missingCostItems.slice(0, 3).map(i => i.code).join(', ')}${missingCostItems.length > 3 ? '...' : ''} chưa có giá vốn. Biên lợi nhuận có thể bị ảo.`,
      messageEn: `Items: ${missingCostItems.slice(0, 3).map(i => i.code).join(', ')}${missingCostItems.length > 3 ? '...' : ''} have zero cost price. Profit margin calculation may be inflated.`,
      actionableSuggestionVi: 'Điền giá vốn thực tế cho từng dòng phí để phản ánh đúng lãi gộp.',
      actionableSuggestionEn: 'Enter actual buy cost prices for each line item to reflect true gross profit.',
    });
  }

  // 3. Missing sell price
  const missingSellItems = items.filter(i => (Number(i.unitPrice) || 0) <= 0);
  if (missingSellItems.length > 0) {
    warnings.push({
      id: 'warn-sell-missing',
      code: 'MISSING_SELL_PRICE',
      severity: 'WARNING',
      titleVi: `Có ${missingSellItems.length} hạng mục có đơn giá bán = 0`,
      titleEn: `${missingSellItems.length} line items have zero selling price`,
      messageVi: `Các dòng phí: ${missingSellItems.slice(0, 3).map(i => i.code).join(', ')} có giá bán bằng 0. Khách hàng sẽ thấy mục này không tính tiền.`,
      messageEn: `Items: ${missingSellItems.slice(0, 3).map(i => i.code).join(', ')} have zero selling price. Customers will see these charges as free.`,
      actionableSuggestionVi: 'Kiểm tra lại giá bán hoặc xóa dòng nếu không áp dụng.',
      actionableSuggestionEn: 'Check the selling price or remove the item if not applicable.',
    });
  }

  // 4. Gross Loss
  if (metrics.grossProfitUsd < 0) {
    warnings.push({
      id: 'warn-loss',
      code: 'LOSS',
      severity: 'CRITICAL',
      titleVi: 'BÁO GIÁ ĐANG BỊ LỖ GỘP (GROSS LOSS)',
      titleEn: 'QUOTATION AT GROSS LOSS',
      messageVi: `Tổng giá bán ($${metrics.totalSellUsd.toLocaleString()}) thấp hơn tổng giá vốn ($${metrics.totalBuyCostUsd.toLocaleString()}). Số tiền lỗ: $${Math.abs(metrics.grossProfitUsd).toLocaleString()}.`,
      messageEn: `Total selling price ($${metrics.totalSellUsd.toLocaleString()}) is below total cost ($${metrics.totalBuyCostUsd.toLocaleString()}). Net loss: $${Math.abs(metrics.grossProfitUsd).toLocaleString()}.`,
      actionableSuggestionVi: 'Tăng giá bán lên ít nhất bằng mức giá sàn an toàn để tránh thất thoát tài chính.',
      actionableSuggestionEn: 'Increase selling price to at least the minimum safe floor to prevent financial losses.',
    });
  } else if (metrics.grossMarginPercent < (policy.minimumMarginPercent || 15)) {
    // 5. Low Margin
    warnings.push({
      id: 'warn-low-margin',
      code: 'LOW_MARGIN',
      severity: 'WARNING',
      titleVi: `Biên lợi nhuận (${metrics.grossMarginPercent}%) thấp hơn mức tối thiểu (${policy.minimumMarginPercent}%)`,
      titleEn: `Gross margin (${metrics.grossMarginPercent}%) is below minimum (${policy.minimumMarginPercent}%)`,
      messageVi: `Báo giá không đạt chuẩn quy định của chính sách "${policy.policyName}". Cần có phê duyệt của cấp quản lý kinh doanh.`,
      messageEn: `Quotation does not meet the policy standard "${policy.policyName}". Requires managerial approval.`,
      actionableSuggestionVi: `Điều chỉnh giá bán lên tối thiểu $${metrics.minimumSafeSellPriceUsd.toLocaleString()} để đạt biên lãi an toàn.`,
      actionableSuggestionEn: `Adjust selling price to at least $${metrics.minimumSafeSellPriceUsd.toLocaleString()} to reach the safe margin.`,
    });
  }

  // 6. Price below minimum safe price
  if (metrics.totalSellUsd > 0 && metrics.totalSellUsd < metrics.minimumSafeSellPriceUsd) {
    warnings.push({
      id: 'warn-below-safe-price',
      code: 'PRICE_BELOW_SAFE_PRICE',
      severity: 'CRITICAL',
      titleVi: 'Giá bán hiện tại thấp hơn Giá Sàn An Toàn',
      titleEn: 'Selling Price Below Minimum Safe Price',
      messageVi: `Giá bán $${metrics.totalSellUsd.toLocaleString()} < Giá sàn an toàn $${metrics.minimumSafeSellPriceUsd.toLocaleString()} (dựa trên biên lãi tối thiểu ${policy.minimumMarginPercent}%).`,
      messageEn: `Selling price $${metrics.totalSellUsd.toLocaleString()} is below safe floor $${metrics.minimumSafeSellPriceUsd.toLocaleString()} (based on ${policy.minimumMarginPercent}% minimum margin).`,
      actionableSuggestionVi: 'Tham khảo tính năng What-If để tính lại giá bán an toàn.',
      actionableSuggestionEn: 'Use the What-If tool to simulate an adjusted safe selling price.',
    });
  }

  // 7. Discount excessive
  const discPct = metrics.discountPercent || 0;
  const maxDiscPct = policy.maximumDiscountPercent || 20;
  if (discPct > maxDiscPct) {
    warnings.push({
      id: 'warn-discount-excessive',
      code: 'DISCOUNT_TOO_HIGH',
      severity: 'WARNING',
      titleVi: `Mức chiết khấu (${discPct}%) vượt quá trần cho phép (${maxDiscPct}%)`,
      titleEn: `Discount (${discPct}%) exceeds maximum allowable limit (${maxDiscPct}%)`,
      messageVi: `Chính sách "${policy.policyName}" chỉ cho phép chiết khấu tối đa ${maxDiscPct}%. Mức chiết khấu hiện tại cần Ban Giám Đốc phê duyệt.`,
      messageEn: `Policy "${policy.policyName}" only allows up to ${maxDiscPct}% discount. Current discount requires Board approval.`,
      actionableSuggestionVi: `Giảm tỷ lệ chiết khấu xuống dưới ${maxDiscPct}%.`,
      actionableSuggestionEn: `Lower discount percentage below ${maxDiscPct}%.`,
    });
  }

  // 8. Expired & Expiring Rates
  const nowStr = new Date().toISOString().slice(0, 10);
  const nowTime = new Date(nowStr).getTime();
  const expiredItems = items.filter(i => {
    if (!i.effectiveTo) return false;
    const t = new Date(i.effectiveTo).getTime();
    return !isNaN(t) && t < nowTime;
  });
  if (expiredItems.length > 0) {
    warnings.push({
      id: 'warn-rate-expired',
      code: 'EXPIRED_RATE',
      severity: 'CRITICAL',
      titleVi: `Có ${expiredItems.length} dòng phí sử dụng Master Rate ĐÃ HẾT HẠN`,
      titleEn: `${expiredItems.length} line items use EXPIRED master rates`,
      messageVi: `Các mục: ${expiredItems.map(i => `${i.code} (Hết hạn: ${i.effectiveTo})`).join(', ')}. Giá vốn có thể đã tăng trên thị trường.`,
      messageEn: `Items: ${expiredItems.map(i => `${i.code} (Expired: ${i.effectiveTo})`).join(', ')}. Costs may have increased in the market.`,
      actionableSuggestionVi: 'Kiểm tra và cập nhật Master Rate mới nhất từ hãng tàu / nhà cung cấp.',
      actionableSuggestionEn: 'Check and update the latest Master Rates from carrier or vendor.',
    });
  }

  return warnings;
}

/**
 * Generates Actionable Smart Pricing Recommendations for Sales Decision Support
 */
export function generateSmartPricingRecommendations(
  quote: Partial<QuoteData>,
  metrics: {
    totalBuyCostUsd: number;
    totalSellUsd: number;
    grossMarginPercent: number;
    grossProfitUsd: number;
    minimumSafeSellPriceUsd: number;
    recommendedSellPriceUsd: number;
    maximumDiscountUsd: number;
    maximumDiscountPercent: number;
  },
  exchangeRate: number,
  policy: PricingPolicyItem
): PricingRecommendationItem[] {
  const recommendations: PricingRecommendationItem[] = [];

  // Recommendation 1: Price Increase to Safe Floor
  if (metrics.totalSellUsd < metrics.minimumSafeSellPriceUsd && metrics.totalBuyCostUsd > 0) {
    const deltaSell = roundCurrency(metrics.minimumSafeSellPriceUsd - metrics.totalSellUsd, 'USD');
    recommendations.push({
      id: 'rec-safe-floor',
      type: 'PRICE_INCREASE',
      titleVi: 'Nâng Giá Bán Lên Điểm Sàn An Toàn (Minimum Safe Price)',
      titleEn: 'Raise Selling Price to Minimum Safe Floor',
      descriptionVi: `Tăng tổng giá bán thêm $${deltaSell.toLocaleString()} để đạt mức giá sàn $${metrics.minimumSafeSellPriceUsd.toLocaleString()} (~ ${roundCurrency(metrics.minimumSafeSellPriceUsd * exchangeRate, 'VND').toLocaleString()} ₫), đảm bảo biên lãi tối thiểu ${policy.minimumMarginPercent}%.`,
      descriptionEn: `Increase selling price by $${deltaSell.toLocaleString()} to reach $${metrics.minimumSafeSellPriceUsd.toLocaleString()}, securing the minimum ${policy.minimumMarginPercent}% margin.`,
      suggestedSellPriceUsd: metrics.minimumSafeSellPriceUsd,
      suggestedSellPriceVnd: roundCurrency(metrics.minimumSafeSellPriceUsd * exchangeRate, 'VND'),
      expectedMarginPercent: policy.minimumMarginPercent,
      expectedProfitUsd: roundCurrency(metrics.minimumSafeSellPriceUsd - metrics.totalBuyCostUsd, 'USD'),
      impactSummaryVi: `Lợi nhuận gộp tăng thêm +$${deltaSell.toLocaleString()} (+${roundCurrency(deltaSell * exchangeRate, 'VND').toLocaleString()} ₫)`,
      impactSummaryEn: `Gross profit increases by +$${deltaSell.toLocaleString()}`,
    });
  }

  // Recommendation 2: Reach Target Margin
  if (metrics.grossMarginPercent < policy.targetMarginPercent && metrics.totalBuyCostUsd > 0) {
    const deltaTarget = roundCurrency(metrics.recommendedSellPriceUsd - metrics.totalSellUsd, 'USD');
    recommendations.push({
      id: 'rec-target-margin',
      type: 'POLICY_ALIGNMENT',
      titleVi: 'Đạt Biên Lợi Nhuận Mục Tiêu (Target Margin)',
      titleEn: 'Achieve Target Profit Margin',
      descriptionVi: `Giá bán đề xuất $${metrics.recommendedSellPriceUsd.toLocaleString()} (~ ${roundCurrency(metrics.recommendedSellPriceUsd * exchangeRate, 'VND').toLocaleString()} ₫) sẽ mang lại biên lãi chuẩn ${policy.targetMarginPercent}%, tối ưu hóa chỉ tiêu kinh doanh.`,
      descriptionEn: `Recommended selling price of $${metrics.recommendedSellPriceUsd.toLocaleString()} yields standard target margin of ${policy.targetMarginPercent}%.`,
      suggestedSellPriceUsd: metrics.recommendedSellPriceUsd,
      suggestedSellPriceVnd: roundCurrency(metrics.recommendedSellPriceUsd * exchangeRate, 'VND'),
      expectedMarginPercent: policy.targetMarginPercent,
      expectedProfitUsd: roundCurrency(metrics.recommendedSellPriceUsd - metrics.totalBuyCostUsd, 'USD'),
      impactSummaryVi: `Lợi nhuận gộp đạt $${roundCurrency(metrics.recommendedSellPriceUsd - metrics.totalBuyCostUsd, 'USD').toLocaleString()}`,
      impactSummaryEn: `Gross profit reaches $${roundCurrency(metrics.recommendedSellPriceUsd - metrics.totalBuyCostUsd, 'USD').toLocaleString()}`,
    });
  }

  // Recommendation 3: Maximum Safe Discount
  if (metrics.maximumDiscountUsd > 0) {
    recommendations.push({
      id: 'rec-discount-limit',
      type: 'DISCOUNT_LIMIT',
      titleVi: 'Hạn Mức Đàm Phán Chiết Khấu An Toàn',
      titleEn: 'Safe Negotiation Discount Limit',
      descriptionVi: `Trong đàm phán với khách hàng, nhân viên kinh doanh có thể giảm tối đa $${metrics.maximumDiscountUsd.toLocaleString()} (${metrics.maximumDiscountPercent.toFixed(1)}%) mà không làm biên lãi tụt xuống dưới ngưỡng sàn an toàn.`,
      descriptionEn: `Sales rep can discount up to $${metrics.maximumDiscountUsd.toLocaleString()} (${metrics.maximumDiscountPercent.toFixed(1)}%) without breaching the minimum safe floor.`,
      suggestedSellPriceUsd: metrics.totalSellUsd - metrics.maximumDiscountUsd,
      suggestedSellPriceVnd: roundCurrency((metrics.totalSellUsd - metrics.maximumDiscountUsd) * exchangeRate, 'VND'),
      expectedMarginPercent: policy.minimumMarginPercent,
      impactSummaryVi: `Biên lãi sau chiết khấu tối đa: ${policy.minimumMarginPercent}%`,
      impactSummaryEn: `Post-discount margin: ${policy.minimumMarginPercent}%`,
    });
  }

  return recommendations;
}

/**
 * Evaluates Normalized Margin Status
 */
export function evaluateMarginStatus(
  actualMargin: number,
  targetMargin: number,
  minimumMargin: number,
  blockMargin: number,
  totalCost: number,
  totalSell: number
): MarginStatus {
  if (totalCost <= 0) return 'NO_COST';
  if (totalSell <= 0) return 'NO_SELL';
  if (actualMargin < blockMargin) return 'BLOCKED';
  if (actualMargin < minimumMargin) return 'BELOW_MINIMUM';
  if (actualMargin < targetMargin - 0.5) return 'BELOW_TARGET';
  if (Math.abs(actualMargin - targetMargin) <= 0.5) return 'AT_TARGET';
  return 'ABOVE_TARGET';
}

/**
 * Evaluates Multi-Tier Approval Level based on Policy Thresholds
 */
export function evaluateApprovalLevel(
  actualMargin: number,
  policy: PricingPolicyItem
): ApprovalLevel {
  const t = policy.approvalThresholds;
  if (actualMargin < t.blockMargin) return 'BLOCKED';
  if (actualMargin < t.managementApprovalMargin) return 'MANAGEMENT';
  if (actualMargin < t.salesManagerApprovalMargin) return 'SALES_MANAGER';
  return 'AUTO_ELIGIBLE';
}

/**
 * Generates natural language explanation for pricing status
 */
export function generatePricingExplanations(
  actualMargin: number,
  targetMargin: number,
  minimumMargin: number,
  approvalLevel: ApprovalLevel,
  policyName: string,
  currency: Currency,
  totalProfit: number
): { vi: string; en: string } {
  const profitStr = `${totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  
  if (approvalLevel === 'AUTO_ELIGIBLE') {
    return {
      vi: `Biên lãi gộp ${actualMargin}% đạt mục tiêu (≥ ${targetMargin}% theo ${policyName}). Đủ điều kiện xuất báo giá tự động (${profitStr}).`,
      en: `Gross margin of ${actualMargin}% meets target (≥ ${targetMargin}% per ${policyName}). Auto-eligible for issuance (${profitStr}).`,
    };
  }
  if (approvalLevel === 'SALES_MANAGER') {
    return {
      vi: `Biên lãi gộp ${actualMargin}% dưới mục tiêu (${targetMargin}%), đạt mức tối thiểu (${minimumMargin}%). Cần Trưởng phòng kinh doanh duyệt (${profitStr}).`,
      en: `Gross margin of ${actualMargin}% is below target (${targetMargin}%) but above minimum (${minimumMargin}%). Sales Manager approval required (${profitStr}).`,
    };
  }
  if (approvalLevel === 'MANAGEMENT') {
    return {
      vi: `CẢNH BÁO: Biên lãi ${actualMargin}% thấp hơn mức tối thiểu (${minimumMargin}%). Yêu cầu Ban Giám Đốc phê duyệt với giải trình lý do (${profitStr}).`,
      en: `WARNING: Gross margin ${actualMargin}% is below minimum acceptable threshold (${minimumMargin}%). Board / Director approval with justification required (${profitStr}).`,
    };
  }
  return {
    vi: `BỊ CHẶN: Biên lãi gộp ${actualMargin}% vi phạm ngưỡng sàn cho phép của công ty. Không thể phát hành báo giá này.`,
    en: `BLOCKED: Gross margin ${actualMargin}% violates the company floor threshold. Quotation cannot be issued.`,
  };
}

/**
 * Computes complete Profit & Margin Summary for an entire quotation
 * Performance: O(n) where n is quotation items count. Zero network calls.
 */
export function calculateCompleteProfitSummary(
  quote: Partial<QuoteData>,
  policy: PricingPolicyItem = DEFAULT_GLOBAL_PRICING_POLICY,
  presentationCurrency: Currency = 'USD'
): ProfitMarginSummary {
  const exchangeRate = Number(quote.exchangeRate) > 0 ? Number(quote.exchangeRate) : 25400;
  const items = Array.isArray(quote.items) ? quote.items : [];

  let totalCostUsd = 0;
  let totalCostVnd = 0;
  let totalSellUsd = 0;
  let totalSellVnd = 0;

  const lineDetails: LineProfitabilityDetail[] = [];

  for (const item of items) {
    // 1. Line Cost
    const costUnit = Number(item.costPrice) || 0;
    const qty = Number(item.quantity) || 1;
    const lineCost = costUnit * qty;
    let costUsd = 0;
    let costVnd = 0;

    if (item.currency === 'VND') {
      costVnd = lineCost;
      costUsd = lineCost / exchangeRate;
    } else {
      costUsd = lineCost;
      costVnd = lineCost * exchangeRate;
    }
    totalCostUsd += costUsd;
    totalCostVnd += costVnd;

    // 2. Line Sell
    const sellUsd = Number(item.amountUsd) || (item.currency === 'USD' ? (Number(item.unitPrice) || 0) * qty : ((Number(item.unitPrice) || 0) * qty) / exchangeRate);
    const sellVnd = Number(item.amountVnd) || (item.currency === 'VND' ? (Number(item.unitPrice) || 0) * qty : ((Number(item.unitPrice) || 0) * qty) * exchangeRate);
    totalSellUsd += sellUsd;
    totalSellVnd += sellVnd;

    // 3. Line Profitability
    const lineProfitUsd = sellUsd - costUsd;
    const lineProfitVnd = sellVnd - costVnd;
    const lineMargin = sellUsd > 0 ? (lineProfitUsd / sellUsd) * 100 : 0;
    const lineMarkup = costUsd > 0 ? (lineProfitUsd / costUsd) * 100 : 0;

    lineDetails.push({
      itemId: item.id,
      code: item.code,
      description: item.description,
      category: item.category,
      location: item.location,
      currency: item.currency,
      quantity: qty,
      unit: item.unit,
      costUnitPrice: costUnit,
      sellUnitPrice: Number(item.unitPrice) || 0,
      totalCostUsd: roundCurrency(costUsd, 'USD'),
      totalCostVnd: roundCurrency(costVnd, 'VND'),
      totalSellUsd: roundCurrency(sellUsd, 'USD'),
      totalSellVnd: roundCurrency(sellVnd, 'VND'),
      profitUsd: roundCurrency(lineProfitUsd, 'USD'),
      profitVnd: roundCurrency(lineProfitVnd, 'VND'),
      marginPercent: Math.round((lineMargin + Number.EPSILON) * 100) / 100,
      markupPercent: Math.round((lineMarkup + Number.EPSILON) * 100) / 100,
      priceSource: item.priceSource,
      priceTraceability: item.priceTraceability,
    });
  }

  // Round Totals
  const finalCostUsd = roundCurrency(totalCostUsd, 'USD');
  const finalCostVnd = roundCurrency(totalCostVnd, 'VND');
  const finalSellUsd = roundCurrency(totalSellUsd, 'USD');
  const finalSellVnd = roundCurrency(totalSellVnd, 'VND');

  const grossProfitUsd = roundCurrency(finalSellUsd - finalCostUsd, 'USD');
  const grossProfitVnd = roundCurrency(finalSellVnd - finalCostVnd, 'VND');

  const grossMarginPercent = calculateGrossMarginPercent(grossProfitUsd, finalSellUsd);
  const markupPercent = calculateMarkupPercent(grossProfitUsd, finalCostUsd);

  // Policy & Thresholds
  const targetMargin = policy.targetMarginPercent;
  const minMargin = policy.minimumMarginPercent;
  const targetProfitUsd = policy.targetProfitAmount || 0;
  const minProfitUsd = policy.minimumProfitAmount || 0;

  // Recommendations & Floor
  const recSellUsd = roundCurrency(calculateRecommendedSellPrice(finalCostUsd, targetMargin, targetProfitUsd), 'USD');
  const recSellVnd = roundCurrency(recSellUsd * exchangeRate, 'VND');

  const minSellUsd = roundCurrency(calculateMinimumSellPrice(finalCostUsd, minMargin, minProfitUsd, policy.priceFloorType), 'USD');
  const minSellVnd = roundCurrency(minSellUsd * exchangeRate, 'VND');

  const discountCalc = calculateMaximumDiscount(finalSellUsd, minSellUsd);

  // Status & Approval
  const marginStatus = evaluateMarginStatus(
    grossMarginPercent, 
    targetMargin, 
    minMargin, 
    policy.approvalThresholds.blockMargin,
    finalCostUsd, 
    finalSellUsd
  );
  const approvalLevel = evaluateApprovalLevel(grossMarginPercent, policy);

  const activeProfit = presentationCurrency === 'VND' ? grossProfitVnd : grossProfitUsd;
  const explanations = generatePricingExplanations(
    grossMarginPercent, 
    targetMargin, 
    minMargin, 
    approvalLevel, 
    policy.policyName, 
    presentationCurrency, 
    activeProfit
  );

  // Phase 28: Minimum Safe Selling Price Floor
  const safeFloorCalc = calculateMinimumSafeSellingPrice(
    finalCostUsd, 
    exchangeRate, 
    policy,
    (quote as any)?.customerPricingRule
  );

  // Phase 28: Price Risk Level Evaluation
  const priceRiskLevel = evaluatePriceRiskLevel(
    grossMarginPercent,
    grossProfitUsd,
    policy,
    finalCostUsd,
    finalSellUsd
  );

  // Phase 28: Discount Intelligence
  const quoteDiscountPercent = Number(quote.discountPercent) || 0;
  const quoteDiscountAmountUsd = Number(quote.discountAmountUsd) || 0;
  const discountIntelligence = calculateDiscountIntelligence(
    finalSellUsd,
    finalSellVnd,
    quoteDiscountPercent,
    quoteDiscountAmountUsd,
    exchangeRate,
    finalCostUsd,
    safeFloorCalc.minimumSafeSellPriceUsd
  );

  // Phase 28: Rate Source Traceability
  const rateSourceTraceability = auditRateSourceTraceability(items);

  // Phase 28: Pricing Warnings
  const pricingWarnings = auditPricingWarnings(
    quote,
    items,
    {
      totalBuyCostUsd: finalCostUsd,
      totalSellUsd: finalSellUsd,
      grossMarginPercent,
      grossProfitUsd,
      minimumSafeSellPriceUsd: safeFloorCalc.minimumSafeSellPriceUsd,
      maximumDiscountPercent: discountCalc.maxDiscountPercent,
      discountPercent: quoteDiscountPercent,
      discountAmountUsd: quoteDiscountAmountUsd,
    },
    exchangeRate,
    policy
  );

  // Phase 28: Smart Pricing Recommendations
  const pricingRecommendations = generateSmartPricingRecommendations(
    quote,
    {
      totalBuyCostUsd: finalCostUsd,
      totalSellUsd: finalSellUsd,
      grossMarginPercent,
      grossProfitUsd,
      minimumSafeSellPriceUsd: safeFloorCalc.minimumSafeSellPriceUsd,
      recommendedSellPriceUsd: recSellUsd,
      maximumDiscountUsd: discountCalc.maxDiscountAmount,
      maximumDiscountPercent: discountCalc.maxDiscountPercent,
    },
    exchangeRate,
    policy
  );

  return {
    totalBuyCostUsd: finalCostUsd,
    totalBuyCostVnd: finalCostVnd,
    totalSellUsd: finalSellUsd,
    totalSellVnd: finalSellVnd,
    grossProfitUsd,
    grossProfitVnd,
    grossMarginPercent,
    markupPercent,
    targetMarginPercent: targetMargin,
    minimumMarginPercent: minMargin,
    targetProfitUsd,
    minimumProfitUsd: minProfitUsd,
    recommendedSellPriceUsd: recSellUsd,
    recommendedSellPriceVnd: recSellVnd,
    minimumSellPriceUsd: minSellUsd,
    minimumSellPriceVnd: minSellVnd,
    maximumDiscountUsd: discountCalc.maxDiscountAmount,
    maximumDiscountPercent: discountCalc.maxDiscountPercent,
    marginStatus,
    priceRiskLevel,
    approvalLevel,
    isBelowTarget: grossMarginPercent < targetMargin,
    isBelowMinimum: grossMarginPercent < minMargin,
    isBlocked: approvalLevel === 'BLOCKED',
    minimumSafeSellPriceUsd: safeFloorCalc.minimumSafeSellPriceUsd,
    minimumSafeSellPriceVnd: safeFloorCalc.minimumSafeSellPriceVnd,
    isMinimumMarginRuleConfigured: safeFloorCalc.isConfigured,
    minimumMarginRuleSource: safeFloorCalc.source,
    discountIntelligence,
    statusExplanationVi: explanations.vi,
    statusExplanationEn: explanations.en,
    policySnapshot: {
      policyId: policy.id,
      policyCode: policy.policyCode,
      policyName: policy.policyName,
      scope: policy.scope,
      version: policy.version,
    },
    lineDetails,
    pricingWarnings,
    pricingRecommendations,
    rateSourceTraceability,
  };
}

/**
 * Generates Side-by-Side Multi-Scenario Comparison (Current vs Target Margin vs Discount vs Price Floor)
 * 100% Client-side and non-destructive.
 */
export function generateMultiScenarioComparison(
  quote: Partial<QuoteData>,
  policy: PricingPolicyItem = DEFAULT_GLOBAL_PRICING_POLICY,
  presentationCurrency: Currency = 'USD'
): PricingScenarioComparison {
  const currentSummary = calculateCompleteProfitSummary(quote, policy, presentationCurrency);

  // Scenario Current
  const currentReq: WhatIfScenarioRequest = {
    mode: 'DIRECT_SELL',
    targetSellPrice: presentationCurrency === 'VND' ? currentSummary.totalSellVnd : currentSummary.totalSellUsd,
    currency: presentationCurrency,
  };
  const currentResult = simulateWhatIfPricing(quote, currentReq, policy);

  // Scenario A: Target Margin (e.g. 20%)
  const scenarioAReq: WhatIfScenarioRequest = {
    mode: 'TARGET_MARGIN',
    targetMarginPercent: policy.targetMarginPercent,
    currency: presentationCurrency,
  };
  const scenarioAResult = simulateWhatIfPricing(quote, scenarioAReq, policy);

  // Scenario B: Competitive Discount (e.g. 5% discount)
  const scenarioBReq: WhatIfScenarioRequest = {
    mode: 'DISCOUNT_PERCENT',
    discountPercent: 5,
    currency: presentationCurrency,
  };
  const scenarioBResult = simulateWhatIfPricing(quote, scenarioBReq, policy);

  // Scenario C: Safe Floor (Minimum Margin)
  const scenarioCReq: WhatIfScenarioRequest = {
    mode: 'TARGET_MARGIN',
    targetMarginPercent: policy.minimumMarginPercent,
    currency: presentationCurrency,
  };
  const scenarioCResult = simulateWhatIfPricing(quote, scenarioCReq, policy);

  return {
    current: currentResult,
    scenarioA: scenarioAResult,
    scenarioB: scenarioBResult,
    scenarioC: scenarioCResult,
  };
}

/**
 * What-If Pricing Calculator (100% LOCAL Execution, Zero Firestore reads/writes)
 * Calculates the exact financial impact of interactive parameter changes
 */
export function simulateWhatIfPricing(
  originalQuote: Partial<QuoteData>,
  scenario: WhatIfScenarioRequest,
  policy: PricingPolicyItem = DEFAULT_GLOBAL_PRICING_POLICY
): WhatIfScenarioResult {
  const exchangeRate = Number(originalQuote.exchangeRate) > 0 ? Number(originalQuote.exchangeRate) : 25400;
  const currency = scenario.currency || originalQuote.quoteCurrency || 'USD';
  
  // Baseline
  const originalSummary = calculateCompleteProfitSummary(originalQuote, policy, currency);
  const baseCostUsd = originalSummary.totalBuyCostUsd;
  const currentSellUsd = originalSummary.totalSellUsd;

  let simulatedSellUsd = currentSellUsd;

  switch (scenario.mode) {
    case 'TARGET_MARGIN': {
      const margin = Number(scenario.targetMarginPercent) || 0;
      simulatedSellUsd = calculateRecommendedSellPrice(baseCostUsd, margin, 0);
      break;
    }
    case 'DIRECT_SELL': {
      const inputPrice = Number(scenario.targetSellPrice) || 0;
      simulatedSellUsd = currency === 'VND' ? inputPrice / exchangeRate : inputPrice;
      break;
    }
    case 'DISCOUNT_PERCENT': {
      const disc = Math.min(Math.max(Number(scenario.discountPercent) || 0, 0), 100);
      simulatedSellUsd = currentSellUsd * (1 - disc / 100);
      break;
    }
    case 'TARGET_PROFIT': {
      const profitInput = Number(scenario.targetProfitAmount) || 0;
      const profitUsd = currency === 'VND' ? profitInput / exchangeRate : profitInput;
      simulatedSellUsd = baseCostUsd + profitUsd;
      break;
    }
  }

  simulatedSellUsd = Math.max(0, roundCurrency(simulatedSellUsd, 'USD'));
  const simulatedSellVnd = roundCurrency(simulatedSellUsd * exchangeRate, 'VND');

  // Scale line items proportionally for realistic simulated preview
  const scaleRatio = currentSellUsd > 0 ? simulatedSellUsd / currentSellUsd : 1;
  const simulatedItems = (originalQuote.items || []).map(item => {
    const origUnitPrice = Number(item.unitPrice) || 0;
    const newUnitPrice = origUnitPrice * scaleRatio;
    const roundedUnitPrice = roundCurrency(newUnitPrice, item.currency);
    const qty = Number(item.quantity) || 1;
    const lineAmount = roundedUnitPrice * qty;
    const lineUsd = item.currency === 'USD' ? lineAmount : lineAmount / exchangeRate;
    const lineVnd = item.currency === 'VND' ? lineAmount : lineAmount * exchangeRate;

    return {
      ...item,
      unitPrice: roundedUnitPrice,
      amountUsd: roundCurrency(lineUsd, 'USD'),
      amountVnd: roundCurrency(lineVnd, 'VND'),
    };
  });

  const simulatedQuote: Partial<QuoteData> = {
    ...originalQuote,
    items: simulatedItems,
  };

  const simulatedSummary = calculateCompleteProfitSummary(simulatedQuote, policy, currency);

  // Compare diffs
  const diffSellUsd = roundCurrency(simulatedSummary.totalSellUsd - originalSummary.totalSellUsd, 'USD');
  const diffSellVnd = roundCurrency(simulatedSummary.totalSellVnd - originalSummary.totalSellVnd, 'VND');
  const diffProfitUsd = roundCurrency(simulatedSummary.grossProfitUsd - originalSummary.grossProfitUsd, 'USD');
  const diffProfitVnd = roundCurrency(simulatedSummary.grossProfitVnd - originalSummary.grossProfitVnd, 'VND');
  const diffMarginPercent = Math.round((simulatedSummary.grossMarginPercent - originalSummary.grossMarginPercent + Number.EPSILON) * 100) / 100;

  const isPriceFloorViolated = simulatedSummary.totalSellUsd < simulatedSummary.minimumSellPriceUsd;
  const requiresManagerApproval = simulatedSummary.approvalLevel === 'SALES_MANAGER';
  const requiresDirectorApproval = simulatedSummary.approvalLevel === 'MANAGEMENT';
  const isFeasible = simulatedSummary.approvalLevel !== 'BLOCKED';

  let warningVi: string | undefined;
  let warningEn: string | undefined;

  if (isPriceFloorViolated) {
    warningVi = `Giá bán mô phỏng ($${simulatedSummary.totalSellUsd.toLocaleString()}) thấp hơn Giá sàn ($${simulatedSummary.minimumSellPriceUsd.toLocaleString()}). Yêu cầu giải trình lý do.`;
    warningEn = `Simulated selling price ($${simulatedSummary.totalSellUsd.toLocaleString()}) is below Price Floor ($${simulatedSummary.minimumSellPriceUsd.toLocaleString()}). Justification required.`;
  } else if (requiresManagerApproval) {
    warningVi = `Biên lãi mô phỏng (${simulatedSummary.grossMarginPercent}%) cần Trưởng phòng kinh doanh phê duyệt.`;
    warningEn = `Simulated margin (${simulatedSummary.grossMarginPercent}%) requires Sales Manager approval.`;
  }

  return {
    request: scenario,
    originalSummary,
    simulatedSummary,
    diffSellUsd,
    diffSellVnd,
    diffProfitUsd,
    diffProfitVnd,
    diffMarginPercent,
    isFeasible,
    requiresManagerApproval,
    requiresDirectorApproval,
    isPriceFloorViolated,
    warningMessageVi: warningVi,
    warningMessageEn: warningEn,
  };
}
