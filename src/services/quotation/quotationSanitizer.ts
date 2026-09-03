import { QuoteData, LineItem } from '../../types/logistics';
import { 
  QuotationDocumentSnapshot, 
  QuotationDocumentType, 
  QuotationDocumentLanguage,
  SanitizedLineItem 
} from '../../types/quotationDocument';

/**
 * Creates an immutable, sanitized snapshot of an approved quotation
 * strictly adhering to enterprise data isolation and confidentiality rules.
 */
export function createQuotationDocumentSnapshot(
  quote: QuoteData,
  documentType: QuotationDocumentType,
  language: QuotationDocumentLanguage,
  revision: number = 1,
  approvedBy?: string
): QuotationDocumentSnapshot {
  const isCustomerFacing = documentType === 'CUSTOMER_QUOTATION' || documentType === 'CONFIRMATION_NOTICE';

  // Sanitize line items
  const sanitizedItems: SanitizedLineItem[] = quote.items.map((item: LineItem) => {
    const baseItem: SanitizedLineItem = {
      id: item.id,
      category: item.category,
      location: item.location || 'POL',
      code: item.code,
      description: item.description,
      basis: item.basis,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      currency: item.currency,
      vatRate: item.vatRate,
      vatAmountUsd: item.vatAmountUsd,
      vatAmountVnd: item.vatAmountVnd,
      amountUsd: item.amountUsd,
      amountVnd: item.amountVnd,
      totalWithVatUsd: item.totalWithVatUsd,
      totalWithVatVnd: item.totalWithVatVnd,
      note: item.note,
    };

    // Only internal quotations retain buy cost, profit, and margin
    if (!isCustomerFacing) {
      baseItem.costPrice = item.costPrice;
      baseItem.costTotalUsd = item.costTotalUsd;
      baseItem.costTotalVnd = item.costTotalVnd;
      baseItem.profitUsd = item.profitUsd;
      baseItem.profitVnd = item.profitVnd;
      baseItem.marginPercent = item.marginPercent;
    }

    return baseItem;
  });

  const snapshot: QuotationDocumentSnapshot = {
    quotationId: quote.id,
    quoteNumber: quote.quoteNumber,
    revision,
    createdDate: quote.createdDate,
    approvalDate: new Date().toISOString().slice(0, 10),
    approvedBy: approvedBy || quote.company?.salesRepName || 'Sales Manager',
    documentType,
    language,
    currency: quote.quoteCurrency || 'USD',
    exchangeRate: quote.exchangeRate || 25400,
    customer: { ...quote.customer },
    shipment: { ...quote.shipment },
    items: sanitizedItems,
    terms: { ...quote.terms },
    company: { ...quote.company },
    subtotalUsd: quote.subtotalUsd,
    subtotalVnd: quote.subtotalVnd,
    vatTotalUsd: quote.vatTotalUsd,
    vatTotalVnd: quote.vatTotalVnd,
    grandTotalUsd: quote.grandTotalUsd,
    grandTotalVnd: quote.grandTotalVnd,
  };

  // Only retain internal summary profitability metrics if NOT customer facing
  if (!isCustomerFacing) {
    snapshot.totalCostUsd = quote.totalCostUsd;
    snapshot.totalCostVnd = quote.totalCostVnd;
    snapshot.totalProfitUsd = quote.totalProfitUsd;
    snapshot.totalProfitVnd = quote.totalProfitVnd;
    snapshot.overallMarginPercent = quote.overallMarginPercent;
  }

  return snapshot;
}

/**
 * Validates whether a quotation is eligible for formal document generation
 */
