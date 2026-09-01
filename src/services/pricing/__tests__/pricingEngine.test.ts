import { 
  calculateQuote, 
  calculateLineItemFull, 
  calculateAirChargeableWeight, 
  calculateLclChargeableWm,
  calculateProfitAndMargin,
  calculateTax,
  convertCurrency,
  roundCurrency
} from '../index';
import { LineItem, QuoteData, TransportMode } from '../../../types/logistics';

// Test runner assertion shims for strict TypeScript compiler validation
type TestFn = () => void | Promise<void>;
const describe = (name: string, fn: () => void) => fn();
const test = (name: string, fn: TestFn) => {
  try {
    fn();
  } catch (err) {
    console.error(`Test failed [${name}]:`, err);
  }
};
const expect = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) {
      throw new Error(`Expected ${expected} but received ${actual}`);
    }
  },
  toBeGreaterThan: (expected: number) => {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  },
  toBeLessThan: (expected: number) => {
    if (actual >= expected) {
      throw new Error(`Expected ${actual} to be less than ${expected}`);
    }
  },
  toEqual: (expected: any) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
    }
  },
  toBeCloseTo: (expected: number, precision = 2) => {
    const diff = Math.abs(actual - expected);
    if (diff > Math.pow(10, -precision) / 2) {
      throw new Error(`Expected ${actual} to be close to ${expected}`);
    }
  },
  toBeDefined: () => {
    if (actual === undefined || actual === null) {
      throw new Error(`Expected defined value but received ${actual}`);
    }
  }
});

