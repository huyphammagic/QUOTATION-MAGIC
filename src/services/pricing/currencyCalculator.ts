import { Currency } from '../../types/logistics';

export interface CurrencyRoundingPolicy {
  usdDecimals: number;
  vndDecimals: number;
}

export const DEFAULT_ROUNDING_POLICY: CurrencyRoundingPolicy = {
  usdDecimals: 2,
  vndDecimals: 0,
};

/**
 * Rounds an amount based on currency policy
 * USD: 2 decimal places (cents)
 * VND: 0 decimal places (VND has no fractional denomination)
 */
export function roundCurrency(amount: number, currency: Currency, policy = DEFAULT_ROUNDING_POLICY): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  
  if (currency === 'USD') {
    const factor = Math.pow(10, policy.usdDecimals);
    return Math.round((amount + Number.EPSILON) * factor) / factor;
  } else {
    return Math.round(amount);
  }
}

/**
 * Converts an amount from one currency to another using the provided exchange rate (USD/VND rate)
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  exchangeRate: number
): number {
  if (isNaN(amount) || !isFinite(amount) || amount === 0) return 0;
  if (from === to) return amount;

  const validRate = exchangeRate > 0 ? exchangeRate : 25400;

  if (from === 'USD' && to === 'VND') {
    return amount * validRate;
  } else if (from === 'VND' && to === 'USD') {
    return amount / validRate;
  }

  return amount;
}

/**
 * Returns pair amounts [usdAmount, vndAmount] given an amount, its source currency, and exchange rate
 */
export function calculateCurrencyPair(
  amount: number,
  currency: Currency,
  exchangeRate: number
): { amountUsd: number; amountVnd: number } {
  const validRate = exchangeRate > 0 ? exchangeRate : 25400;

  if (currency === 'USD') {
    const usd = roundCurrency(amount, 'USD');
    const vnd = roundCurrency(amount * validRate, 'VND');
    return { amountUsd: usd, amountVnd: vnd };
  } else {
    const vnd = roundCurrency(amount, 'VND');
    const usd = roundCurrency(amount / validRate, 'USD');
    return { amountUsd: usd, amountVnd: vnd };
  }
}
