import { RateMasterItem, RateComparisonDiff } from '../../types/masterRate';
import { LineItem, ShipmentDetails } from '../../types/logistics';
import { determineEffectiveQuantity } from '../pricing/chargeCalculator';
import { calculateLineItemFull } from '../pricing/chargeCalculator';
import { DEFAULT_PRICING_CONFIG } from '../pricing/chargeCalculator';

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
  const initialQty = (rate.basis === 'PER_CONTAINER' || rate.basis === 'PER_BL') && shipment?.quantity
    ? shipment.quantity
    : 1;

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
    
    // Master Rate Snapshot Preservation Fields
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
 */
export function compareLineItemWithLiveRate(
  item: LineItem,
  liveRate: RateMasterItem
): RateComparisonDiff {
  const currentSell = item.unitPrice;
  const currentCost = item.costPrice || 0;
  const liveSell = liveRate.sellingAmount || 0;
  const liveCost = liveRate.costAmount || 0;

  const diffSell = liveSell - currentSell;
  const diffSellPct = currentSell > 0 ? (diffSell / currentSell) * 100 : 0;
  const diffCost = liveCost - currentCost;

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
    diffSellPercent: Math.round(diffSellPct * 100) / 100,
    diffCostAmount: diffCost,
    hasChanges,
    isExpiredNow,
    statusChange: liveRate.status !== 'ACTIVE' ? `Live rate status is ${liveRate.status}` : undefined,
  };
}

/**
 * Scans all LineItems in a quote and checks for rate updates against Master Rates
 */
export function checkQuoteForRateUpdates(
  items: LineItem[],
  masterRates: RateMasterItem[]
): RateComparisonDiff[] {
  const diffs: RateComparisonDiff[] = [];
  const ratesMap = new Map<string, RateMasterItem>();
  masterRates.forEach(r => ratesMap.set(r.id, r));

  for (const item of items) {
    if (item.rateId && ratesMap.has(item.rateId)) {
      const liveRate = ratesMap.get(item.rateId)!;
      const diff = compareLineItemWithLiveRate(item, liveRate);
      if (diff.hasChanges || diff.isExpiredNow) {
        diffs.push(diff);
      }
    }
  }

  return diffs;
}

/**
 * Updates a LineItem with latest live rate data while retaining custom notes and updating snapshot metadata
 */
export function applyLiveRateToLineItem(
  item: LineItem,
  liveRate: RateMasterItem,
  shipment?: Partial<ShipmentDetails>,
  exchangeRate: number = 25400
): LineItem {
  const updatedItem: LineItem = {
    ...item,
    unitPrice: liveRate.sellingAmount || 0,
    costPrice: liveRate.costAmount || 0,
    currency: liveRate.sellingCurrency || item.currency,
    vatRate: liveRate.vatRate !== undefined ? liveRate.vatRate : item.vatRate,
    rateVersion: liveRate.version || (item.rateVersion ? item.rateVersion + 1 : 1),
    effectiveFrom: liveRate.effectiveFrom,
    effectiveTo: liveRate.effectiveTo,
    minimumAmount: liveRate.minimumCharge,
    maximumAmount: liveRate.maximumCharge,
    transitTime: liveRate.transitTime,
    freeTime: liveRate.freeTime,
    // Reset manual override flags when explicitly refreshed to master rate
    isOverridden: false,
    originalUnitPrice: undefined,
    originalCostPrice: undefined,
    overrideReason: undefined,
    overriddenAt: undefined,
  };

  return calculateLineItemFull(updatedItem, exchangeRate, shipment, 0, DEFAULT_PRICING_CONFIG);
}

/**
 * Records manual price override on a LineItem without modifying the Rate Master database
 */
export function recordLineItemOverride(
  item: LineItem,
  newUnitPrice: number,
  newCostPrice?: number,
  reason?: string,
  user?: string,
  shipment?: Partial<ShipmentDetails>,
  exchangeRate: number = 25400
): LineItem {
  const wasPreviouslyOverridden = Boolean(item.isOverridden);
  const origUnit = wasPreviouslyOverridden ? (item.originalUnitPrice ?? item.unitPrice) : item.unitPrice;
  const origCost = wasPreviouslyOverridden ? (item.originalCostPrice ?? item.costPrice) : item.costPrice;

  const modified: LineItem = {
    ...item,
    unitPrice: newUnitPrice,
    costPrice: newCostPrice !== undefined ? newCostPrice : item.costPrice,
    isOverridden: true,
    originalUnitPrice: origUnit,
    originalCostPrice: origCost,
    overrideReason: reason || 'Manual adjustment by Sales',
    overriddenAt: new Date().toISOString(),
    overriddenBy: user || 'Sales Representative',
  };

  return calculateLineItemFull(modified, exchangeRate, shipment, 0, DEFAULT_PRICING_CONFIG);
}

/**
 * Duplicates a RateMasterItem creating a clean new instance with a fresh ID, code, and version 1.
 */
export function duplicateRateMaster(original: RateMasterItem): RateMasterItem {
  const nowStr = new Date().toISOString().slice(0, 10);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return {
    ...original,
    id: `rate-${Date.now()}-${suffix}`,
    rateCode: `${original.rateCode}-COPY-${suffix}`,
    rateName: `${original.rateName} (Copy)`,
    status: 'DRAFT',
    version: 1,
    createdAt: nowStr,
    updatedAt: nowStr,
    createdBy: 'current_user',
    updatedBy: 'current_user',
  };
}
