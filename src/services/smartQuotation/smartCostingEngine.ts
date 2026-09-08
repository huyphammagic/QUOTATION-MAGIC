import { LineItem, Currency, FeeCategory, ChargeLocation } from '../../types/logistics';
import { ChargeBasis } from '../../types/pricing';
import { MatchedRateCandidate, PricingWarningItem } from '../../types/smartQuotation';
import { PricingPolicyItem } from '../../types/pricingIntelligence';

export type SellingPriceMethod = 
  | 'COST_PLUS'        // Giá vốn + % Markup
  | 'TARGET_MARGIN'    // Biên lãi mục tiêu (% Target Margin)
  | 'POLICY_RULE'      // Theo chính sách giá đã duyệt (Pricing Policy)
  | 'CONTRACT_SELL'    // Giá bán cố định theo Hợp đồng
  | 'MANUAL';          // Nhập thủ công (Theo quyền Sales/Pricing)

export interface CostingItem {
  id: string;
  code: string;
  description: string;
  category: FeeCategory;
  location: ChargeLocation;
  basis: ChargeBasis;
  quantity: number;
  unit: string;
  currency: Currency;
  
  // Cost (Buy)
  buyRate: number;
  buyAmount: number;
  buyAmountUsd: number;
  buyAmountVnd: number;
  sourceType?: string;
  sourceReference?: string;
  validity?: string;

  // Sell
  sellRate: number;
  sellAmount: number;
  sellAmountUsd: number;
  sellAmountVnd: number;
  vatRate: number;
  vatAmountUsd: number;
  vatAmountVnd: number;
  totalWithVatUsd: number;
  totalWithVatVnd: number;

  // Profitability
  profitUsd: number;
  profitVnd: number;
  marginPercent: number;

  // Override info
  isPriceOverridden?: boolean;
  originalSellRate?: number;
  overrideReason?: string;
}

export interface CostingSummary {
  items: CostingItem[];
  totalBuyUsd: number;
  totalBuyVnd: number;
  totalSellUsd: number;
  totalSellVnd: number;
  grossProfitUsd: number;
  grossProfitVnd: number;
  grossMarginPercent: number;
  vatTotalUsd: number;
  vatTotalVnd: number;
  grandTotalUsd: number;
  grandTotalVnd: number;
  exchangeRate: number;
  isExchangeRateAvailable: boolean;
  warnings: PricingWarningItem[];
}

/**
 * Converts MatchedRateCandidate to CostingItem with real pricing formulas
 */
export function convertCandidateToCostingItem(
  candidate: MatchedRateCandidate,
  quantity: number = 1,
  exchangeRate: number = 25400,
  sellingMethod: SellingPriceMethod = 'TARGET_MARGIN',
  targetMarginPercent: number = 15,
  markupPercent: number = 20,
  activePolicy?: PricingPolicyItem
): CostingItem {
  const buyRate = candidate.buyRate || 0;
  const buyAmount = buyRate * quantity;
  
  let buyAmountUsd = 0;
  let buyAmountVnd = 0;
  if (candidate.currency === 'USD') {
    buyAmountUsd = buyAmount;
    buyAmountVnd = exchangeRate > 0 ? buyAmount * exchangeRate : 0;
  } else {
    buyAmountVnd = buyAmount;
    buyAmountUsd = exchangeRate > 0 ? buyAmount / exchangeRate : 0;
  }

  // Determine Sell Rate based on method
  let sellRate = candidate.sellRate;
  if (sellingMethod === 'COST_PLUS') {
    sellRate = buyRate * (1 + markupPercent / 100);
  } else if (sellingMethod === 'TARGET_MARGIN') {
    if (targetMarginPercent < 100) {
      sellRate = buyRate / (1 - targetMarginPercent / 100);
    } else {
      sellRate = buyRate * 1.2;
    }
  } else if (sellingMethod === 'POLICY_RULE' && activePolicy) {
    const policyMargin = activePolicy.targetMarginPercent;
    sellRate = buyRate / (1 - policyMargin / 100);
  } else if (sellingMethod === 'CONTRACT_SELL') {
    sellRate = candidate.sellRate || buyRate;
  }

  // Ensure 2 decimal places for USD, rounded for VND
  sellRate = candidate.currency === 'USD' ? Math.round(sellRate * 100) / 100 : Math.round(sellRate);
  const sellAmount = sellRate * quantity;

  let sellAmountUsd = 0;
  let sellAmountVnd = 0;
  if (candidate.currency === 'USD') {
    sellAmountUsd = sellAmount;
    sellAmountVnd = exchangeRate > 0 ? sellAmount * exchangeRate : 0;
  } else {
    sellAmountVnd = sellAmount;
    sellAmountUsd = exchangeRate > 0 ? sellAmount / exchangeRate : 0;
  }

  // VAT
  const vatRate = candidate.vatRate || 0;
  const vatAmountUsd = Math.round(sellAmountUsd * (vatRate / 100) * 100) / 100;
  const vatAmountVnd = Math.round(sellAmountVnd * (vatRate / 100));

  // Profit
  const profitUsd = Math.round((sellAmountUsd - buyAmountUsd) * 100) / 100;
  const profitVnd = Math.round(sellAmountVnd - buyAmountVnd);
  const marginPercent = sellAmountUsd > 0 ? Math.round((profitUsd / sellAmountUsd) * 10000) / 100 : 0;

  return {
    id: candidate.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    code: candidate.chargeCode,
    description: candidate.chargeName,
    category: candidate.category,
    location: candidate.location,
    basis: candidate.basis,
    quantity,
    unit: candidate.unit,
    currency: candidate.currency,
    buyRate,
    buyAmount,
    buyAmountUsd,
    buyAmountVnd,
    sourceType: candidate.sourceType,
    sourceReference: candidate.sourceReference,
    validity: candidate.validFrom && candidate.validTo ? `${candidate.validFrom} - ${candidate.validTo}` : undefined,
    sellRate,
    sellAmount,
    sellAmountUsd,
    sellAmountVnd,
    vatRate,
    vatAmountUsd,
    vatAmountVnd,
    totalWithVatUsd: Math.round((sellAmountUsd + vatAmountUsd) * 100) / 100,
    totalWithVatVnd: Math.round(sellAmountVnd + vatAmountVnd),
    profitUsd,
    profitVnd,
    marginPercent,
  };
}

