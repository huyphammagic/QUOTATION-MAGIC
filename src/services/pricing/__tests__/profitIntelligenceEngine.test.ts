// Self-contained verification suite for deterministic Phase 15 formulas
function describe(name: string, fn: () => void) {
  try {
    fn();
  } catch (err) {
    console.error(`Test Suite Failure: ${name}`, err);
  }
}

function it(name: string, fn: () => void) {
  try {
    fn();
  } catch (err) {
    throw new Error(`[FAIL] ${name}: ${(err as Error).message}`);
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, but received ${actual}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (!((actual as unknown as number) > expected)) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeCloseTo(expected: number, delta: number = 0.01) {
      if (Math.abs((actual as unknown as number) - expected) > delta) {
        throw new Error(`Expected ${actual} to be close to ${expected}`);
      }
    }
  };
}

import { 
  calculateGrossProfit, 
  calculateGrossMarginPercent, 
  calculateMarkupPercent, 
  calculateRecommendedSellPrice, 
  calculateMinimumSellPrice, 
  calculateMaximumDiscount, 
  evaluateMarginStatus, 
  calculateCompleteProfitSummary, 
  simulateWhatIfPricing 
} from '../profitIntelligenceEngine';
import { DEFAULT_GLOBAL_PRICING_POLICY } from '../pricingPolicyService';
import { QuoteData, LineItem } from '../../../types/logistics';

