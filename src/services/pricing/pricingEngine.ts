import { LineItem, QuoteData, FeeCategory, ChargeLocation, ShipmentDetails } from '../../types/logistics';
import { 
  GroupPricingBreakdown, 
  QuotePricingSummary, 
  PricingConfig, 
  ValidationResult,
  PercentageBase 
} from '../../types/pricing';
import { 
  calculateLineItemFull, 
  DEFAULT_PRICING_CONFIG, 
  calculateAirChargeableWeight, 
  calculateLclChargeableWm 
} from './chargeCalculator';
import { roundCurrency } from './currencyCalculator';
import { calculateOverallMargin, calculateProfitAndMargin } from './profitCalculator';
import { validateQuote } from './validationEngine';

/**
 * Creates an empty group breakdown object
 */
function createEmptyGroupBreakdown(label: string): GroupPricingBreakdown {
  return {
    label,
    count: 0,
    costUsd: 0,
    costVnd: 0,
    sellUsd: 0,
    sellVnd: 0,
    profitUsd: 0,
    profitVnd: 0,
    marginPercent: 0,
    vatUsd: 0,
    vatVnd: 0,
    grandTotalUsd: 0,
    grandTotalVnd: 0,
  };
}

/**
 * Accumulates a line item into a group breakdown
 */
function accumulateLineIntoGroup(group: GroupPricingBreakdown, item: LineItem) {
  group.count += 1;
  group.costUsd += item.costTotalUsd || 0;
  group.costVnd += item.costTotalVnd || 0;
  group.sellUsd += item.amountUsd || 0;
  group.sellVnd += item.amountVnd || 0;
  group.vatUsd += item.vatAmountUsd || 0;
  group.vatVnd += item.vatAmountVnd || 0;
  group.grandTotalUsd += item.totalWithVatUsd || 0;
  group.grandTotalVnd += item.totalWithVatVnd || 0;
  group.profitUsd += item.profitUsd || 0;
  group.profitVnd += item.profitVnd || 0;
}

/**
 * Finalizes rounding and margin calculation for a group breakdown
 */
function finalizeGroupBreakdown(group: GroupPricingBreakdown): GroupPricingBreakdown {
  const sellUsd = roundCurrency(group.sellUsd, 'USD');
  const costUsd = roundCurrency(group.costUsd, 'USD');
  const profitCalc = calculateProfitAndMargin(sellUsd, costUsd, 'USD');

  return {
    ...group,
    costUsd,
    costVnd: roundCurrency(group.costVnd, 'VND'),
    sellUsd,
    sellVnd: roundCurrency(group.sellVnd, 'VND'),
    profitUsd: profitCalc.profit,
    profitVnd: roundCurrency(group.profitVnd, 'VND'),
    marginPercent: profitCalc.marginPercent,
    vatUsd: roundCurrency(group.vatUsd, 'USD'),
    vatVnd: roundCurrency(group.vatVnd, 'VND'),
    grandTotalUsd: roundCurrency(group.grandTotalUsd, 'USD'),
    grandTotalVnd: roundCurrency(group.grandTotalVnd, 'VND'),
  };
}

/**
 * Helper to resolve percentage base amount from currently computed line items
 */
function getPercentageBaseAmount(
  baseType: PercentageBase | undefined,
  currentItems: LineItem[],
  currency: 'USD' | 'VND'
): number {
  if (!baseType) return 0;

  const getAmount = (item: LineItem) => currency === 'USD' ? (item.amountUsd || 0) : (item.amountVnd || 0);

  switch (baseType) {
    case 'FREIGHT':
    case 'OCEAN_FREIGHT':
    case 'AIR_FREIGHT':
      return currentItems
        .filter(i => i.category === 'FREIGHT' || i.location === 'FREIGHT')
        .reduce((sum, i) => sum + getAmount(i), 0);

    case 'TOTAL_ORIGIN':
      return currentItems
        .filter(i => (i.location || 'POL') === 'POL')
        .reduce((sum, i) => sum + getAmount(i), 0);

    case 'TOTAL_DESTINATION':
      return currentItems
        .filter(i => i.location === 'POD')
        .reduce((sum, i) => sum + getAmount(i), 0);

    case 'CUSTOMS':
      return currentItems
        .filter(i => i.category === 'CUSTOMS')
        .reduce((sum, i) => sum + getAmount(i), 0);

    case 'TRUCKING':
      return currentItems
        .filter(i => i.category === 'TRUCKING')
        .reduce((sum, i) => sum + getAmount(i), 0);

    case 'SUBTOTAL':
    default:
      return currentItems.reduce((sum, i) => sum + getAmount(i), 0);
  }
}

/**
 * Pure Logistics Pricing Engine
 * Performs multi-pass calculation for non-percentage and percentage charges,
 * computes exact group and location totals, handles dual-currency and tax,
 * and validates the financial model.
 */
