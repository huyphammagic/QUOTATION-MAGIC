import { Currency, LineItem, ShipmentDetails } from '../types/logistics';

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
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// Format number with decimal control
export function formatNumber(val: number, decimals: number = 2): string {
  if (isNaN(val) || val === null || val === undefined) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(val);
}

// Compute Chargeable Weight automatically
export function computeChargeableWeight(shipment: Partial<ShipmentDetails>): number {
  const mode = shipment.mode;
  const weightKg = Number(shipment.grossWeightKg) || 0;
  const cbm = Number(shipment.volumeCbm) || 0;

  if (mode === 'AIR_FREIGHT') {
    // Air Freight: 1 CBM = 167 KGS (or Volumetric Weight = CBM * 166.67)
    const volumetricWeight = cbm * 166.67;
    return Math.max(weightKg, volumetricWeight);
  } else if (mode === 'SEA_LCL') {
    // Sea LCL: 1 CBM = 1000 KGS (1 Ton)
    const weightInTons = weightKg / 1000;
    return Math.max(cbm, weightInTons);
  }

  // Default return gross weight or volume
  return cbm > 0 ? cbm : weightKg;
}

// Recalculate line item amounts based on rate & currency
export function calculateLineItem(item: LineItem, exchangeRate: number): LineItem {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unitPrice) || 0;
  const vatRate = Number(item.vatRate) || 0;
  const rate = exchangeRate > 0 ? exchangeRate : 25400;

  let amountUsd = 0;
  let amountVnd = 0;

  if (item.currency === 'USD') {
    amountUsd = qty * price;
    amountVnd = amountUsd * rate;
  } else {
    amountVnd = qty * price;
    amountUsd = amountVnd / rate;
  }

  return {
    ...item,
    quantity: qty,
    unitPrice: price,
    vatRate: vatRate,
    amountUsd: Number(amountUsd.toFixed(2)),
    amountVnd: Math.round(amountVnd),
  };
}

// Recalculate all quote totals
export function calculateQuoteTotals(items: LineItem[], exchangeRate: number) {
  const rate = exchangeRate > 0 ? exchangeRate : 25400;

  let subtotalUsd = 0;
  let subtotalVnd = 0;
  let vatTotalUsd = 0;
  let vatTotalVnd = 0;

  items.forEach((item) => {
    const calc = calculateLineItem(item, rate);
    subtotalUsd += calc.amountUsd;
    subtotalVnd += calc.amountVnd;

    const vatUsd = (calc.amountUsd * (calc.vatRate || 0)) / 100;
    const vatVnd = (calc.amountVnd * (calc.vatRate || 0)) / 100;

    vatTotalUsd += vatUsd;
    vatTotalVnd += vatVnd;
  });

  const grandTotalUsd = subtotalUsd + vatTotalUsd;
  const grandTotalVnd = subtotalVnd + vatTotalVnd;

  return {
    subtotalUsd: Number(subtotalUsd.toFixed(2)),
    subtotalVnd: Math.round(subtotalVnd),
    vatTotalUsd: Number(vatTotalUsd.toFixed(2)),
    vatTotalVnd: Math.round(vatTotalVnd),
    grandTotalUsd: Number(grandTotalUsd.toFixed(2)),
    grandTotalVnd: Math.round(grandTotalVnd),
  };
}

// Generate new unique Quote Number (e.g., LOG-20260723-892)
export function generateQuoteNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `LOG-${dateStr}-${randomSuffix}`;
}
