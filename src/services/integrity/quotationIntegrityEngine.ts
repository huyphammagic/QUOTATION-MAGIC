/**
 * QUOTATION DATA INTEGRITY & IMMUTABLE LIFECYCLE ENGINE (PHASE 32)
 * Ensures 100% data safety, financial consistency, and prevents illegal state transitions.
 * Non-destructive, idempotent, and Firebase-first.
 */

import { QuoteData, QuoteStatus, LineItem } from '../../types/logistics';
import { roundCurrency } from '../pricing/currencyCalculator';
import { calculateProfitAndMargin } from '../pricing/profitCalculator';

export interface IntegrityValidationIssue {
  field: string;
  code: string;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  messageVi: string;
  messageEn: string;
}

export interface QuotationIntegrityResult {
  isValid: boolean;
  canSave: boolean;
  issues: IntegrityValidationIssue[];
  calculatedTotals: {
    totalSellUsd: number;
    totalSellVnd: number;
    totalCostUsd: number;
    totalCostVnd: number;
    grossProfitUsd: number;
    grossProfitVnd: number;
    grossMarginPercent: number;
  };
}

/**
 * Valid state transitions for Quotations
 * DRAFT -> PENDING_APPROVAL -> APPROVED -> SENT (or ISSUED) -> VIEWED -> ACCEPTED / REJECTED / EXPIRED / CANCELLED
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED', 'DRAFT'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'DRAFT', 'CANCELLED'],
  APPROVED: ['SENT', 'ISSUED', 'CANCELLED', 'EXPIRED'],
  ISSUED: ['SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
  SENT: ['VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
  VIEWED: ['ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
  ACCEPTED: ['CANCELLED'], // Accepted quotes cannot easily change status
  REJECTED: ['DRAFT', 'CANCELLED'], // Can reopen to DRAFT if revising
  EXPIRED: ['DRAFT', 'CANCELLED'], // Can clone or reopen to draft
  CANCELLED: [], // Terminal state
};

/**
 * Statuses where quotation business data is locked (Immutable Snapshot)
 * To modify, user must create a new revision or explicitly change status via approval.
 */
export const LOCKED_IMMUTABLE_STATUSES: QuoteStatus[] = [
  'APPROVED',
  'SENT',
  'ISSUED',
  'ACCEPTED',
];

/**
 * Validates if a transition from currentStatus to targetStatus is permitted
 */
export function validateQuotationStatusTransition(
  currentStatus: QuoteStatus,
  targetStatus: QuoteStatus,
  userRole?: string
): { allowed: boolean; messageVi: string; messageEn: string } {
  if (currentStatus === targetStatus) {
    return { allowed: true, messageVi: 'Trạng thái giữ nguyên.', messageEn: 'Status unchanged.' };
  }

  // Admin and Sales Manager can force certain corrective transitions
  const isManager = userRole === 'ADMIN' || userRole === 'SALES_MANAGER' || userRole === 'PRICING_MANAGER';

  const allowedNext = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  if (allowedNext.includes(targetStatus)) {
    return { allowed: true, messageVi: 'Chuyển trạng thái hợp lệ.', messageEn: 'Valid transition.' };
  }

  // Allow managers to reopen expired or rejected quotes to draft
  if (isManager && targetStatus === 'DRAFT') {
    return { 
      allowed: true, 
      messageVi: 'Quản lý được phép mở lại báo giá về trạng thái Nháp (DRAFT).', 
      messageEn: 'Manager authorized to reopen quotation to DRAFT.' 
    };
  }

  return {
    allowed: false,
    messageVi: `Không cho phép chuyển trạng thái từ [${currentStatus}] sang [${targetStatus}]. Quy trình nghiệp vụ yêu cầu thực hiện tuần tự.`,
    messageEn: `Status transition from [${currentStatus}] to [${targetStatus}] is forbidden by business workflow.`,
  };
}

/**
 * Checks if a quotation is currently in an immutable/locked state
 */
export function isQuotationLocked(status: QuoteStatus): boolean {
  return LOCKED_IMMUTABLE_STATUSES.includes(status);
}

/**
 * Deep validation of Quotation business data integrity & financial consistency
 */
