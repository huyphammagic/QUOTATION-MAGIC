import { Currency } from '../../types/logistics';
import { CompanyRoundingRules, RoundingMethod } from '../../types/financialConfig';

export interface CurrencyRoundingPolicy {
  usdDecimals: number;
  vndDecimals: number;
  eurDecimals?: number;
  method?: RoundingMethod;
  enableNearestHundredVnd?: boolean;
}

export const DEFAULT_ROUNDING_POLICY: CurrencyRoundingPolicy = {
  usdDecimals: 2,
  vndDecimals: 0,
  eurDecimals: 2,
  method: 'HALF_UP',
  enableNearestHundredVnd: false,
};

/**
 * Applies a specific rounding method to a floating point number
 */
function applyRoundingMethod(value: number, decimals: number, method: RoundingMethod = 'HALF_UP'): number {
  const factor = Math.pow(10, decimals);
  switch (method) {
    case 'FLOOR':
      return Math.floor(value * factor) / factor;
    case 'CEIL':
      return Math.ceil(value * factor) / factor;
    case 'ROUND_NEAREST_100':
      return Math.round(value / 100) * 100;
    case 'ROUND_NEAREST_1000':
      return Math.round(value / 1000) * 1000;
    case 'HALF_UP':
    default:
      return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}

/**
 * Rounds an amount based on currency policy and company configuration
 * USD: decimals (default 2)
 * VND: decimals (default 0, optional nearest 100 or 1000)
 */
export function roundCurrency(
  amount: number, 
  currency: Currency, 
  policy: CurrencyRoundingPolicy | CompanyRoundingRules = DEFAULT_ROUNDING_POLICY
): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  
  const method = ('method' in policy && policy.method) ? policy.method : 'HALF_UP';
  const usdDec = policy.usdDecimals !== undefined ? policy.usdDecimals : 2;
  const vndDec = policy.vndDecimals !== undefined ? policy.vndDecimals : 0;
  const enableNearest100 = 'enableNearestHundredVnd' in policy && !!policy.enableNearestHundredVnd;

  if (currency === 'USD') {
    return applyRoundingMethod(amount, usdDec, method);
  } else {
    if (enableNearest100 || method === 'ROUND_NEAREST_100') {
      return Math.round(amount / 100) * 100;
    }
    if (method === 'ROUND_NEAREST_1000') {
      return Math.round(amount / 1000) * 1000;
    }
    return applyRoundingMethod(amount, vndDec, method);
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
