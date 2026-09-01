import { roundCurrency } from './currencyCalculator';
import { Currency } from '../../types/logistics';

export interface ProfitCalculationResult {
  cost: number;
  sell: number;
  profit: number;
  marginPercent: number; // e.g. 23.08
}

/**
 * Calculates profit and margin percentage safely
 * Margin = (Profit / Sell) * 100
 * Never produces NaN or Infinity
 */
export function calculateProfitAndMargin(
  sellAmount: number,
  costAmount: number,
  currency: Currency = 'USD'
): ProfitCalculationResult {
  const safeSell = isNaN(sellAmount) || !isFinite(sellAmount) ? 0 : sellAmount;
  const safeCost = isNaN(costAmount) || !isFinite(costAmount) ? 0 : costAmount;

  const rawProfit = safeSell - safeCost;
  const roundedProfit = roundCurrency(rawProfit, currency);

  let marginPercent = 0;
  if (safeSell > 0) {
    const rawMargin = (rawProfit / safeSell) * 100;
    marginPercent = isNaN(rawMargin) || !isFinite(rawMargin) 
      ? 0 
      : Math.round((rawMargin + Number.EPSILON) * 100) / 100;
  } else if (safeSell === 0 && safeCost > 0) {
    marginPercent = -100;
  } else {
    marginPercent = 0;
  }

  return {
    cost: roundCurrency(safeCost, currency),
    sell: roundCurrency(safeSell, currency),
    profit: roundedProfit,
    marginPercent: marginPercent,
  };
}

/**
 * Calculates overall quote margin from totals
 */
export function calculateOverallMargin(
  totalSell: number,
  totalCost: number
): number {
  if (totalSell <= 0 || isNaN(totalSell) || !isFinite(totalSell)) {
    return 0;
  }
  const totalProfit = totalSell - totalCost;
  const rawMargin = (totalProfit / totalSell) * 100;
  return isNaN(rawMargin) || !isFinite(rawMargin)
    ? 0
    : Math.round((rawMargin + Number.EPSILON) * 100) / 100;
}
