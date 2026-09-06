import { Currency, LineItem, QuoteData } from '../../types/logistics';
import { 
  ProfitMarginSummary, 
  PricingPolicyItem, 
  MarginStatus, 
  ApprovalLevel, 
  LineProfitabilityDetail,
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
    approvalLevel,
    isBelowTarget: grossMarginPercent < targetMargin,
    isBelowMinimum: grossMarginPercent < minMargin,
    isBlocked: approvalLevel === 'BLOCKED',
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
