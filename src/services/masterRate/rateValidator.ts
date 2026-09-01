import { RateMasterItem, ChargeMasterItem, RateValidationResult, BulkImportRateRow, BulkImportSummary } from '../../types/masterRate';
import { ChargeBasis } from '../../types/pricing';
import { TransportMode, Currency, FeeCategory } from '../../types/logistics';

export function validateRateMaster(rate: Partial<RateMasterItem>, existingRates: RateMasterItem[] = []): RateValidationResult {
  const errors: { field: string; messageVi: string; messageEn: string }[] = [];
  const warnings: { field: string; messageVi: string; messageEn: string }[] = [];

  // 1. Charge Code / Name
  if (!rate.chargeCode || rate.chargeCode.trim() === '') {
    errors.push({
      field: 'chargeCode',
      messageVi: 'Mã phụ phí (Charge Code) là bắt buộc.',
      messageEn: 'Charge code is required.',
    });
  }

  // 2. Transport Mode
  if (!rate.transportMode) {
    errors.push({
      field: 'transportMode',
      messageVi: 'Phương thức vận tải (Transport Mode) là bắt buộc.',
      messageEn: 'Transport mode is required.',
    });
  }

  // 3. Basis
  if (!rate.basis) {
    errors.push({
      field: 'basis',
      messageVi: 'Cách tính cước (Basis) là bắt buộc.',
      messageEn: 'Charge basis is required.',
    });
  }

  // 4. Financial amounts
  if (rate.costAmount === undefined || rate.costAmount === null || isNaN(Number(rate.costAmount)) || Number(rate.costAmount) < 0) {
    errors.push({
      field: 'costAmount',
      messageVi: 'Giá vốn (Cost Amount) phải là số không âm.',
      messageEn: 'Cost amount must be a non-negative number.',
    });
  }

  if (rate.sellingAmount === undefined || rate.sellingAmount === null || isNaN(Number(rate.sellingAmount)) || Number(rate.sellingAmount) < 0) {
    errors.push({
      field: 'sellingAmount',
      messageVi: 'Giá bán (Selling Amount) phải là số không âm.',
      messageEn: 'Selling amount must be a non-negative number.',
    });
  }

  // Margin Check Warning
  if (Number(rate.sellingAmount) > 0 && Number(rate.costAmount) > Number(rate.sellingAmount)) {
    warnings.push({
      field: 'margin',
      messageVi: 'Cảnh báo: Giá vốn đang cao hơn giá bán (Lợi nhuận âm).',
      messageEn: 'Warning: Cost is higher than selling price (Negative profit).',
    });
  }

  // 5. Effective Dates Validation
  if (!rate.effectiveFrom) {
    errors.push({
      field: 'effectiveFrom',
      messageVi: 'Ngày bắt đầu hiệu lực (Effective From) là bắt buộc.',
      messageEn: 'Effective from date is required.',
    });
  }

  if (!rate.effectiveTo) {
    errors.push({
      field: 'effectiveTo',
      messageVi: 'Ngày kết thúc hiệu lực (Effective To) là bắt buộc.',
      messageEn: 'Effective to date is required.',
    });
  }

  if (rate.effectiveFrom && rate.effectiveTo) {
    const fromTime = new Date(rate.effectiveFrom).getTime();
    const toTime = new Date(rate.effectiveTo).getTime();
    if (isNaN(fromTime) || isNaN(toTime)) {
      errors.push({
        field: 'effectiveDates',
        messageVi: 'Định dạng ngày hiệu lực không hợp lệ.',
        messageEn: 'Invalid effective date format.',
      });
    } else if (toTime < fromTime) {
      errors.push({
        field: 'effectiveTo',
        messageVi: 'Ngày kết thúc hiệu lực không được nhỏ hơn ngày bắt đầu.',
        messageEn: 'Effective To cannot be earlier than Effective From.',
      });
    }
  }

  // 6. Mode-specific Dynamic Validations
  if (rate.transportMode === 'SEA_FCL') {
    if (!rate.containerType) {
      errors.push({
        field: 'containerType',
        messageVi: 'Vận chuyển FCL bắt buộc phải chỉ định Loại Container (20GP, 40HC, v.v.).',
        messageEn: 'FCL shipment requires container type specification.',
      });
    }
  }

  // 7. Duplicate Active Rate Detection
  if (rate.status === 'ACTIVE' && rate.chargeCode && rate.transportMode) {
    const isDuplicate = existingRates.some((existing) => {
      if (existing.id === rate.id) return false;
      if (existing.status !== 'ACTIVE') return false;
      
      const sameCharge = existing.chargeCode.toUpperCase() === rate.chargeCode?.toUpperCase();
      const sameMode = existing.transportMode === rate.transportMode;
      const sameCarrier = (existing.carrier || '').trim().toLowerCase() === (rate.carrier || '').trim().toLowerCase();
      const sameOrigin = (existing.origin || '').trim().toLowerCase() === (rate.origin || '').trim().toLowerCase();
      const sameDest = (existing.destination || '').trim().toLowerCase() === (rate.destination || '').trim().toLowerCase();
      const sameContainer = (existing.containerType || '') === (rate.containerType || '');
      const sameBasis = existing.basis === rate.basis;

      // Check date overlap
      const existFrom = new Date(existing.effectiveFrom).getTime();
      const existTo = new Date(existing.effectiveTo).getTime();
      const newFrom = new Date(rate.effectiveFrom || '').getTime();
      const newTo = new Date(rate.effectiveTo || '').getTime();

      const datesOverlap = (newFrom <= existTo) && (newTo >= existFrom);

      return sameCharge && sameMode && sameCarrier && sameOrigin && sameDest && sameContainer && sameBasis && datesOverlap;
    });

    if (isDuplicate) {
      warnings.push({
        field: 'duplicate',
        messageVi: 'Cảnh báo: Đã có bảng giá Active cùng Hãng tàu, Tuyến đường, Loại cont và khoảng thời gian hiệu lực này.',
        messageEn: 'Warning: An active rate already exists for this carrier, route, container type, and overlapping validity period.',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateChargeMaster(charge: Partial<ChargeMasterItem>): RateValidationResult {
  const errors: { field: string; messageVi: string; messageEn: string }[] = [];
  const warnings: { field: string; messageVi: string; messageEn: string }[] = [];

  if (!charge.chargeCode || charge.chargeCode.trim() === '') {
    errors.push({
      field: 'chargeCode',
      messageVi: 'Mã phí (Charge Code) là bắt buộc.',
      messageEn: 'Charge code is required.',
    });
  }

  if (!charge.chargeName || charge.chargeName.trim() === '') {
    errors.push({
      field: 'chargeName',
      messageVi: 'Tên phí (Charge Name) là bắt buộc.',
      messageEn: 'Charge name is required.',
    });
  }

  if (!charge.category) {
    errors.push({
      field: 'category',
      messageVi: 'Phân nhóm phí (Category) là bắt buộc.',
      messageEn: 'Category is required.',
    });
  }

  if (!charge.defaultBasis) {
    errors.push({
      field: 'defaultBasis',
      messageVi: 'Đơn vị tính mặc định (Basis) là bắt buộc.',
      messageEn: 'Default basis is required.',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function parseAndValidateBulkRateImport(
  rawRows: Record<string, any>[],
  existingRates: RateMasterItem[] = []
): BulkImportSummary {
  const rowDetails: BulkImportRateRow[] = [];
  const itemsToImport: RateMasterItem[] = [];

  rawRows.forEach((row, idx) => {
    const rowErrors: string[] = [];
    const nowStr = new Date().toISOString().slice(0, 10);

    const chargeCode = String(row.chargeCode || row.Code || row['Mã Phí'] || '').trim().toUpperCase();
    const chargeName = String(row.chargeName || row.Name || row['Tên Phí'] || chargeCode).trim();
    const transportMode = (row.transportMode || row.Mode || row['Phương Thức'] || 'SEA_FCL') as TransportMode;
    const carrier = String(row.carrier || row.Carrier || row['Hãng Vận Chuyển'] || '').trim();
    const origin = String(row.origin || row.POL || row['Cảng Đi'] || '').trim();
    const destination = String(row.destination || row.POD || row['Cảng Đến'] || '').trim();
    const containerType = row.containerType || row.Container || row['Loại Cont'];
    const basis = (row.basis || row.Basis || row['Cách Tính'] || 'PER_CONTAINER') as ChargeBasis;
    const unit = String(row.unit || row.Unit || row['Đơn Vị'] || 'Container').trim();
    
    const costAmount = Number(row.costAmount || row.Cost || row['Giá Vốn'] || 0);
    const sellingAmount = Number(row.sellingAmount || row.Sell || row['Giá Bán'] || 0);
    const costCurrency = (row.costCurrency || row['Loại Tiền Vốn'] || 'USD').toUpperCase() as Currency;
    const sellingCurrency = (row.sellingCurrency || row['Loại Tiền Bán'] || 'USD').toUpperCase() as Currency;
    const vatRate = Number(row.vatRate || row.VAT || 0);

    const effectiveFrom = String(row.effectiveFrom || row['Hiệu Lực Từ'] || nowStr).trim();
    const effectiveTo = String(row.effectiveTo || row['Hiệu Lực Đến'] || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)).trim();
    const status = (row.status || 'ACTIVE') as any;

    if (!chargeCode) rowErrors.push('Thiếu mã phí (chargeCode)');
    if (isNaN(costAmount) || costAmount < 0) rowErrors.push('Giá vốn không hợp lệ');
    if (isNaN(sellingAmount) || sellingAmount < 0) rowErrors.push('Giá bán không hợp lệ');
    if (new Date(effectiveTo).getTime() < new Date(effectiveFrom).getTime()) {
      rowErrors.push('Hiệu lực đến nhỏ hơn hiệu lực từ');
    }

    const rateItem: RateMasterItem = {
      id: `rate-import-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      rateCode: String(row.rateCode || `RATE-${chargeCode}-${Date.now().toString().slice(-4)}-${idx + 1}`),
      rateName: String(row.rateName || `${chargeName} [${origin} -> ${destination}]`),
      chargeCode,
      chargeName,
      category: (row.category || 'FREIGHT') as FeeCategory,
      chargeType: String(row.chargeType || 'BASE_FREIGHT'),
      transportMode,
      shipmentType: transportMode === 'SEA_FCL' ? 'FCL' : transportMode === 'SEA_LCL' ? 'LCL' : transportMode === 'AIR_FREIGHT' ? 'AIR' : 'OTHER',
      carrier,
      origin,
      destination,
      containerType,
      basis,
      unit,
      costAmount,
      costCurrency,
      sellingAmount,
      sellingCurrency,
      vatRate,
      minimumCharge: Number(row.minimumCharge || row['Tối Thiểu'] || 0) || undefined,
      effectiveFrom,
      effectiveTo,
      status: status === 'ACTIVE' ? 'ACTIVE' : 'DRAFT',
      priority: Number(row.priority) || 10,
      version: 1,
      notes: String(row.notes || row['Ghi Chú'] || ''),
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    if (rowErrors.length === 0) {
      itemsToImport.push(rateItem);
      rowDetails.push({
        rowNumber: idx + 1,
        rawData: row,
        parsedRate: rateItem,
        isValid: true,
        errors: [],
      });
    } else {
      rowDetails.push({
        rowNumber: idx + 1,
        rawData: row,
        parsedRate: rateItem,
        isValid: false,
        errors: rowErrors,
      });
    }
  });

  return {
    totalRows: rawRows.length,
    validRows: itemsToImport.length,
    invalidRows: rawRows.length - itemsToImport.length,
    itemsToImport,
    rowDetails,
  };
}
