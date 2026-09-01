import { Currency, LineItem, ShipmentDetails } from '../types/logistics';
import { 
  calculateQuote, 
  calculateLineItemFull, 
  calculateAirChargeableWeight, 
  calculateLclChargeableWm,
  roundCurrency 
} from '../services/pricing';

// Format currency USD
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

// Format currency VND
export function formatVND(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0 ₫';
  const formatted = new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(amount || 0);
  return `${formatted} ₫`.replace(/[\u00A0\u202F]/g, ' ');
}

// Format exchange rate with full decimal precision (up to 8 decimal places)
export function formatExchangeRate(rate: number): string {
  if (isNaN(rate) || rate === null || rate === undefined) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  }).format(rate);
}

// Format number with decimal control
export function formatNumber(val: number, decimals: number = 2): string {
  if (isNaN(val) || val === null || val === undefined) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(val);
}

// Format percentage with % symbol
export function formatPercent(val: number, decimals: number = 1): string {
  if (isNaN(val) || val === null || val === undefined) return '0%';
  return `${formatNumber(val, decimals)}%`;
}

// Compute Chargeable Weight automatically via Pricing Engine
export function computeChargeableWeight(shipment: Partial<ShipmentDetails>): number {
  const mode = shipment.mode;
  const weightKg = Number(shipment.grossWeightKg) || 0;
  const cbm = Number(shipment.volumeCbm) || 0;

  if (mode === 'AIR_FREIGHT') {
    const { chargeableWeightKg } = calculateAirChargeableWeight(weightKg, cbm, 6000);
    return chargeableWeightKg;
  } else if (mode === 'SEA_LCL') {
    const { chargeableWm } = calculateLclChargeableWm(cbm, weightKg, 1000);
    return chargeableWm;
  }

  return cbm > 0 ? cbm : weightKg;
}

// Recalculate line item amounts based on rate & currency via Pricing Engine
export function calculateLineItem(item: LineItem, exchangeRate: number, shipment?: Partial<ShipmentDetails>): LineItem {
  return calculateLineItemFull(item, exchangeRate, shipment);
}

// Recalculate all quote totals via Pricing Engine
export function calculateQuoteTotals(items: LineItem[], exchangeRate: number, shipment?: Partial<ShipmentDetails>) {
  const { calculatedQuote } = calculateQuote({
    items,
    exchangeRate,
    shipment: shipment as any,
  });

  return {
    subtotalUsd: calculatedQuote.subtotalUsd,
    subtotalVnd: calculatedQuote.subtotalVnd,
    vatTotalUsd: calculatedQuote.vatTotalUsd,
    vatTotalVnd: calculatedQuote.vatTotalVnd,
    grandTotalUsd: calculatedQuote.grandTotalUsd,
    grandTotalVnd: calculatedQuote.grandTotalVnd,
    totalCostUsd: calculatedQuote.totalCostUsd,
    totalCostVnd: calculatedQuote.totalCostVnd,
    totalProfitUsd: calculatedQuote.totalProfitUsd,
    totalProfitVnd: calculatedQuote.totalProfitVnd,
    overallMarginPercent: calculatedQuote.overallMarginPercent,
  };
}

// Generate new unique Quote Number (e.g., LOG-20260723-892)
export function generateQuoteNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `LOG-${dateStr}-${randomSuffix}`;
}