describe('Phase 15: Profit & Margin Intelligence Core Formulas', () => {
  it('1. Core Formula: Calculates Gross Profit, Gross Margin, and Markup accurately', () => {
    // BUY = $1,000, SELL = $1,250
    const buy = 1000;
    const sell = 1250;
    const profit = calculateGrossProfit(sell, buy);
    expect(profit).toBe(250);

    const margin = calculateGrossMarginPercent(profit, sell);
    expect(margin).toBe(20); // (250 / 1250) * 100 = 20%

    const markup = calculateMarkupPercent(profit, buy);
    expect(markup).toBe(25); // (250 / 1000) * 100 = 25% (Distinction verified!)
  });

  it('2. Core Formula: Calculates Gross Margin for BUY = 1000, SELL = 1300', () => {
    const buy = 1000;
    const sell = 1300;
    const profit = calculateGrossProfit(sell, buy);
    expect(profit).toBe(300);

    const margin = calculateGrossMarginPercent(profit, sell);
    expect(margin).toBe(23.08); // (300 / 1300) * 100 ≈ 23.0769% rounded to 2 decimals
  });

  it('3. Target Margin: Calculates Recommended Sell Price', () => {
    // Target Margin = 20%, Cost = 1,000 => Recommended Sell = 1,000 / (1 - 0.20) = 1,250
    const cost = 1000;
    const targetMargin = 20;
    const recSell = calculateRecommendedSellPrice(cost, targetMargin);
    expect(recSell).toBe(1250);
  });

  it('4. Minimum Sell Price: Calculates Price Floor correctly', () => {
    // Cost = 2,000, Min Margin = 15% => Min Sell = 2,000 / 0.85 = 2,352.941...
    const cost = 2000;
    const minMargin = 15;
    const minSell = calculateMinimumSellPrice(cost, minMargin);
    expect(Math.round(minSell * 100) / 100).toBe(2352.94);
  });

  it('5. Maximum Discount: Calculates Max Discount and Max Discount %', () => {
    // List Price = 1,500, Cost = 1,000, Min Margin = 15% => Min Sell = 1,176.47
    // Max Discount = 1,500 - 1,176.47 = 323.53
    const listPrice = 1500;
    const minSell = 1000 / 0.85; // 1176.4705...
    const discount = calculateMaximumDiscount(listPrice, minSell);
    expect(discount.maxDiscountAmount).toBe(323.53);
    expect(discount.maxDiscountPercent).toBe(21.57);
  });

  it('6. Margin Status: Evaluates normalized margin statuses', () => {
    expect(evaluateMarginStatus(25, 20, 15, 8, 1000, 1300)).toBe('ABOVE_TARGET');
    expect(evaluateMarginStatus(20, 20, 15, 8, 1000, 1250)).toBe('AT_TARGET');
    expect(evaluateMarginStatus(17, 20, 15, 8, 1000, 1200)).toBe('BELOW_TARGET');
    expect(evaluateMarginStatus(12, 20, 15, 8, 1000, 1136)).toBe('BELOW_MINIMUM');
    expect(evaluateMarginStatus(5, 20, 15, 8, 1000, 1050)).toBe('BLOCKED');
    expect(evaluateMarginStatus(0, 20, 15, 8, 0, 1000)).toBe('NO_COST');
    expect(evaluateMarginStatus(0, 20, 15, 8, 1000, 0)).toBe('NO_SELL');
  });

  it('7. Quotation Summary: Computes full quotation profitability matrix', () => {
    const mockQuote: Partial<QuoteData> = {
      exchangeRate: 25400,
      quoteCurrency: 'USD',
      items: [
        {
          id: 'item-1',
          category: 'FREIGHT',
          code: 'O/F',
          description: 'Ocean Freight 40HC',
          quantity: 2,
          unit: 'Container',
          costPrice: 800,
          unitPrice: 1000,
          currency: 'USD',
          vatRate: 0,
          amountUsd: 2000,
          amountVnd: 50800000,
        } as LineItem,
        {
          id: 'item-2',
          category: 'LOCAL_CHARGE',
          code: 'THC',
          description: 'Terminal Handling',
          quantity: 2,
          unit: 'Container',
          costPrice: 120,
          unitPrice: 150,
          currency: 'USD',
          vatRate: 8,
          amountUsd: 300,
          amountVnd: 7620000,
        } as LineItem,
      ],
    };

    const summary = calculateCompleteProfitSummary(mockQuote, DEFAULT_GLOBAL_PRICING_POLICY, 'USD');

    // Total Cost = (800*2) + (120*2) = 1600 + 240 = 1840
    expect(summary.totalBuyCostUsd).toBe(1840);
    // Total Sell = 2000 + 300 = 2300
    expect(summary.totalSellUsd).toBe(2300);
    // Profit = 2300 - 1840 = 460
    expect(summary.grossProfitUsd).toBe(460);
    // Margin = (460 / 2300) * 100 = 20.0%
    expect(summary.grossMarginPercent).toBe(20);
    // Markup = (460 / 1840) * 100 = 25.0%
    expect(summary.markupPercent).toBe(25);
    expect(summary.marginStatus).toBe('AT_TARGET');
    expect(summary.approvalLevel).toBe('AUTO_ELIGIBLE');
  });

  it('8. What-If Simulation: Runs 100% locally with zero Firebase side-effects', () => {
    const mockQuote: Partial<QuoteData> = {
      exchangeRate: 25400,
      quoteCurrency: 'USD',
      items: [
        {
          id: 'item-1',
          category: 'FREIGHT',
          code: 'O/F',
          description: 'Ocean Freight',
          quantity: 1,
          unit: 'Container',
          costPrice: 1000,
          unitPrice: 1300,
          currency: 'USD',
          vatRate: 0,
          amountUsd: 1300,
          amountVnd: 33020000,
        } as LineItem,
      ],
    };

    // Simulate 10% discount
    const simResult = simulateWhatIfPricing(
      mockQuote, 
      { mode: 'DISCOUNT_PERCENT', discountPercent: 10, currency: 'USD' },
      DEFAULT_GLOBAL_PRICING_POLICY
    );

    // New sell = 1300 * 0.9 = 1170
    expect(simResult.simulatedSummary.totalSellUsd).toBe(1170);
    // Cost = 1000 => Profit = 170
    expect(simResult.simulatedSummary.grossProfitUsd).toBe(170);
    // Margin = (170 / 1170) * 100 ≈ 14.53%
    expect(simResult.simulatedSummary.grossMarginPercent).toBe(14.53);
    // Diff profit = 170 - 300 = -130
    expect(simResult.diffProfitUsd).toBe(-130);
    // Margin is 14.53% < Min 15% => Violated Price Floor
    expect(simResult.isPriceFloorViolated).toBe(true);
  });
});