/**
 * Calculates full quotation profitability, totals, and generates real-data pricing warnings
 */
export function calculateCostingSummary(
  items: CostingItem[],
  exchangeRate: number,
  policy?: PricingPolicyItem
): CostingSummary {
  const isExchangeRateAvailable = typeof exchangeRate === 'number' && exchangeRate > 0;
  const warnings: PricingWarningItem[] = [];

  if (!isExchangeRateAvailable) {
    warnings.push({
      id: 'warn-ex-rate',
      code: 'CURRENCY_MISMATCH',
      type: 'CURRENCY_MISMATCH',
      severity: 'CRITICAL',
      titleVi: 'Chưa có tỷ giá quy đổi',
      titleEn: 'Exchange rate unavailable',
      detailVi: 'Tỷ giá hối đoái chưa được xác định. Không thể tính toán quy đổi chính xác giữa USD và VND.',
      detailEn: 'Exchange rate is missing or 0. Conversion between USD and VND cannot be accurately computed.',
    });
  }

  let totalBuyUsd = 0;
  let totalBuyVnd = 0;
  let totalSellUsd = 0;
  let totalSellVnd = 0;
  let vatTotalUsd = 0;
  let vatTotalVnd = 0;

  items.forEach((item, idx) => {
    totalBuyUsd += item.buyAmountUsd;
    totalBuyVnd += item.buyAmountVnd;
    totalSellUsd += item.sellAmountUsd;
    totalSellVnd += item.sellAmountVnd;
    vatTotalUsd += item.vatAmountUsd;
    vatTotalVnd += item.vatAmountVnd;

    // Check line negative margin
    if (item.buyAmountUsd > 0 && item.sellAmountUsd < item.buyAmountUsd) {
      warnings.push({
        id: `warn-neg-margin-${idx}`,
        code: 'NEGATIVE_MARGIN',
        type: 'NEGATIVE_MARGIN',
        severity: 'CRITICAL',
        titleVi: `Hạng mục [${item.description}] bị lỗ`,
        titleEn: `Line item [${item.description}] has negative profit`,
        detailVi: `Giá bán (${item.sellRate} ${item.currency}) thấp hơn giá vốn (${item.buyRate} ${item.currency}). Lỗ: ${item.profitUsd} USD.`,
        detailEn: `Selling price (${item.sellRate}) is lower than cost (${item.buyRate}). Negative profit: ${item.profitUsd} USD.`,
      });
    }

    // Check missing cost
    if (item.buyRate === 0) {
      warnings.push({
        id: `warn-missing-cost-${idx}`,
        code: 'MISSING_COST',
        type: 'MISSING_COST',
        severity: 'WARNING',
        titleVi: `Chưa có giá vốn cho [${item.description}]`,
        titleEn: `Missing cost price for [${item.description}]`,
        detailVi: `Hạng mục chưa có giá vốn mua vào từ nhà cung cấp hoặc hợp đồng.`,
        detailEn: `Line item does not have a registered buy cost from supplier or contract.`,
      });
    }

    // Check manual override without reason
    if (item.isPriceOverridden && !item.overrideReason) {
      warnings.push({
        id: `warn-override-reason-${idx}`,
        code: 'PRICE_OVERRIDE',
        type: 'PRICE_OVERRIDE',
        severity: 'WARNING',
        titleVi: `Cần bổ sung lý do điều chỉnh giá [${item.description}]`,
        titleEn: `Price override reason required for [${item.description}]`,
        detailVi: `Giá bán đã được ghi đè thủ công nhưng chưa nhập lý do giải trình.`,
        detailEn: `Selling price was manually overridden without an explanation reason.`,
      });
    }
  });

  const grossProfitUsd = Math.round((totalSellUsd - totalBuyUsd) * 100) / 100;
  const grossProfitVnd = Math.round(totalSellVnd - totalBuyVnd);
  const grossMarginPercent = totalSellUsd > 0 ? Math.round((grossProfitUsd / totalSellUsd) * 10000) / 100 : 0;

  // Check quote-level Low Margin against policy if policy exists
  if (policy && policy.minimumMarginPercent) {
    if (grossMarginPercent < policy.minimumMarginPercent) {
      warnings.push({
        id: 'warn-low-margin-policy',
        code: 'LOW_MARGIN',
        type: 'LOW_MARGIN',
        severity: 'CRITICAL',
        titleVi: `Biên lợi nhuận (${grossMarginPercent}%) thấp hơn mức tối thiểu (${policy.minimumMarginPercent}%)`,
        titleEn: `Gross margin (${grossMarginPercent}%) is below minimum threshold (${policy.minimumMarginPercent}%)`,
        detailVi: `Chính sách giá [${policy.policyName}] yêu cầu biên lãi tối thiểu ${policy.minimumMarginPercent}%. Cần Trưởng phòng kinh doanh phê duyệt.`,
        detailEn: `Policy [${policy.policyName}] requires at least ${policy.minimumMarginPercent}% margin. Requires managerial approval.`,
      });
    }
  }

  // Overall negative profit warning
  if (grossProfitUsd < 0) {
    warnings.push({
      id: 'warn-quote-negative-profit',
      code: 'NEGATIVE_MARGIN',
      type: 'NEGATIVE_MARGIN',
      severity: 'CRITICAL',
      titleVi: 'Tổng báo giá đang bị lỗ',
      titleEn: 'Entire quotation has negative gross profit',
      detailVi: `Tổng doanh thu bán (${totalSellUsd} USD) thấp hơn tổng giá vốn mua (${totalBuyUsd} USD). Lỗ gộp: ${grossProfitUsd} USD.`,
      detailEn: `Total sell revenue (${totalSellUsd} USD) is lower than total buy cost (${totalBuyUsd} USD). Negative profit: ${grossProfitUsd} USD.`,
    });
  }

  return {
    items,
    totalBuyUsd: Math.round(totalBuyUsd * 100) / 100,
    totalBuyVnd: Math.round(totalBuyVnd),
    totalSellUsd: Math.round(totalSellUsd * 100) / 100,
    totalSellVnd: Math.round(totalSellVnd),
    grossProfitUsd,
    grossProfitVnd,
    grossMarginPercent,
    vatTotalUsd: Math.round(vatTotalUsd * 100) / 100,
    vatTotalVnd: Math.round(vatTotalVnd),
    grandTotalUsd: Math.round((totalSellUsd + vatTotalUsd) * 100) / 100,
    grandTotalVnd: Math.round(totalSellVnd + vatTotalVnd),
    exchangeRate,
    isExchangeRateAvailable,
    warnings,
  };
}

