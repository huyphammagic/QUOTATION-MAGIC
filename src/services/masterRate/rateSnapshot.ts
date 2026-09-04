import { RateMasterItem, RateComparisonDiff } from '../../types/masterRate';
import { LineItem, ShipmentDetails, Currency } from '../../types/logistics';
import { determineEffectiveQuantity, calculateLineItemFull, DEFAULT_PRICING_CONFIG } from '../pricing/chargeCalculator';
import { safeRound, calculateProfitAndMargin } from './rateCalculationService';

/**
 * Converts a selected Master Rate into an immutable Quotation LineItem Snapshot.
 * The resulting LineItem stores all historical details (rateId, version, dates, route, amounts),
 * guaranteeing that future changes to Rate Master do not overwrite existing quotes.
 */
export function convertRateToLineItemSnapshot(
  rate: RateMasterItem,
  shipment?: Partial<ShipmentDetails>,
  exchangeRate: number = 25400
): LineItem {
  const lineItemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  // Determine appropriate initial quantity based on basis and shipment
  let initialQty = 1;
  if (rate.basis === 'PER_CONTAINER' && shipment?.quantity) {
    initialQty = shipment.quantity;
  } else if (rate.basis === 'PER_CBM' && shipment?.volumeCbm) {
    initialQty = shipment.volumeCbm;
  } else if ((rate.basis === 'PER_KG' || rate.basis === 'PER_CHARGEABLE_KG') && shipment?.chargeableWeight) {
    initialQty = shipment.chargeableWeight;
  }

  const effectiveQty = determineEffectiveQuantity(
    { basis: rate.basis, quantity: initialQty },
    shipment,
    DEFAULT_PRICING_CONFIG
  );

  const rawItem: LineItem = {
    id: lineItemId,
    category: rate.category,
    location: rate.category === 'FREIGHT' ? 'FREIGHT' : 'POL',
    code: rate.chargeCode,
    description: rate.rateName || rate.chargeName || rate.chargeCode,
    basis: rate.basis,
    quantity: effectiveQty > 0 ? effectiveQty : 1,
    unit: rate.unit || (rate.containerType ? `Cont ${rate.containerType}` : 'Lô'),
    unitPrice: rate.sellingAmount || 0,
    costPrice: rate.costAmount || 0,
    currency: rate.sellingCurrency || rate.costCurrency || 'USD',
    vatRate: rate.vatRate !== undefined ? rate.vatRate : 0,
    amountUsd: 0,
    amountVnd: 0,
    
    // Master Rate Snapshot Preservation Fields (Phase 10)
    rateId: rate.id,
    rateCode: rate.rateCode,
    rateVersion: rate.version || 1,
    carrier: rate.carrier,
    origin: rate.origin,
    destination: rate.destination,
    effectiveFrom: rate.effectiveFrom,
    effectiveTo: rate.effectiveTo,
    minimumAmount: rate.minimumCharge,
    maximumAmount: rate.maximumCharge,
    transitTime: rate.transitTime,
    freeTime: rate.freeTime,
    note: rate.notes ? `[Rate Master: ${rate.rateCode}] ${rate.notes}` : `[Rate: ${rate.rateCode}]`,
  };

  // Pass through Pricing Engine to compute dual-currency sell, cost, profit, margin & tax
  return calculateLineItemFull(rawItem, exchangeRate, shipment, 0, DEFAULT_PRICING_CONFIG);
}

/**
 * Compares an existing LineItem (with rate snapshot) against the live Master Rate
 * Evaluates cost diff, sell diff, gross profit impact, and margin impact.
 */
export function compareLineItemWithLiveRate(
  item: LineItem,
  liveRate: RateMasterItem
): RateComparisonDiff {
  const currentSell = item.unitPrice || 0;
  const currentCost = item.costPrice || 0;
  const liveSell = liveRate.sellingAmount || 0;
  const liveCost = liveRate.costAmount || 0;

  const diffSell = safeRound(liveSell - currentSell, 2);
  const diffSellPct = currentSell > 0 ? safeRound((diffSell / currentSell) * 100, 2) : 0;
  
  const diffCost = safeRound(liveCost - currentCost, 2);
  const diffCostPct = currentCost > 0 ? safeRound((diffCost / currentCost) * 100, 2) : 0;

  // Old profit & margin
  const oldCalc = calculateProfitAndMargin(currentCost, currentSell, item.currency);
  // New profit & margin
  const newCalc = calculateProfitAndMargin(liveCost, liveSell, liveRate.sellingCurrency);

  const grossProfitImpact = safeRound(newCalc.grossProfit - oldCalc.grossProfit, 2);
  const marginImpactPercent = safeRound(newCalc.marginPercent - oldCalc.marginPercent, 2);

  const isExpiredNow = Boolean(
    liveRate.status === 'EXPIRED' ||
    (liveRate.effectiveTo && new Date(liveRate.effectiveTo).getTime() < Date.now())
  );

  const hasChanges = Boolean(
    diffSell !== 0 ||
    diffCost !== 0 ||
    item.rateVersion !== liveRate.version ||
    item.currency !== (liveRate.sellingCurrency || 'USD')
  );

  return {
    lineItemId: item.id,
    itemDescription: item.description,
    currentRateId: item.rateId,
    currentRateCode: item.rateCode,
    currentRateVersion: item.rateVersion,
    currentUnitPrice: currentSell,
    currentCostPrice: currentCost,
    currentCurrency: item.currency,
    latestRateItem: liveRate,
    latestUnitPrice: liveSell,
    latestCostPrice: liveCost,
    latestCurrency: liveRate.sellingCurrency || 'USD',
    diffSellAmount: diffSell,
    diffSellPercent: diffSellPct,
    diffCostAmount: diffCost,
    diffCostPercent: diffCostPct,
    grossProfitImpact,
    marginImpactPercent,
    hasChanges,
    isExpiredNow,
    statusChange: item.rateVersion !== liveRate.version ? `v${item.rateVersion} -> v${liveRate.version}` : undefined,
  };
}

