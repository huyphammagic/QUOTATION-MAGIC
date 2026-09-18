import { roundCurrency } from './currencyCalculator';
import { Currency } from '../../types/logistics';
import { TaxVatPolicy } from '../../types/financialConfig';

export interface TaxCalculationResult {
  taxableAmount: number;
  vatRate: number;
  vatAmount: number;
  totalWithTax: number;
  policy?: TaxVatPolicy;
}

/**
 * Calculates VAT amount and Total with VAT for a given taxable selling amount
 * Supports Exclusive (standard B2B), Inclusive (tax-included), Exempt, and Out of Scope
 */
export function calculateTax(
  taxableAmount: number,
  vatRate: number,
  currency: Currency = 'USD',
  policy: TaxVatPolicy = 'EXCLUSIVE'
): TaxCalculationResult {
  const safeAmount = isNaN(taxableAmount) || !isFinite(taxableAmount) ? 0 : taxableAmount;
  
  if (policy === 'EXEMPT' || policy === 'OUT_OF_SCOPE') {
    const rounded = roundCurrency(safeAmount, currency);
    return {
      taxableAmount: rounded,
      vatRate: 0,
      vatAmount: 0,
      totalWithTax: rounded,
      policy,
    };
  }

  const safeRate = isNaN(vatRate) || !isFinite(vatRate) || vatRate < 0 ? 0 : Math.min(100, vatRate);

  if (policy === 'INCLUSIVE') {
    // If rate is inclusive: Total = safeAmount, Taxable = Total / (1 + Rate)
    const factor = 1 + (safeRate / 100);
    const computedNet = factor > 0 ? safeAmount / factor : safeAmount;
    const computedVat = safeAmount - computedNet;

    const roundedNet = roundCurrency(computedNet, currency);
    const roundedVat = roundCurrency(computedVat, currency);
    const roundedTotal = roundCurrency(safeAmount, currency);

    return {
      taxableAmount: roundedNet,
      vatRate: safeRate,
      vatAmount: roundedVat,
      totalWithTax: roundedTotal,
      policy,
    };
  }

  // EXCLUSIVE & REVERSE_CHARGE
  const rawVat = (safeAmount * safeRate) / 100;
  const roundedVat = roundCurrency(rawVat, currency);
  const roundedTotalWithTax = roundCurrency(safeAmount + rawVat, currency);

  return {
    taxableAmount: roundCurrency(safeAmount, currency),
    vatRate: safeRate,
    vatAmount: roundedVat,
    totalWithTax: roundedTotalWithTax,
    policy,
  };
}
