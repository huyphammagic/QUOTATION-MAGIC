import { RateMasterItem, RateValidationResult } from '../../types/masterRate';
import { ChargeBasis } from '../../types/pricing';
import { TransportMode, Currency, ContainerType } from '../../types/logistics';

/**
 * Validates unit compatibility between rate basis and transport mode / equipment
 */
export function isUnitCompatible(basis: ChargeBasis, mode: TransportMode, containerType?: ContainerType | string): boolean {
  if (basis === 'PER_CONTAINER') {
    return mode === 'SEA_FCL' || (Boolean(containerType) && !containerType?.includes('LCL') && !containerType?.includes('AIR'));
  }
  if (basis === 'PER_CBM' || basis === 'PER_WM') {
    return mode === 'SEA_LCL' || mode === 'WAREHOUSING' || mode === 'MULTIMODAL';
  }
  if (basis === 'PER_KG' || basis === 'PER_CHARGEABLE_KG') {
    return mode === 'AIR_FREIGHT' || mode === 'SEA_LCL' || mode === 'INLAND_TRUCKING';
  }
  if (basis === 'PER_TRIP' || basis === 'PER_TRUCK') {
    return mode === 'INLAND_TRUCKING';
  }
  return true; // PER_BL, PER_SHIPMENT, PER_DOCUMENT, FIXED, etc. are compatible with all
}

/**
 * Checks if two date intervals [from1, to1] and [from2, to2] overlap
 */
export function doDateIntervalsOverlap(from1: string, to1: string, from2: string, to2: string): boolean {
  const tFrom1 = new Date(from1).getTime();
  const tTo1 = new Date(to1).getTime();
  const tFrom2 = new Date(from2).getTime();
  const tTo2 = new Date(to2).getTime();

  if (isNaN(tFrom1) || isNaN(tTo1) || isNaN(tFrom2) || isNaN(tTo2)) {
    return false;
  }
  return tFrom1 <= tTo2 && tTo1 >= tFrom2;
}

/**
 * Checks for rate duplication or overlap within an existing rate collection
 */
export function checkDuplicateAndOverlap(
  candidate: Partial<RateMasterItem>,
  existingRates: RateMasterItem[]
): {
  isDuplicate: boolean;
  duplicateRateCode?: string;
  hasOverlap: boolean;
  overlappingRateCode?: string;
} {
  for (const r of existingRates) {
    if (candidate.id && r.id === candidate.id) continue;
    if (r.status === 'CANCELLED' || r.status === 'INACTIVE') continue;

    const sameRoute = 
      (r.origin || '').trim().toLowerCase() === (candidate.origin || '').trim().toLowerCase() &&
      (r.destination || '').trim().toLowerCase() === (candidate.destination || '').trim().toLowerCase();

    const sameCarrierOrSupplier = 
      (r.carrier || '').trim().toLowerCase() === (candidate.carrier || '').trim().toLowerCase() ||
      (r.supplierId && candidate.supplierId && r.supplierId === candidate.supplierId);

    const sameCharge = 
      (r.chargeCode || '').trim().toLowerCase() === (candidate.chargeCode || '').trim().toLowerCase();

    const sameContainer = 
      (r.containerType || '') === (candidate.containerType || '');

    const sameMode = r.transportMode === candidate.transportMode;
    const sameCurrency = r.costCurrency === candidate.costCurrency && r.sellingCurrency === candidate.sellingCurrency;

    if (sameRoute && sameCarrierOrSupplier && sameCharge && sameContainer && sameMode && sameCurrency) {
      // Check exact date duplicate
      if (r.effectiveFrom === candidate.effectiveFrom && r.effectiveTo === candidate.effectiveTo) {
        return {
          isDuplicate: true,
          duplicateRateCode: r.rateCode,
          hasOverlap: true,
          overlappingRateCode: r.rateCode,
        };
      }
      // Check interval overlap
      if (candidate.effectiveFrom && candidate.effectiveTo && r.effectiveFrom && r.effectiveTo) {
        if (doDateIntervalsOverlap(r.effectiveFrom, r.effectiveTo, candidate.effectiveFrom, candidate.effectiveTo)) {
          return {
            isDuplicate: false,
            hasOverlap: true,
            overlappingRateCode: r.rateCode,
          };
        }
      }
    }
  }

  return { isDuplicate: false, hasOverlap: false };
}

/**
 * Comprehensive compatibility and integrity validator for Rate Master Item
 */
