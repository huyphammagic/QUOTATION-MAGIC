import { LineItem, ShipmentDetails, Currency } from '../../types/logistics';
import { ChargeBasis, PercentageBase, PricingConfig } from '../../types/pricing';
import { calculateCurrencyPair, roundCurrency } from './currencyCalculator';
import { calculateProfitAndMargin } from './profitCalculator';
import { calculateTax } from './taxCalculator';

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  airVolumetricDivisor: 6000,
  lclCbmToTonRatio: 1000,
  defaultExchangeRate: 25400,
  roundingPolicy: {
    usdDecimals: 2,
    vndDecimals: 0,
  },
};

/**
 * Computes Air Freight Volumetric Weight & Chargeable Weight
 * Volumetric Weight (KG) = CBM * 1,000,000 / Divisor (or Length * Width * Height / Divisor)
 * Chargeable Weight = MAX(Actual Gross Weight, Volumetric Weight)
 */
export function calculateAirChargeableWeight(
  grossWeightKg: number,
  volumeCbm: number,
  divisor: number = 6000
): { actualWeightKg: number; volumetricWeightKg: number; chargeableWeightKg: number } {
  const actual = Math.max(0, Number(grossWeightKg) || 0);
  const cbm = Math.max(0, Number(volumeCbm) || 0);
  
  // 1 CBM in cubic centimeters = 1,000,000 cm3. Divided by 6000 = ~166.67 KG
  const volumetric = (cbm * 1000000) / (divisor > 0 ? divisor : 6000);
  const chargeable = Math.max(actual, volumetric);

  return {
    actualWeightKg: Math.round((actual + Number.EPSILON) * 100) / 100,
    volumetricWeightKg: Math.round((volumetric + Number.EPSILON) * 100) / 100,
    chargeableWeightKg: Math.round((chargeable + Number.EPSILON) * 100) / 100,
  };
}

/**
 * Computes Ocean LCL Revenue Ton (W/M)
 * W/M = MAX(Volume in CBM, Gross Weight in KG / 1000)
 */
export function calculateLclChargeableWm(
  volumeCbm: number,
  grossWeightKg: number,
  cbmToTonRatio: number = 1000
): { cbm: number; weightTons: number; chargeableWm: number } {
  const cbm = Math.max(0, Number(volumeCbm) || 0);
  const weightKg = Math.max(0, Number(grossWeightKg) || 0);
  const ratio = cbmToTonRatio > 0 ? cbmToTonRatio : 1000;
  const weightTons = weightKg / ratio;
  const chargeableWm = Math.max(cbm, weightTons);

  return {
    cbm: Math.round((cbm + Number.EPSILON) * 1000) / 1000,
    weightTons: Math.round((weightTons + Number.EPSILON) * 1000) / 1000,
    chargeableWm: Math.round((chargeableWm + Number.EPSILON) * 1000) / 1000,
  };
}

/**
 * Determines the effective quantity for a line item based on its basis and shipment properties
 */
export function determineEffectiveQuantity(
  item: Partial<LineItem>,
  shipment?: Partial<ShipmentDetails>,
  config: PricingConfig = DEFAULT_PRICING_CONFIG
): number {
  const manualQty = Number(item.quantity);
  const validManualQty = !isNaN(manualQty) && manualQty >= 0 ? manualQty : 1;

  if (!item.basis) {
    return validManualQty;
  }

  const mode = shipment?.mode || 'SEA_FCL';
  const weightKg = Number(shipment?.grossWeightKg) || 0;
  const volumeCbm = Number(shipment?.volumeCbm) || 0;
  const shipQty = Number(shipment?.quantity) || 1;

  switch (item.basis) {
    case 'PER_CONTAINER':
      return manualQty > 0 ? manualQty : shipQty;

    case 'PER_WM': {
      const { chargeableWm } = calculateLclChargeableWm(volumeCbm, weightKg, config.lclCbmToTonRatio);
      return chargeableWm > 0 ? chargeableWm : validManualQty;
    }

    case 'PER_CHARGEABLE_KG': {
      if (mode === 'AIR_FREIGHT') {
        const { chargeableWeightKg } = calculateAirChargeableWeight(weightKg, volumeCbm, config.airVolumetricDivisor);
        return chargeableWeightKg > 0 ? chargeableWeightKg : validManualQty;
      }
      return weightKg > 0 ? weightKg : validManualQty;
    }

    case 'PER_KG':
      return weightKg > 0 ? weightKg : validManualQty;

    case 'PER_CBM':
      return volumeCbm > 0 ? volumeCbm : validManualQty;

    case 'PER_TRUCK':
    case 'PER_TRIP':
    case 'PER_SHIPMENT':
    case 'PER_BL':
    case 'PER_DOCUMENT':
    case 'PER_PACKAGE':
    case 'PER_PALLET':
    case 'PER_CARTON':
    case 'PER_UNIT':
    case 'FIXED':
    default:
      return validManualQty;
  }
}

