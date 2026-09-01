import { roundCurrency } from './currencyCalculator';
import { Currency } from '../../types/logistics';

export interface TaxCalculationResult {
  taxableAmount: number;
  vatRate: number;
  vatAmount: number;
  totalWithTax: number;
}

/**
 * Calculates VAT amount and Total with VAT for a given taxable selling amount
 */
export function calculateTax(
  taxableAmount: number,
  vatRate: number,
  currency: Currency = 'USD'
): TaxCalculationResult {
  const safeAmount = isNaN(taxableAmount) || !isFinite(taxableAmount) ? 0 : taxableAmount;
  const safeRate = isNaN(vatRate) || !isFinite(vatRate) || vatRate < 0 ? 0 : Math.min(100, vatRate);

  const rawVat = (safeAmount * safeRate) / 100;
  const roundedVat = roundCurrency(rawVat, currency);
  const roundedTotalWithTax = roundCurrency(safeAmount + rawVat, currency);

  return {
    taxableAmount: roundCurrency(safeAmount, currency),
    vatRate: safeRate,
    vatAmount: roundedVat,
    totalWithTax: roundedTotalWithTax,
  };
}