/**
 * Checks all items in a quote for live Master Rate updates or expirations.
 */
export function checkQuoteForRateUpdates(
  items: LineItem[],
  rates: RateMasterItem[]
): RateComparisonDiff[] {
  const rateMap = new Map<string, RateMasterItem>();
  rates.forEach((r) => rateMap.set(r.id, r));

  const diffs: RateComparisonDiff[] = [];
  for (const item of items) {
    if (item.rateId && rateMap.has(item.rateId)) {
      const liveRate = rateMap.get(item.rateId)!;
      const diff = compareLineItemWithLiveRate(item, liveRate);
      if (diff.hasChanges || diff.isExpiredNow) {
        diffs.push(diff);
      }
    }
  }
  return diffs;
}

/**
 * Applies the latest live Master Rate to an existing LineItem snapshot.
 */
export function applyLiveRateToLineItem(
  item: LineItem,
  liveRate: RateMasterItem,
  shipment?: ShipmentDetails,
  exchangeRate: number = 25400
): LineItem {
  const updatedItem: LineItem = {
    ...item,
    code: liveRate.chargeCode,
    description: liveRate.rateName || liveRate.chargeName || item.description,
    unitPrice: liveRate.sellingAmount || 0,
    costPrice: liveRate.costAmount || 0,
    currency: liveRate.sellingCurrency || 'USD',
    carrier: liveRate.carrier,
    origin: liveRate.origin,
    destination: liveRate.destination,
    rateVersion: liveRate.version,
    effectiveFrom: liveRate.effectiveFrom,
    effectiveTo: liveRate.effectiveTo,
    transitTime: liveRate.transitTime,
    freeTime: liveRate.freeTime,
    note: liveRate.notes ? `[Updated Master: ${liveRate.rateCode} v${liveRate.version}] ${liveRate.notes}` : item.note,
  };

  return calculateLineItemFull(updatedItem, exchangeRate, shipment, 0, DEFAULT_PRICING_CONFIG);
}

/**
 * Creates a new Version of an existing Rate Master item (Immutable linked list)
 */
export function createNewRateVersion(
  currentRate: RateMasterItem,
  updates: Partial<RateMasterItem>,
  actor: string = 'admin'
): RateMasterItem {
  const newVersionNumber = (currentRate.version || 1) + 1;
  const newId = `rate-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  return {
    ...currentRate,
    ...updates,
    id: newId,
    previousVersionId: currentRate.id,
    version: newVersionNumber,
    status: 'DRAFT', // New versions start in DRAFT pending approval
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: actor,
    updatedBy: actor,
  };
}

/**
 * Duplicates a Rate Master item for quick lane/container cloning
 */
export function duplicateRateMaster(
  sourceRate: RateMasterItem,
  customCodeSuffix?: string
): RateMasterItem {
  const suffix = customCodeSuffix || Math.random().toString(36).substring(2, 6).toUpperCase();
  const newId = `rate-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  return {
    ...sourceRate,
    id: newId,
    rateCode: `${sourceRate.rateCode}-COPY-${suffix}`,
    rateName: `${sourceRate.rateName} (Copy)`,
    version: 1,
    previousVersionId: undefined,
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Applies a manual price override with strict audit fields
 */
export function applyManualPriceOverride(
  item: LineItem,
  newUnitPrice: number,
  newCostPrice: number | undefined,
  reason: string,
  actor: string = 'sales_rep',
  exchangeRate: number = 25400,
  shipment?: ShipmentDetails
): LineItem {
  const updatedItem: LineItem = {
    ...item,
    unitPrice: newUnitPrice,
    costPrice: newCostPrice !== undefined ? newCostPrice : item.costPrice,
    isOverridden: true,
    originalUnitPrice: item.originalUnitPrice ?? item.unitPrice,
    originalCostPrice: item.originalCostPrice ?? item.costPrice,
    overrideReason: reason,
    overriddenAt: new Date().toISOString(),
    overriddenBy: actor,
  };

  return calculateLineItemFull(updatedItem, exchangeRate, shipment, 0, DEFAULT_PRICING_CONFIG);
}

// Alias export for test suites and pricing components
export const recordLineItemOverride = applyManualPriceOverride;