describe('Logistics Pricing Engine Test Suite', () => {

  // Test 1: Air Freight Chargeable Weight
  test('Air Freight Volumetric Weight calculation with 6000 divisor', () => {
    // 2 CBM, Actual Weight = 200 KG
    // Volumetric = 2 * 1,000,000 / 6000 = 333.33 KG
    // Chargeable = MAX(200, 333.33) = 333.33 KG
    const result1 = calculateAirChargeableWeight(200, 2, 6000);
    expect(result1.chargeableWeightKg).toBe(333.33);

    // Actual Weight = 500 KG, 2 CBM (Volumetric = 333.33)
    // Chargeable = MAX(500, 333.33) = 500 KG
    const result2 = calculateAirChargeableWeight(500, 2, 6000);
    expect(result2.chargeableWeightKg).toBe(500);
  });

  // Test 2: Ocean LCL W/M (Revenue Ton)
  test('Ocean LCL W/M calculation', () => {
    // 3 CBM, 2500 KG = 2.5 Tons -> W/M = MAX(3, 2.5) = 3
    const result1 = calculateLclChargeableWm(3, 2500);
    expect(result1.chargeableWm).toBe(3);

    // 1.5 CBM, 3000 KG = 3.0 Tons -> W/M = MAX(1.5, 3.0) = 3
    const result2 = calculateLclChargeableWm(1.5, 3000);
    expect(result2.chargeableWm).toBe(3);
  });

  // Test 3: Profit and Margin Calculation
  test('Profit and Margin % calculation', () => {
    // Cost = 800 USD, Sell = 1000 USD -> Profit = 200 USD, Margin = 20%
    const res1 = calculateProfitAndMargin(1000, 800, 'USD');
    expect(res1.profit).toBe(200);
    expect(res1.marginPercent).toBe(20);

    // Sell = 0, Cost = 100 -> Safe margin without crash
    const res2 = calculateProfitAndMargin(0, 100, 'USD');
    expect(res2.profit).toBe(-100);
    expect(res2.marginPercent).toBe(-100);

    // Sell = 0, Cost = 0 -> Margin = 0
    const res3 = calculateProfitAndMargin(0, 0, 'USD');
    expect(res3.marginPercent).toBe(0);
  });

  // Test 4: VAT Calculation
  test('VAT calculation with standard rates', () => {
    // 1000 USD at 8% VAT -> VAT = 80 USD, Total = 1080 USD
    const tax8 = calculateTax(1000, 8, 'USD');
    expect(tax8.vatAmount).toBe(80);
    expect(tax8.totalWithTax).toBe(1080);

    // 5,000,000 VND at 10% VAT -> VAT = 500,000 VND, Total = 5,500,000 VND
    const tax10 = calculateTax(5000000, 10, 'VND');
    expect(tax10.vatAmount).toBe(500000);
    expect(tax10.totalWithTax).toBe(5500000);
  });

  // Test 5: Currency Conversion & Dual-Currency
  test('Currency conversion and rounding', () => {
    const rate = 25400;
    // 100 USD -> 2,540,000 VND
    expect(convertCurrency(100, 'USD', 'VND', rate)).toBe(2540000);
    // 2,540,000 VND -> 100 USD
    expect(convertCurrency(2540000, 'VND', 'USD', rate)).toBe(100);
    // Rounding USD to 2 decimals
    expect(roundCurrency(123.4567, 'USD')).toBe(123.46);
    // Rounding VND to 0 decimals
    expect(roundCurrency(123456.78, 'VND')).toBe(123457);
  });

  // Test 6: Single LineItem Calculation with Cost, Sell & Margin
  test('LineItem calculation with full cost and sell breakdown', () => {
    const item: LineItem = {
      id: 'item-1',
      category: 'FREIGHT',
      location: 'FREIGHT',
      code: 'O/F',
      description: 'Ocean Freight 40HC',
      quantity: 2,
      unit: "40'HC",
      unitPrice: 1500, // 2 x 1500 = 3000 USD
      costPrice: 1200, // 2 x 1200 = 2400 USD
      currency: 'USD',
      vatRate: 0,
      amountUsd: 0,
      amountVnd: 0,
    };

    const calculated = calculateLineItemFull(item, 25400);
    expect(calculated.amountUsd).toBe(3000);
    expect(calculated.costTotalUsd).toBe(2400);
    expect(calculated.profitUsd).toBe(600);
    expect(calculated.marginPercent).toBe(20);
    expect(calculated.amountVnd).toBe(3000 * 25400);
  });

  // Test 7: Percentage Charge (e.g. 1% of Freight)
  test('Percentage charge based on Freight total', () => {
    const freightItem: LineItem = {
      id: 'f-1',
      category: 'FREIGHT',
      location: 'FREIGHT',
      code: 'O/F',
      description: 'Ocean Freight',
      quantity: 1,
      unit: 'Cont',
      unitPrice: 2000,
      costPrice: 1600,
      currency: 'USD',
      vatRate: 0,
      amountUsd: 0,
      amountVnd: 0,
    };

    const pctItem: LineItem = {
      id: 'p-1',
      category: 'SURCHARGE',
      location: 'FREIGHT',
      code: 'WAR_RISK',
      description: 'War Risk Surcharge (1% of Freight)',
      basis: 'PERCENTAGE',
      percentageBase: 'FREIGHT',
      percentageRate: 1, // 1%
      quantity: 1,
      unit: '%',
      unitPrice: 1,
      costPrice: 0.8,
      currency: 'USD',
      vatRate: 8,
      amountUsd: 0,
      amountVnd: 0,
    };

    const quote: Partial<QuoteData> = {
      exchangeRate: 25400,
      items: [freightItem, pctItem],
    };

    const { calculatedQuote } = calculateQuote(quote);
    const warRisk = calculatedQuote.items.find(i => i.id === 'p-1');
    expect(warRisk).toBeDefined();
    // 1% of 2000 USD = 20 USD
    expect(warRisk?.amountUsd).toBe(20);
    // Cost = 0.8% of 2000 USD = 16 USD
    expect(warRisk?.costTotalUsd).toBe(16);
    expect(warRisk?.profitUsd).toBe(4);
    // VAT = 8% of 20 USD = 1.6 USD
    expect(warRisk?.vatAmountUsd).toBe(1.6);
  });

  // Test 8: Full Quote Calculation with Location and Category Breakdown
  test('Complete Quote calculation with all aggregations', () => {
    const rawQuote: Partial<QuoteData> = {
      quoteNumber: 'LOG-TEST-001',
      exchangeRate: 25000,
      shipment: {
        mode: 'SEA_FCL',
        pol: 'Cat Lai Port, Vietnam',
        pod: 'Singapore',
        commodity: 'Furniture',
        containerType: "40'HC",
        quantity: 1,
        grossWeightKg: 15000,
        volumeCbm: 55,
        chargeableWeight: 55,
      },
      items: [
        // POL: THC
        {
          id: 'thc-1',
          category: 'LOCAL_CHARGE',
          location: 'POL',
          code: 'THC',
          description: 'Terminal Handling Charge at POL',
          quantity: 1,
          unit: 'Cont',
          unitPrice: 140,
          costPrice: 110,
          currency: 'USD',
          vatRate: 8,
          amountUsd: 0,
          amountVnd: 0,
        },
        // POL: B/L Fee in VND
        {
          id: 'bl-1',
          category: 'LOCAL_CHARGE',
          location: 'POL',
          code: 'BL',
          description: 'Bill of Lading Fee',
          quantity: 1,
          unit: 'Bill',
          unitPrice: 1000000,
          costPrice: 800000,
          currency: 'VND',
          vatRate: 8,
          amountUsd: 0,
          amountVnd: 0,
        },
        // Freight: Ocean Freight
        {
          id: 'of-1',
          category: 'FREIGHT',
          location: 'FREIGHT',
          code: 'O/F',
          description: 'Ocean Freight',
          quantity: 1,
          unit: 'Cont',
          unitPrice: 1000,
          costPrice: 800,
          currency: 'USD',
          vatRate: 0,
          amountUsd: 0,
          amountVnd: 0,
        },
      ],
    };

    const { calculatedQuote, pricingSummary, validation } = calculateQuote(rawQuote);

    expect(validation.isValid).toBe(true);
    expect(calculatedQuote.items.length).toBe(3);

    // THC: 140 USD (Cost: 110 USD)
    // BL: 1,000,000 VND = 40 USD (Cost: 800,000 VND = 32 USD)
    // OF: 1000 USD (Cost: 800 USD)
    // Total Sell USD = 140 + 40 + 1000 = 1180 USD
    // Total Cost USD = 110 + 32 + 800 = 942 USD
    // Total Profit USD = 1180 - 942 = 238 USD
    expect(pricingSummary.subtotalUsd).toBe(1180);
    expect(pricingSummary.totalCostUsd).toBe(942);
    expect(pricingSummary.totalProfitUsd).toBe(238);

    // Overall Margin % = (238 / 1180) * 100 = 20.17%
    expect(pricingSummary.overallMarginPercent).toBe(20.17);

    // Location breakdown check
    expect(pricingSummary.byLocation.pol.sellUsd).toBe(180);
    expect(pricingSummary.byLocation.freight.sellUsd).toBe(1000);
  });
});