export function calculateQuote(
  rawQuote: Partial<QuoteData>,
  customConfig?: Partial<PricingConfig>
): {
  calculatedQuote: QuoteData;
  pricingSummary: QuotePricingSummary;
  validation: ValidationResult;
} {
  const config: PricingConfig = { ...DEFAULT_PRICING_CONFIG, ...customConfig };
  const exchangeRate = Number(rawQuote.exchangeRate) > 0 ? Number(rawQuote.exchangeRate) : config.defaultExchangeRate;
  const items = Array.isArray(rawQuote.items) ? rawQuote.items : [];
  const shipment = rawQuote.shipment || {} as ShipmentDetails;

  // Pass 1: Calculate non-percentage items first
  const nonPercentageCalculated: LineItem[] = [];
  const percentageItems: LineItem[] = [];

  items.forEach((item) => {
    if (item.basis === 'PERCENTAGE') {
      percentageItems.push(item);
    } else {
      const calc = calculateLineItemFull(item, exchangeRate, shipment, 0, config);
      nonPercentageCalculated.push(calc);
    }
  });

  // Pass 2: Calculate percentage items based on non-percentage totals
  const allCalculatedItems: LineItem[] = [...nonPercentageCalculated];

  percentageItems.forEach((pItem) => {
    const baseType = pItem.percentageBase || 'FREIGHT';
    const baseCurrency = pItem.currency || 'USD';
    const baseAmount = getPercentageBaseAmount(baseType, nonPercentageCalculated, baseCurrency);

    const calc = calculateLineItemFull(pItem, exchangeRate, shipment, baseAmount, config);
    allCalculatedItems.push(calc);
  });

  // Re-sort to maintain original item ordering if needed
  const finalItemsMap = new Map<string, LineItem>();
  allCalculatedItems.forEach(i => finalItemsMap.set(i.id, i));
  const orderedCalculatedItems = items.map(original => finalItemsMap.get(original.id) || calculateLineItemFull(original, exchangeRate, shipment, 0, config));

  // Initialize group and location aggregators
  const locationGroups = {
    pol: createEmptyGroupBreakdown('Phí Đầu Xuất (POL)'),
    freight: createEmptyGroupBreakdown('Cước Chặng Chính (FREIGHT)'),
    pod: createEmptyGroupBreakdown('Phí Đầu Nhập (POD)'),
    other: createEmptyGroupBreakdown('Dịch Vụ Khác (OTHER)'),
  };

  const categoryGroups: Record<FeeCategory, GroupPricingBreakdown> = {
    FREIGHT: createEmptyGroupBreakdown('Cước Vận Chuyển'),
    LOCAL_CHARGE: createEmptyGroupBreakdown('Phí Địa Phương (Local Charges)'),
    SURCHARGE: createEmptyGroupBreakdown('Phụ Phí Biến Động (Surcharges)'),
    CUSTOMS: createEmptyGroupBreakdown('Thủ Tục Hải Quan'),
    TRUCKING: createEmptyGroupBreakdown('Vận Tải Nội Địa (Trucking)'),
    HANDLING: createEmptyGroupBreakdown('Phí Xử Lý Hàng (Handling)'),
    OTHER: createEmptyGroupBreakdown('Chi Phí Khác'),
  };

  let subtotalUsd = 0;
  let subtotalVnd = 0;
  let vatTotalUsd = 0;
  let vatTotalVnd = 0;
  let totalCostUsd = 0;
  let totalCostVnd = 0;

  orderedCalculatedItems.forEach((item) => {
    // Accumulate into totals
    subtotalUsd += item.amountUsd || 0;
    subtotalVnd += item.amountVnd || 0;
    vatTotalUsd += item.vatAmountUsd || 0;
    vatTotalVnd += item.vatAmountVnd || 0;
    totalCostUsd += item.costTotalUsd || 0;
    totalCostVnd += item.costTotalVnd || 0;

    // Location Group
    const loc = item.location || (item.category === 'FREIGHT' ? 'FREIGHT' : 'POL');
    if (loc === 'POL') accumulateLineIntoGroup(locationGroups.pol, item);
    else if (loc === 'FREIGHT') accumulateLineIntoGroup(locationGroups.freight, item);
    else if (loc === 'POD') accumulateLineIntoGroup(locationGroups.pod, item);
    else accumulateLineIntoGroup(locationGroups.other, item);

    // Category Group
    const cat = item.category || 'OTHER';
    if (categoryGroups[cat]) {
      accumulateLineIntoGroup(categoryGroups[cat], item);
    }
  });

  // Finalize totals with rounding policy
  const roundedSubtotalUsd = roundCurrency(subtotalUsd, 'USD');
  const roundedSubtotalVnd = roundCurrency(subtotalVnd, 'VND');
  const roundedVatTotalUsd = roundCurrency(vatTotalUsd, 'USD');
  const roundedVatTotalVnd = roundCurrency(vatTotalVnd, 'VND');
  const roundedGrandTotalUsd = roundCurrency(roundedSubtotalUsd + roundedVatTotalUsd, 'USD');
  const roundedGrandTotalVnd = roundCurrency(roundedSubtotalVnd + roundedVatTotalVnd, 'VND');

  const roundedTotalCostUsd = roundCurrency(totalCostUsd, 'USD');
  const roundedTotalCostVnd = roundCurrency(totalCostVnd, 'VND');

  const profitUsdCalc = calculateProfitAndMargin(roundedSubtotalUsd, roundedTotalCostUsd, 'USD');
  const profitVndCalc = calculateProfitAndMargin(roundedSubtotalVnd, roundedTotalCostVnd, 'VND');

  // Compute Cargo Metrics
  const grossWeight = Number(shipment.grossWeightKg) || 0;
  const volume = Number(shipment.volumeCbm) || 0;
  const airMetrics = calculateAirChargeableWeight(grossWeight, volume, config.airVolumetricDivisor);
  const lclMetrics = calculateLclChargeableWm(volume, grossWeight, config.lclCbmToTonRatio);

  let activeChargeableWeight = volume > 0 ? volume : grossWeight;
  if (shipment.mode === 'AIR_FREIGHT') {
    activeChargeableWeight = airMetrics.chargeableWeightKg;
  } else if (shipment.mode === 'SEA_LCL') {
    activeChargeableWeight = lclMetrics.chargeableWm;
  }

  // Construct Final Summary
  const pricingSummary: QuotePricingSummary = {
    subtotalUsd: roundedSubtotalUsd,
    subtotalVnd: roundedSubtotalVnd,
    vatTotalUsd: roundedVatTotalUsd,
    vatTotalVnd: roundedVatTotalVnd,
    grandTotalUsd: roundedGrandTotalUsd,
    grandTotalVnd: roundedGrandTotalVnd,
    totalCostUsd: roundedTotalCostUsd,
    totalCostVnd: roundedTotalCostVnd,
    totalProfitUsd: profitUsdCalc.profit,
    totalProfitVnd: profitVndCalc.profit,
    overallMarginPercent: profitUsdCalc.marginPercent,
    byLocation: {
      pol: finalizeGroupBreakdown(locationGroups.pol),
      freight: finalizeGroupBreakdown(locationGroups.freight),
      pod: finalizeGroupBreakdown(locationGroups.pod),
      other: finalizeGroupBreakdown(locationGroups.other),
    },
    byCategory: {
      freight: finalizeGroupBreakdown(categoryGroups.FREIGHT),
      localCharge: finalizeGroupBreakdown(categoryGroups.LOCAL_CHARGE),
      surcharge: finalizeGroupBreakdown(categoryGroups.SURCHARGE),
      customs: finalizeGroupBreakdown(categoryGroups.CUSTOMS),
      trucking: finalizeGroupBreakdown(categoryGroups.TRUCKING),
      handling: finalizeGroupBreakdown(categoryGroups.HANDLING),
      other: finalizeGroupBreakdown(categoryGroups.OTHER),
    },
    metrics: {
      grossWeightKg: grossWeight,
      volumeCbm: volume,
      chargeableWeight: activeChargeableWeight,
      airVolumetricWeightKg: airMetrics.volumetricWeightKg,
      lclWmFactor: lclMetrics.chargeableWm,
      containerCount: Number(shipment.quantity) || 1,
    },
  };

  // Construct Full Calculated QuoteData
  const calculatedQuote: QuoteData = {
    id: rawQuote.id || `quote-${Date.now()}`,
    quoteNumber: rawQuote.quoteNumber || 'LOG-DRAFT',
    createdDate: rawQuote.createdDate || new Date().toISOString().slice(0, 10),
    updatedDate: new Date().toISOString().slice(0, 10),
    status: rawQuote.status || 'DRAFT',
    exchangeRate: exchangeRate,
    customer: rawQuote.customer || {
      customerName: '',
      companyName: '',
      taxId: '',
      address: '',
      email: '',
      phone: '',
      contactPerson: '',
    },
    shipment: {
      ...shipment,
      chargeableWeight: activeChargeableWeight,
    },
    items: orderedCalculatedItems,
    terms: rawQuote.terms || {
      incoterm: 'FOB',
      validityDate: '',
      paymentTerm: '',
      exclusionsNotes: '',
      bankAccountInfo: '',
    },
    company: rawQuote.company || ({} as any),
    subtotalUsd: roundedSubtotalUsd,
    subtotalVnd: roundedSubtotalVnd,
    vatTotalUsd: roundedVatTotalUsd,
    vatTotalVnd: roundedVatTotalVnd,
    grandTotalUsd: roundedGrandTotalUsd,
    grandTotalVnd: roundedGrandTotalVnd,
    totalCostUsd: roundedTotalCostUsd,
    totalCostVnd: roundedTotalCostVnd,
    totalProfitUsd: profitUsdCalc.profit,
    totalProfitVnd: profitVndCalc.profit,
    overallMarginPercent: profitUsdCalc.marginPercent,
  };

  // Run Validation Engine
  const validation = validateQuote(calculatedQuote);

  return {
    calculatedQuote,
    pricingSummary,
    validation,
  };
}