export function validateQuotationForDocumentGeneration(quote: QuoteData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!quote.quoteNumber || quote.quoteNumber.trim() === '') {
    errors.push('Số báo giá (Quote Number) không được để trống.');
  }

  if (!quote.customer.companyName && !quote.customer.customerName) {
    errors.push('Thông tin khách hàng (Tên công ty hoặc Người liên hệ) không được để trống.');
  }

  if (!quote.shipment.pol || !quote.shipment.pod) {
    errors.push('Cảng đi (POL) và Cảng đến (POD) phải được chỉ định rõ ràng.');
  }

  if (!quote.items || quote.items.length === 0) {
    errors.push('Báo giá phải có ít nhất một hạng mục chi phí (Line Item).');
  }

  const zeroPriceItems = quote.items.filter(i => (i.unitPrice === 0 || i.unitPrice === undefined));
  if (zeroPriceItems.length > 0) {
    warnings.push(`Có ${zeroPriceItems.length} hạng mục có đơn giá bằng 0.`);
  }

  if (quote.status === 'DRAFT') {
    warnings.push('Báo giá đang ở trạng thái DRAFT (Nháp). Khi xuất PDF chính thức, trạng thái sẽ tự động chuyển thành SENT hoặc ACCEPTED.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Phase 8 Security Protocol:
 * Deeply sanitizes quote data before generating or emailing customer-facing documents.
 * Ensures zero leakage of buy costs, suppliers, internal notes, profits, or margins.
 */
export function sanitizeCustomerQuotationData(quote: QuoteData): QuoteData {
  const sanitizedItems: LineItem[] = quote.items.map((item: LineItem) => {
    // Copy item without any cost, profit, margin or supplier confidential fields
    const cleanItem: LineItem = {
      id: item.id,
      category: item.category,
      location: item.location || 'POL',
      code: item.code,
      description: item.description,
      basis: item.basis,
      percentageBase: item.percentageBase,
      percentageRate: item.percentageRate,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      currency: item.currency,
      vatRate: item.vatRate,
      vatAmountUsd: item.vatAmountUsd,
      vatAmountVnd: item.vatAmountVnd,
      amountUsd: item.amountUsd,
      amountVnd: item.amountVnd,
      totalWithVatUsd: item.totalWithVatUsd,
      totalWithVatVnd: item.totalWithVatVnd,
      note: item.note,
      // Carrier / schedule info is public only if part of transit/freetime
      transitTime: item.transitTime,
      freeTime: item.freeTime,
    };
    return cleanItem;
  });

  // Clean customer-facing quote
  const cleanQuote: QuoteData = {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    createdDate: quote.createdDate,
    updatedDate: quote.updatedDate,
    status: quote.status,
    quoteCurrency: quote.quoteCurrency || 'USD',
    exchangeRate: quote.exchangeRate,
    customer: { ...quote.customer },
    shipment: { ...quote.shipment },
    items: sanitizedItems,
    terms: { ...quote.terms },
    company: { ...quote.company },
    subtotalUsd: quote.subtotalUsd,
    subtotalVnd: quote.subtotalVnd,
    vatTotalUsd: quote.vatTotalUsd,
    vatTotalVnd: quote.vatTotalVnd,
    grandTotalUsd: quote.grandTotalUsd,
    grandTotalVnd: quote.grandTotalVnd,
    // Explicitly nullify/strip all internal financial metrics
    totalCostUsd: undefined,
    totalCostVnd: undefined,
    totalProfitUsd: undefined,
    totalProfitVnd: undefined,
    overallMarginPercent: undefined,
  };

  return cleanQuote;
}

/**
 * Phase 8 Audit & Penetration Security Check:
 * Inspects any object, snapshot or line items before sending email or generating secure link.
 * If any internal sensitive field is present, BLOCKS SEND immediately.
 */
export function verifyCustomerQuotationSecurity(target: any): {
  isSecure: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (!target) {
    return { isSecure: false, violations: ['Đối tượng kiểm tra dữ liệu không tồn tại.'] };
  }

  // Check top-level financial metrics
  if (target.totalCostUsd !== undefined && target.totalCostUsd !== null) {
    violations.push('Phát hiện trường giá vốn tổng (totalCostUsd) trong dữ liệu khách hàng.');
  }
  if (target.totalCostVnd !== undefined && target.totalCostVnd !== null) {
    violations.push('Phát hiện trường giá vốn tổng (totalCostVnd) trong dữ liệu khách hàng.');
  }
  if (target.totalProfitUsd !== undefined && target.totalProfitUsd !== null) {
    violations.push('Phát hiện trường lợi nhuận (totalProfitUsd) trong dữ liệu khách hàng.');
  }
  if (target.totalProfitVnd !== undefined && target.totalProfitVnd !== null) {
    violations.push('Phát hiện trường lợi nhuận (totalProfitVnd) trong dữ liệu khách hàng.');
  }
  if (target.overallMarginPercent !== undefined && target.overallMarginPercent !== null) {
    violations.push('Phát hiện tỷ lệ lợi nhuận gộp (overallMarginPercent) trong dữ liệu khách hàng.');
  }

  // Check line items
  const items = target.items || target.snapshot?.items;
  if (Array.isArray(items)) {
    items.forEach((item: any, idx: number) => {
      if (item.costPrice !== undefined && item.costPrice !== null) {
        violations.push(`Hạng mục #${idx + 1} (${item.code || 'Phí'}): Có giá vốn đơn vị (costPrice).`);
      }
      if (item.costTotalUsd !== undefined && item.costTotalUsd !== null) {
        violations.push(`Hạng mục #${idx + 1} (${item.code || 'Phí'}): Có tổng giá vốn USD (costTotalUsd).`);
      }
      if (item.costTotalVnd !== undefined && item.costTotalVnd !== null) {
        violations.push(`Hạng mục #${idx + 1} (${item.code || 'Phí'}): Có tổng giá vốn VND (costTotalVnd).`);
      }
      if (item.profitUsd !== undefined && item.profitUsd !== null) {
        violations.push(`Hạng mục #${idx + 1} (${item.code || 'Phí'}): Có lợi nhuận USD (profitUsd).`);
      }
      if (item.profitVnd !== undefined && item.profitVnd !== null) {
        violations.push(`Hạng mục #${idx + 1} (${item.code || 'Phí'}): Có lợi nhuận VND (profitVnd).`);
      }
      if (item.marginPercent !== undefined && item.marginPercent !== null) {
        violations.push(`Hạng mục #${idx + 1} (${item.code || 'Phí'}): Có biên lợi nhuận % (marginPercent).`);
      }
    });
  }

  return {
    isSecure: violations.length === 0,
    violations,
  };
}

