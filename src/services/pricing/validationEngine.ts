import { LineItem, QuoteData, Currency } from '../../types/logistics';
import { ValidationError, ValidationResult } from '../../types/pricing';

export const ALLOWED_CURRENCIES: Currency[] = ['USD', 'VND'];

/**
 * Validates a single LineItem
 */
export function validateLineItem(item: LineItem, index: number = 0): ValidationError[] {
  const errors: ValidationError[] = [];

  // Description / Name
  if (!item.description || item.description.trim() === '') {
    errors.push({
      itemId: item.id,
      field: 'description',
      messageVi: `Dòng #${index + 1}: Thiếu tên/diễn giải hạng mục phí.`,
      messageEn: `Line #${index + 1}: Missing charge description/name.`,
      severity: 'error',
    });
  }

  // Code
  if (!item.code || item.code.trim() === '') {
    errors.push({
      itemId: item.id,
      field: 'code',
      messageVi: `Dòng #${index + 1} (${item.description || 'Không tên'}): Thiếu mã phí.`,
      messageEn: `Line #${index + 1} (${item.description || 'Unnamed'}): Missing charge code.`,
      severity: 'warning',
    });
  }

  // Quantity
  if (isNaN(item.quantity) || !isFinite(item.quantity)) {
    errors.push({
      itemId: item.id,
      field: 'quantity',
      messageVi: `Dòng #${index + 1}: Số lượng không hợp lệ (NaN/Infinity).`,
      messageEn: `Line #${index + 1}: Invalid quantity (NaN/Infinity).`,
      severity: 'error',
    });
  } else if (item.quantity < 0) {
    errors.push({
      itemId: item.id,
      field: 'quantity',
      messageVi: `Dòng #${index + 1}: Số lượng không được nhỏ hơn 0.`,
      messageEn: `Line #${index + 1}: Quantity cannot be negative.`,
      severity: 'error',
    });
  }

  // Unit Price
  if (isNaN(item.unitPrice) || !isFinite(item.unitPrice)) {
    errors.push({
      itemId: item.id,
      field: 'unitPrice',
      messageVi: `Dòng #${index + 1}: Đơn giá bán không hợp lệ (NaN/Infinity).`,
      messageEn: `Line #${index + 1}: Invalid unit selling price (NaN/Infinity).`,
      severity: 'error',
    });
  } else if (item.unitPrice < 0) {
    errors.push({
      itemId: item.id,
      field: 'unitPrice',
      messageVi: `Dòng #${index + 1}: Đơn giá bán không được là số âm.`,
      messageEn: `Line #${index + 1}: Selling price cannot be negative.`,
      severity: 'error',
    });
  }

  // Cost Price (optional but if specified must be >= 0)
  if (item.costPrice !== undefined && item.costPrice !== null) {
    if (isNaN(item.costPrice) || !isFinite(item.costPrice)) {
      errors.push({
        itemId: item.id,
        field: 'costPrice',
        messageVi: `Dòng #${index + 1}: Giá vốn không hợp lệ (NaN/Infinity).`,
        messageEn: `Line #${index + 1}: Invalid cost price (NaN/Infinity).`,
        severity: 'error',
      });
    } else if (item.costPrice < 0) {
      errors.push({
        itemId: item.id,
        field: 'costPrice',
        messageVi: `Dòng #${index + 1}: Giá vốn không được là số âm.`,
        messageEn: `Line #${index + 1}: Cost price cannot be negative.`,
        severity: 'error',
      });
    }
  }

  // VAT Rate
  if (isNaN(item.vatRate) || !isFinite(item.vatRate)) {
    errors.push({
      itemId: item.id,
      field: 'vatRate',
      messageVi: `Dòng #${index + 1}: Thuế suất VAT không hợp lệ.`,
      messageEn: `Line #${index + 1}: Invalid VAT rate.`,
      severity: 'error',
    });
  } else if (item.vatRate < 0 || item.vatRate > 100) {
    errors.push({
      itemId: item.id,
      field: 'vatRate',
      messageVi: `Dòng #${index + 1}: Thuế suất VAT phải nằm trong khoảng 0% đến 100%.`,
      messageEn: `Line #${index + 1}: VAT rate must be between 0% and 100%.`,
      severity: 'error',
    });
  }

  // Currency
  if (!ALLOWED_CURRENCIES.includes(item.currency)) {
    errors.push({
      itemId: item.id,
      field: 'currency',
      messageVi: `Dòng #${index + 1}: Loại tiền tệ '${item.currency}' không được hỗ trợ.`,
      messageEn: `Line #${index + 1}: Unsupported currency '${item.currency}'.`,
      severity: 'error',
    });
  }

  // Unit
  if (!item.unit || item.unit.trim() === '') {
    errors.push({
      itemId: item.id,
      field: 'unit',
      messageVi: `Dòng #${index + 1}: Thiếu đơn vị tính (Unit).`,
      messageEn: `Line #${index + 1}: Missing unit of measure.`,
      severity: 'warning',
    });
  }

  // Percentage Charge validation
  if (item.basis === 'PERCENTAGE') {
    const pct = item.percentageRate !== undefined ? item.percentageRate : item.unitPrice;
    if (pct < 0 || pct > 100) {
      errors.push({
        itemId: item.id,
        field: 'percentageRate',
        messageVi: `Dòng #${index + 1}: Tỷ lệ phần trăm tính phí (${pct}%) không hợp lệ (phải từ 0% đến 100%).`,
        messageEn: `Line #${index + 1}: Percentage rate (${pct}%) must be between 0% and 100%.`,
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Validates the entire QuoteData object and its financial integrity
 */
export function validateQuote(quote: Partial<QuoteData>): ValidationResult {
  const allErrors: ValidationError[] = [];
  const seenIds = new Set<string>();

  // Exchange Rate check
  const rate = Number(quote.exchangeRate);
  if (isNaN(rate) || !isFinite(rate) || rate <= 0) {
    allErrors.push({
      field: 'exchangeRate',
      messageVi: 'Tỷ giá quy đổi (USD/VND) phải là số dương lớn hơn 0.',
      messageEn: 'Exchange rate (USD/VND) must be a positive number greater than 0.',
      severity: 'error',
    });
  }

  // Line items validation
  const items = quote.items || [];
  if (items.length === 0) {
    allErrors.push({
      field: 'items',
      messageVi: 'Báo giá chưa có dòng chi phí nào.',
      messageEn: 'Quotation contains no line items.',
      severity: 'warning',
    });
  }

  items.forEach((item, idx) => {
    // Check duplicate IDs
    if (item.id) {
      if (seenIds.has(item.id)) {
        allErrors.push({
          itemId: item.id,
          field: 'id',
          messageVi: `Dòng #${idx + 1}: Trùng lặp ID (${item.id}).`,
          messageEn: `Line #${idx + 1}: Duplicate item ID (${item.id}).`,
          severity: 'warning',
        });
      }
      seenIds.add(item.id);
    }

    const itemErrors = validateLineItem(item, idx);
    allErrors.push(...itemErrors);
  });

  const errors = allErrors.filter(e => e.severity === 'error');
  const warnings = allErrors.filter(e => e.severity === 'warning');

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
