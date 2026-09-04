import { Currency } from '../../types/logistics';
import { ChargeBasis } from '../../types/pricing';
import { RateWeightBreak } from '../../types/masterRate';

/**
 * Decimal-safe rounder to avoid JS floating point errors
 */
export function safeRound(value: number, decimals: number = 2): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates FCL Ocean Freight
 */
export function calculateOceanFcl(
  unitRate: number,
  containerQuantity: number = 1,
  minimumCharge: number = 0
): {
  subtotal: number;
  effectiveQuantity: number;
  isMinimumApplied: boolean;
} {
  const effectiveQty = containerQuantity > 0 ? containerQuantity : 1;
  const rawSubtotal = safeRound(unitRate * effectiveQty, 2);
  const isMinimumApplied = minimumCharge > 0 && rawSubtotal < minimumCharge;
  const subtotal = isMinimumApplied ? minimumCharge : rawSubtotal;

  return {
    subtotal,
    effectiveQuantity: effectiveQty,
    isMinimumApplied,
  };
}

/**
 * Calculates LCL Ocean Freight applying W/M (Weight or Measurement) rule
 * Revenue Ton (RT) = MAX(Volume in CBM, Weight in Metric Tons)
 */
export function calculateOceanLcl(
  unitRatePerRt: number,
  grossWeightKg: number,
  volumeCbm: number,
  cbmToTonRatio: number = 1000,
  minimumCharge: number = 0
): {
  revenueTons: number;
  weightTons: number;
  appliedBasis: 'CBM' | 'TON';
  rawSubtotal: number;
  finalSubtotal: number;
  isMinimumApplied: boolean;
} {
  const weightTons = safeRound(grossWeightKg / cbmToTonRatio, 3);
  const normalizedCbm = safeRound(volumeCbm, 3);
  
  // W/M Comparison
  const revenueTons = Math.max(normalizedCbm, weightTons, 0.1); // at least 0.1 RT
  const appliedBasis = normalizedCbm >= weightTons ? 'CBM' : 'TON';
  
  const rawSubtotal = safeRound(unitRatePerRt * revenueTons, 2);
  const isMinimumApplied = minimumCharge > 0 && rawSubtotal < minimumCharge;
  const finalSubtotal = isMinimumApplied ? minimumCharge : rawSubtotal;

  return {
    revenueTons,
    weightTons,
    appliedBasis,
    rawSubtotal,
    finalSubtotal,
    isMinimumApplied,
  };
}

/**
 * Calculates Air Freight with IATA Volumetric Divisor (6000 or 5000)
 * Volumetric Weight (KG) = Volume (CBM) * 1,000,000 / divisor (or CBM * 166.67)
 * Chargeable Weight (CW) = MAX(Gross Weight KG, Volumetric Weight KG)
 */
export function calculateAirFreight(
  unitRatePerKg: number,
  grossWeightKg: number,
  volumeCbm: number,
  volumetricDivisor: number = 6000,
  weightBreaks?: RateWeightBreak[],
  minimumCharge: number = 0
): {
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  effectiveRatePerKg: number;
  rawSubtotal: number;
  finalSubtotal: number;
  isMinimumApplied: boolean;
  appliedWeightBreak?: string;
} {
  // 1 CBM in Air freight (divisor 6000) = 1,000,000 / 6000 = 166.667 KGS
  const volumetricWeightKg = safeRound((volumeCbm * 1000000) / volumetricDivisor, 2);
  const chargeableWeightKg = safeRound(Math.max(grossWeightKg, volumetricWeightKg, 0.5), 2);

  // If tiered weight breaks are configured, determine the matching rate
  let effectiveRate = unitRatePerKg;
  let appliedBreakLabel: string | undefined;

  if (weightBreaks && weightBreaks.length > 0) {
    // Sort descending by minWeightKg to find highest applicable tier
    const sortedBreaks = [...weightBreaks].sort((a, b) => b.minWeightKg - a.minWeightKg);
    const matched = sortedBreaks.find(b => chargeableWeightKg >= b.minWeightKg);
    if (matched) {
      effectiveRate = matched.ratePerKg;
      appliedBreakLabel = matched.label;
    }
  }

  const rawSubtotal = safeRound(effectiveRate * chargeableWeightKg, 2);
  const isMinimumApplied = minimumCharge > 0 && rawSubtotal < minimumCharge;
  const finalSubtotal = isMinimumApplied ? minimumCharge : rawSubtotal;

  return {
    volumetricWeightKg,
    chargeableWeightKg,
    effectiveRatePerKg: effectiveRate,
    rawSubtotal,
    finalSubtotal,
    isMinimumApplied,
    appliedWeightBreak: appliedBreakLabel,
  };
}

/**
 * Calculates Trucking Cost
 */
export function calculateTrucking(
  unitRate: number,
  basis: ChargeBasis = 'PER_TRIP',
  options: {
    trips?: number;
    containers?: number;
    distanceKm?: number;
    weightTons?: number;
  } = {}
): number {
  let multiplier = 1;
  switch (basis) {
    case 'PER_TRIP':
      multiplier = options.trips && options.trips > 0 ? options.trips : 1;
      break;
    case 'PER_CONTAINER':
      multiplier = options.containers && options.containers > 0 ? options.containers : 1;
      break;
    case 'PER_KG':
      multiplier = options.weightTons ? options.weightTons * 1000 : 1;
      break;
    default:
      multiplier = 1;
  }
  return safeRound(unitRate * multiplier, 2);
}

/**
 * Calculates Local Charge based on its specific basis
 */
export function calculateLocalCharge(
  unitRate: number,
  basis: ChargeBasis,
  quantities: {
    containers?: number;
    bills?: number;
    cbm?: number;
    chargeableKg?: number;
    shipment?: number;
  }
): { effectiveQty: number; total: number } {
  let qty = 1;
  switch (basis) {
    case 'PER_CONTAINER':
      qty = quantities.containers && quantities.containers > 0 ? quantities.containers : 1;
      break;
    case 'PER_BL':
    case 'PER_DOCUMENT':
      qty = quantities.bills && quantities.bills > 0 ? quantities.bills : 1;
      break;
    case 'PER_CBM':
    case 'PER_WM':
      qty = quantities.cbm && quantities.cbm > 0 ? quantities.cbm : 1;
      break;
    case 'PER_KG':
    case 'PER_CHARGEABLE_KG':
      qty = quantities.chargeableKg && quantities.chargeableKg > 0 ? quantities.chargeableKg : 1;
      break;
    case 'PER_SHIPMENT':
    case 'FIXED':
    default:
      qty = 1;
      break;
  }
  return {
    effectiveQty: qty,
    total: safeRound(unitRate * qty, 2),
  };
}

/**
 * Calculates Gross Profit and Margin percentage safely
 */
export function calculateProfitAndMargin(
  costAmount: number,
  sellingAmount: number,
  currency: Currency = 'USD'
): {
  grossProfit: number;
  marginPercent: number;
  isProfitable: boolean;
} {
  const grossProfit = safeRound(sellingAmount - costAmount, currency === 'VND' ? 0 : 2);
  const marginPercent = sellingAmount > 0 
    ? safeRound((grossProfit / sellingAmount) * 100, 2) 
    : 0;
  return {
    grossProfit,
    marginPercent,
    isProfitable: grossProfit >= 0,
  };
}