export function validateRateIntegrity(
  rate: Partial<RateMasterItem>,
  existingRates: RateMasterItem[] = []
): RateValidationResult {
  const errors: { field: string; messageVi: string; messageEn: string }[] = [];
  const warnings: { field: string; messageVi: string; messageEn: string }[] = [];

  if (!rate.rateCode || rate.rateCode.trim() === '') {
    errors.push({
      field: 'rateCode',
      messageVi: 'Mã bảng giá (Rate Code) không được để trống.',
      messageEn: 'Rate Code cannot be empty.',
    });
  }

  if (!rate.rateName || rate.rateName.trim() === '') {
    errors.push({
      field: 'rateName',
      messageVi: 'Tên bảng giá không được để trống.',
      messageEn: 'Rate Name cannot be empty.',
    });
  }

  if (!rate.chargeCode || rate.chargeCode.trim() === '') {
    errors.push({
      field: 'chargeCode',
      messageVi: 'Mã khoản phí (Charge Code) không được để trống.',
      messageEn: 'Charge Code cannot be empty.',
    });
  }

  if (!rate.transportMode) {
    errors.push({
      field: 'transportMode',
      messageVi: 'Phương thức vận tải (Transport Mode) bắt buộc chọn.',
      messageEn: 'Transport Mode is required.',
    });
  }

  if (!rate.carrier && !rate.supplierName && !rate.supplierId) {
    warnings.push({
      field: 'carrier',
      messageVi: 'Khuyến nghị chọn Hãng tàu/Hàng không hoặc Nhà cung cấp để đảm bảo khả năng tra cứu.',
      messageEn: 'Carrier or Supplier is recommended for reliable rate lookup.',
    });
  }

  if (!rate.effectiveFrom) {
    errors.push({
      field: 'effectiveFrom',
      messageVi: 'Ngày bắt đầu hiệu lực (Effective From) bắt buộc nhập.',
      messageEn: 'Effective From date is required.',
    });
  }

  if (!rate.effectiveTo) {
    errors.push({
      field: 'effectiveTo',
      messageVi: 'Ngày hết hạn hiệu lực (Effective To) bắt buộc nhập.',
      messageEn: 'Effective To date is required.',
    });
  }

  if (rate.effectiveFrom && rate.effectiveTo) {
    const from = new Date(rate.effectiveFrom).getTime();
    const to = new Date(rate.effectiveTo).getTime();
    if (from > to) {
      errors.push({
        field: 'effectiveTo',
        messageVi: 'Ngày kết thúc hiệu lực phải sau hoặc bằng ngày bắt đầu.',
        messageEn: 'Effective To date must be on or after Effective From date.',
      });
    }
  }

  if (rate.costAmount === undefined || rate.costAmount === null || rate.costAmount < 0) {
    errors.push({
      field: 'costAmount',
      messageVi: 'Giá vốn (Cost Amount) phải là số không âm.',
      messageEn: 'Cost Amount must be a non-negative number.',
    });
  }

  if (rate.sellingAmount === undefined || rate.sellingAmount === null || rate.sellingAmount < 0) {
    errors.push({
      field: 'sellingAmount',
      messageVi: 'Giá bán (Selling Amount) phải là số không âm.',
      messageEn: 'Selling Amount must be a non-negative number.',
    });
  }

  if (
    rate.costAmount !== undefined && 
    rate.sellingAmount !== undefined && 
    rate.costCurrency === rate.sellingCurrency &&
    rate.sellingAmount < rate.costAmount
  ) {
    warnings.push({
      field: 'sellingAmount',
      messageVi: `CẢNH BÁO LỖ: Giá bán (${rate.sellingAmount} ${rate.sellingCurrency}) thấp hơn giá vốn (${rate.costAmount} ${rate.costCurrency}).`,
      messageEn: `NEGATIVE MARGIN WARNING: Selling price is lower than cost price.`,
    });
  }

  // Unit compatibility
  if (rate.basis && rate.transportMode) {
    if (!isUnitCompatible(rate.basis, rate.transportMode, rate.containerType)) {
      warnings.push({
        field: 'basis',
        messageVi: `Quy cách tính ${rate.basis} có thể không tương thích với phương thức ${rate.transportMode}.`,
        messageEn: `Basis ${rate.basis} may be incompatible with mode ${rate.transportMode}.`,
      });
    }
  }

  // Check duplicate & overlap
  const { isDuplicate, duplicateRateCode, hasOverlap, overlappingRateCode } = checkDuplicateAndOverlap(
    rate,
    existingRates
  );

  if (isDuplicate) {
    errors.push({
      field: 'rateCode',
      messageVi: `Trùng lặp hoàn toàn với bảng giá hiện có [${duplicateRateCode}].`,
      messageEn: `Exact duplicate of existing rate [${duplicateRateCode}].`,
    });
  } else if (hasOverlap) {
    warnings.push({
      field: 'effectiveFrom',
      messageVi: `Thời gian hiệu lực bị trùng đè (Overlap) với bảng giá [${overlappingRateCode}]. Hãy kiểm tra lại.`,
      messageEn: `Validity period overlaps with existing rate [${overlappingRateCode}].`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    isDuplicate,
    duplicateRateCode,
    hasOverlap,
    overlappingRateCode,
  };
}