export function validateQuotationIntegrity(
  quote: QuoteData,
  options?: { isExistingQuote?: boolean; existingStatus?: QuoteStatus; userRole?: string }
): QuotationIntegrityResult {
  const issues: IntegrityValidationIssue[] = [];

  // 1. Mandatory Identity and Reference Fields
  if (!quote.quoteNumber || quote.quoteNumber.trim() === '') {
    issues.push({
      field: 'quoteNumber',
      code: 'MISSING_QUOTE_NUMBER',
      severity: 'CRITICAL',
      messageVi: 'Thiếu số báo giá nghiệp vụ.',
      messageEn: 'Missing business quotation number.',
    });
  }

  if (!quote.customer || (!quote.customer.customerName && !quote.customer.companyName)) {
    issues.push({
      field: 'customer',
      code: 'MISSING_CUSTOMER_INFO',
      severity: 'CRITICAL',
      messageVi: 'Thiếu thông tin khách hàng nhận báo giá.',
      messageEn: 'Missing target customer information.',
    });
  }

  // 2. Shipment details validation
  if (!quote.shipment) {
    issues.push({
      field: 'shipment',
      code: 'MISSING_SHIPMENT',
      severity: 'CRITICAL',
      messageVi: 'Thiếu thông tin vận chuyển lô hàng.',
      messageEn: 'Missing shipment logistics details.',
    });
  } else {
    if (!quote.shipment.pol || quote.shipment.pol.trim() === '') {
      issues.push({
        field: 'shipment.pol',
        code: 'MISSING_POL',
        severity: 'ERROR',
        messageVi: 'Thiếu Cảng/Điểm bốc hàng (POL / Origin).',
        messageEn: 'Missing Port of Loading (POL / Origin).',
      });
    }
    if (!quote.shipment.pod || quote.shipment.pod.trim() === '') {
      issues.push({
        field: 'shipment.pod',
        code: 'MISSING_POD',
        severity: 'ERROR',
        messageVi: 'Thiếu Cảng/Điểm dỡ hàng (POD / Destination).',
        messageEn: 'Missing Port of Discharge (POD / Destination).',
      });
    }
    if (quote.shipment.quantity !== undefined && quote.shipment.quantity <= 0) {
      issues.push({
        field: 'shipment.quantity',
        code: 'INVALID_SHIPMENT_QTY',
        severity: 'WARNING',
        messageVi: 'Số lượng container/kiện vận chuyển nên lớn hơn 0.',
        messageEn: 'Shipment container/package quantity should be greater than 0.',
      });
    }
  }

  // 3. Status transition check if updating an existing quote
  if (options?.isExistingQuote && options?.existingStatus) {
    const transitionCheck = validateQuotationStatusTransition(
      options.existingStatus,
      quote.status,
      options.userRole
    );
    if (!transitionCheck.allowed) {
      issues.push({
        field: 'status',
        code: 'INVALID_STATUS_TRANSITION',
        severity: 'CRITICAL',
        messageVi: transitionCheck.messageVi,
        messageEn: transitionCheck.messageEn,
      });
    }

    // Check immutability protection
    if (isQuotationLocked(options.existingStatus) && quote.status === options.existingStatus) {
      issues.push({
        field: 'status',
        code: 'IMMUTABLE_RECORD_LOCKED',
        severity: 'WARNING',
        messageVi: `Báo giá này đang ở trạng thái [${options.existingStatus}]. Dữ liệu cước đã khóa bất biến để bảo vệ lịch sử hợp đồng.`,
        messageEn: `Quotation is in [${options.existingStatus}] state. Pricing details are locked to protect audit trail.`,
      });
    }
  }

  // 4. Line Items and Calculation Consistency
  const lineItems = quote.items || (quote as any).lineItems || [];
  if (lineItems.length === 0) {
    issues.push({
      field: 'items',
      code: 'NO_LINE_ITEMS',
      severity: 'WARNING',
      messageVi: 'Báo giá hiện chưa có dòng cước nào.',
      messageEn: 'Quotation has no charge line items.',
    });
  }

  let totalSellUsd = 0;
  let totalSellVnd = 0;
  let totalCostUsd = 0;
  let totalCostVnd = 0;

  const rate = quote.exchangeRate && quote.exchangeRate > 0 ? quote.exchangeRate : 25400;

  lineItems.forEach((item: LineItem, idx: number) => {
    // Basic item checks
    if (!item.description || item.description.trim() === '') {
      issues.push({
        field: `items[${idx}].description`,
        code: 'MISSING_LINE_DESCRIPTION',
        severity: 'ERROR',
        messageVi: `Dòng cước #${idx + 1}: Thiếu tên diễn giải phí.`,
        messageEn: `Line #${idx + 1}: Missing charge description.`,
      });
    }

    if (item.quantity < 0 || isNaN(item.quantity)) {
      issues.push({
        field: `items[${idx}].quantity`,
        code: 'INVALID_QUANTITY',
        severity: 'ERROR',
        messageVi: `Dòng cước #${idx + 1}: Số lượng không được âm.`,
        messageEn: `Line #${idx + 1}: Quantity cannot be negative.`,
      });
    }

    if (item.unitPrice < 0 || isNaN(item.unitPrice)) {
      issues.push({
        field: `items[${idx}].unitPrice`,
        code: 'INVALID_UNIT_PRICE',
        severity: 'ERROR',
        messageVi: `Dòng cước #${idx + 1}: Đơn giá bán không được âm.`,
        messageEn: `Line #${idx + 1}: Unit selling price cannot be negative.`,
      });
    }

    if (item.costPrice !== undefined && (item.costPrice < 0 || isNaN(item.costPrice))) {
      issues.push({
        field: `items[${idx}].costPrice`,
        code: 'INVALID_COST_PRICE',
        severity: 'ERROR',
        messageVi: `Dòng cước #${idx + 1}: Giá vốn không được âm.`,
        messageEn: `Line #${idx + 1}: Cost price cannot be negative.`,
      });
    }

    // Accumulate sums
    const sellAmount = item.amountUsd || item.amountVnd || (item.quantity * item.unitPrice);
    const costAmount = (item.costPrice !== undefined ? item.quantity * item.costPrice : 0);

    if (item.currency === 'USD') {
      totalSellUsd += sellAmount;
      totalCostUsd += costAmount;
    } else {
      totalSellVnd += sellAmount;
      totalCostVnd += costAmount;
    }
  });

  // Safe rounding
  totalSellUsd = roundCurrency(totalSellUsd, 'USD');
  totalSellVnd = roundCurrency(totalSellVnd, 'VND');
  totalCostUsd = roundCurrency(totalCostUsd, 'USD');
  totalCostVnd = roundCurrency(totalCostVnd, 'VND');

  // Unified converted totals in USD
  const unifiedTotalSellUsd = roundCurrency(totalSellUsd + (totalSellVnd / rate), 'USD');
  const unifiedTotalCostUsd = roundCurrency(totalCostUsd + (totalCostVnd / rate), 'USD');

  const profitCalc = calculateProfitAndMargin(unifiedTotalSellUsd, unifiedTotalCostUsd, 'USD');

  // Check for negative profit warning
  if (profitCalc.profit < 0) {
    issues.push({
      field: 'profit',
      code: 'NEGATIVE_PROFIT_WARNING',
      severity: 'WARNING',
      messageVi: `Báo giá đang bị lỗ (Lợi nhuận: -$${Math.abs(profitCalc.profit).toFixed(2)} USD). Cần xem xét phê duyệt giá đặc biệt.`,
      messageEn: `Quotation is operating at a loss (Profit: -$${Math.abs(profitCalc.profit).toFixed(2)} USD). Requires approval.`,
    });
  }

  // Determine if quotation can be saved
  const hasCritical = issues.some(i => i.severity === 'CRITICAL');
  const hasError = issues.some(i => i.severity === 'ERROR');

  return {
    isValid: !hasCritical && !hasError,
    canSave: !hasCritical, // Warnings and simple errors allow saving draft, but critical blocks
    issues,
    calculatedTotals: {
      totalSellUsd,
      totalSellVnd,
      totalCostUsd,
      totalCostVnd,
      grossProfitUsd: profitCalc.profit,
      grossProfitVnd: roundCurrency(profitCalc.profit * rate, 'VND'),
      grossMarginPercent: profitCalc.marginPercent,
    },
  };
}
