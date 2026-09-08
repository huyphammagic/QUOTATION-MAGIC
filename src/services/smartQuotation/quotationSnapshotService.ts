import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { QuoteData, LineItem } from '../../types/logistics';
import { QuotationPricingSnapshot, QuotationPricingSnapshotItem } from '../../types/smartQuotation';
import { recordPricingAuditEvent } from '../pricing/pricingAuditService';
import { UserRole } from '../../types/analytics';

/**
 * Creates an immutable frozen pricing snapshot of a quotation.
 * Ensures future changes in Rate Master or Contracts will NOT retroactively distort historical quotes.
 */
export function buildPricingSnapshot(
  quote: QuoteData,
  actor: string = 'System'
): QuotationPricingSnapshot {
  const snapshotId = `snap-${quote.id}-${Date.now()}`;
  const now = new Date().toISOString();

  const snapshotItems: QuotationPricingSnapshotItem[] = quote.items.map((item) => ({
    id: item.id,
    code: item.code,
    description: item.description,
    category: item.category,
    location: item.location,
    quantity: item.quantity,
    unit: item.unit,
    basis: item.basis as any,
    currency: item.currency,
    costPrice: item.costPrice || 0,
    costTotalUsd: item.costTotalUsd || 0,
    costTotalVnd: item.costTotalVnd || 0,
    unitPrice: item.unitPrice,
    amountUsd: item.amountUsd,
    amountVnd: item.amountVnd,
    profitUsd: item.profitUsd || 0,
    profitVnd: item.profitVnd || 0,
    marginPercent: item.marginPercent || 0,
    rateSource: (item as any).rateSource,
    rateSourceReference: (item as any).rateSourceReference,
    validity: (item as any).validity,
  }));

  return {
    snapshotId,
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    version: quote.version || 1,
    createdAt: now,
    createdBy: actor,
    exchangeRate: quote.exchangeRate,
    quoteCurrency: quote.quoteCurrency || 'USD',
    items: snapshotItems,
    subtotalUsd: quote.subtotalUsd,
    subtotalVnd: quote.subtotalVnd,
    vatTotalUsd: quote.vatTotalUsd,
    vatTotalVnd: quote.vatTotalVnd,
    grandTotalUsd: quote.grandTotalUsd,
    grandTotalVnd: quote.grandTotalVnd,
    totalCostUsd: quote.totalCostUsd || 0,
    totalCostVnd: quote.totalCostVnd || 0,
    totalProfitUsd: quote.totalProfitUsd || 0,
    totalProfitVnd: quote.totalProfitVnd || 0,
    overallMarginPercent: quote.overallMarginPercent || 0,
    priceLocked: quote.priceLocked || quote.status === 'APPROVED',
    priceOverrideReason: quote.priceOverrideReason,
    pricingPolicyId: quote.pricingPolicyId,
    pricingPolicyCode: quote.pricingPolicyCode,
  };
}

/**
 * Validates if the quotation prices can be edited given user role and quote status.
 */
export function canEditQuotationPricing(
  quote: QuoteData,
  userRole: UserRole = 'SALES_REP'
): { allowed: boolean; reason?: string } {
  // Admin, Sales Manager, and Pricing Specialist can always manage pricing
  if (userRole === 'ADMIN' || userRole === 'SALES_MANAGER' || userRole === 'PRICING_SPECIALIST') {
    return { allowed: true };
  }

  // If quote is Approved or Price Locked: sales cannot edit directly
  if (quote.status === 'APPROVED' || quote.priceLocked) {
    return {
      allowed: false,
      reason: 'Báo giá đã được phê duyệt và khóa giá cố định. Để thay đổi giá, vui lòng tạo Bản sửa đổi mới (Create Revision) hoặc yêu cầu Quản lý mở khóa.',
    };
  }

  return { allowed: true };
}

/**
 * Creates a new Revision of an existing quotation (e.g. LOG-2026-001 -> LOG-2026-001-R1)
 * Preserves historical approved version and unlocks new version for revisions.
 */
export function createQuotationRevision(
  existingQuote: QuoteData,
  actor: string
): QuoteData {
  const nextVersion = (existingQuote.version || 1) + 1;
  const baseQuoteNumber = existingQuote.quoteNumber.replace(/-R\d+$/, '');
  const revisionQuoteNumber = `${baseQuoteNumber}-R${nextVersion - 1}`;
  const now = new Date().toISOString().slice(0, 10);

  return {
    ...existingQuote,
    id: `quote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    quoteNumber: revisionQuoteNumber,
    version: nextVersion,
    status: 'DRAFT',
    priceLocked: false,
    createdDate: now,
    updatedDate: now,
    _updatedBy: actor,
    _createdAt: serverTimestamp(),
  };
}

/**
 * Handles price override event: logs audit trail to Firestore
 */
export async function logPriceOverrideAudit(
  quote: QuoteData,
  item: LineItem,
  originalPrice: number,
  newPrice: number,
  reason: string,
  user: string
): Promise<void> {
  await recordPricingAuditEvent({
    quotationId: quote.id,
    quotationNumber: quote.quoteNumber,
    action: 'PRICE_OVERRIDE',
    userId: user,
    userName: user,
    oldValue: {
      lineItemId: item.id,
      chargeCode: item.code,
      chargeDescription: item.description,
      currency: item.currency,
      costPrice: item.costPrice || 0,
      sellPrice: originalPrice,
      marginPercent: item.marginPercent || 0,
    },
    newValue: {
      lineItemId: item.id,
      chargeCode: item.code,
      chargeDescription: item.description,
      currency: item.currency,
      costPrice: item.costPrice || 0,
      sellPrice: newPrice,
      marginPercent: newPrice > (item.costPrice || 0) && newPrice > 0 
        ? Math.round(((newPrice - (item.costPrice || 0)) / newPrice) * 10000) / 100 
        : 0,
    },
    reason: reason || 'Điều chỉnh giá theo thỏa thuận với khách hàng',
    notes: `Điều chỉnh giá bán mục [${item.code}] từ ${originalPrice} thành ${newPrice} ${item.currency}`,
  });
}