/**
 * Calculates a single LineItem's sell, cost, profit, margin, VAT, and dual-currency figures
 * Handles percentage charges when baseAmount is supplied.
 */
export function calculateLineItemFull(
  item: LineItem,
  exchangeRate: number,
  shipment?: Partial<ShipmentDetails>,
  percentageBaseAmount: number = 0,
  config: PricingConfig = DEFAULT_PRICING_CONFIG
): LineItem {
  const rate = exchangeRate > 0 ? exchangeRate : config.defaultExchangeRate;
  const currency = item.currency || 'USD';
  const qty = Number(item.quantity) || 0;
  const unitSellPrice = Number(item.unitPrice) || 0;
  const unitCostPrice = item.costPrice !== undefined && item.costPrice !== null ? Number(item.costPrice) : 0;
  const vatRate = Number(item.vatRate) >= 0 ? Number(item.vatRate) : 0;

  // 1. Calculate raw line sell & cost in item's original currency
  let rawSell = 0;
  let rawCost = 0;

  if (item.basis === 'PERCENTAGE') {
    // If percentage charge, unitPrice or percentageRate is the % (e.g. 1 for 1%)
    const pctRate = item.percentageRate !== undefined ? Number(item.percentageRate) : unitSellPrice;
    rawSell = (percentageBaseAmount * Math.max(0, pctRate)) / 100;
    rawCost = unitCostPrice > 0 ? (percentageBaseAmount * unitCostPrice) / 100 : 0;
  } else {
    rawSell = qty * unitSellPrice;
    rawCost = qty * unitCostPrice;
  }

  // Minimum & Maximum Charge Enforcement (e.g., Min $100 for LCL / Air)
  if (item.minimumAmount !== undefined && item.minimumAmount !== null && Number(item.minimumAmount) > 0) {
    const minCharge = Number(item.minimumAmount);
    if (rawSell < minCharge && rawSell > 0) {
      rawSell = minCharge;
    }
  }

  if (item.maximumAmount !== undefined && item.maximumAmount !== null && Number(item.maximumAmount) > 0) {
    const maxCharge = Number(item.maximumAmount);
    if (rawSell > maxCharge) {
      rawSell = maxCharge;
    }
  }

  // 2. Dual-currency conversion for Selling Price
  const sellPair = calculateCurrencyPair(rawSell, currency, rate);
  const costPair = calculateCurrencyPair(rawCost, currency, rate);

  // 3. Tax / VAT Calculation
  const taxUsd = calculateTax(sellPair.amountUsd, vatRate, 'USD');
  const taxVnd = calculateTax(sellPair.amountVnd, vatRate, 'VND');

  // 4. Profit & Margin Calculation
  const profitUsdCalc = calculateProfitAndMargin(sellPair.amountUsd, costPair.amountUsd, 'USD');
  const profitVndCalc = calculateProfitAndMargin(sellPair.amountVnd, costPair.amountVnd, 'VND');

  return {
    ...item,
    quantity: qty,
    unitPrice: unitSellPrice,
    costPrice: unitCostPrice,
    vatRate: vatRate,
    vatAmountUsd: taxUsd.vatAmount,
    vatAmountVnd: taxVnd.vatAmount,
    amountUsd: sellPair.amountUsd,
    amountVnd: sellPair.amountVnd,
    totalWithVatUsd: taxUsd.totalWithTax,
    totalWithVatVnd: taxVnd.totalWithTax,
    costTotalUsd: costPair.amountUsd,
    costTotalVnd: costPair.amountVnd,
    profitUsd: profitUsdCalc.profit,
    profitVnd: profitVndCalc.profit,
    marginPercent: profitUsdCalc.marginPercent,
  };
}