/**
 * Converts CostingItem[] into standard LineItem[] for compatibility with existing quotation system
 */
export function convertCostingItemsToLineItems(costingItems: CostingItem[], exchangeRate: number): LineItem[] {
  return costingItems.map((ci) => ({
    id: ci.id,
    code: ci.code,
    description: ci.description,
    category: ci.category,
    location: ci.location,
    basis: ci.basis,
    quantity: ci.quantity,
    unit: ci.unit,
    currency: ci.currency,
    unitPrice: ci.sellRate,
    costPrice: ci.buyRate,
    vatRate: ci.vatRate,
    amountUsd: ci.sellAmountUsd,
    amountVnd: ci.sellAmountVnd,
    costTotalUsd: ci.buyAmountUsd,
    costTotalVnd: ci.buyAmountVnd,
    vatAmountUsd: ci.vatAmountUsd,
    vatAmountVnd: ci.vatAmountVnd,
    totalWithVatUsd: ci.totalWithVatUsd,
    totalWithVatVnd: ci.totalWithVatVnd,
    profitUsd: ci.profitUsd,
    profitVnd: ci.profitVnd,
    marginPercent: ci.marginPercent,
    isManualOverride: ci.isPriceOverridden,
    overrideReason: ci.overrideReason,
    rateSourceReference: ci.sourceReference,
  }));
}
