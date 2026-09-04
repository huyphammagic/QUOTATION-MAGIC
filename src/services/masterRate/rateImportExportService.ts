import { RateMasterItem, BulkImportSummary, BulkImportRateRow, RateType, MasterShipmentType } from '../../types/masterRate';
import { TransportMode, Currency, FeeCategory } from '../../types/logistics';
import { ChargeBasis } from '../../types/pricing';
import { validateRateIntegrity } from './rateCompatibilityService';

/**
 * Parses raw CSV string into array of object rows
 */
export function parseCsvText(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Match CSV fields supporting quoted commas
    const values: string[] = [];
    let inQuote = false;
    let current = '';

    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        values.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ''));

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(rowObj);
  }

  return rows;
}

/**
 * Validates and converts parsed CSV rows into typed RateMasterItems
 */
export function validateAndParseRateCsv(
  csvRows: Record<string, string>[],
  existingRates: RateMasterItem[] = []
): BulkImportSummary {
  const rowDetails: BulkImportRateRow[] = [];
  const itemsToImport: RateMasterItem[] = [];

  csvRows.forEach((row, idx) => {
    const rowNum = idx + 2; // header is row 1
    const errors: string[] = [];
    const warnings: string[] = [];

    const rateCode = (row['RateCode'] || row['rateCode'] || row['Mã cước'] || `RATE-IMP-${Date.now()}-${idx}`).trim();
    const rateName = (row['RateName'] || row['rateName'] || row['Tên cước'] || '').trim();
    const rateType: RateType = (row['RateType'] || row['rateType'] || 'SELL').toUpperCase() as RateType;
    const carrier = (row['Carrier'] || row['carrier'] || row['Hãng tàu/HK'] || '').trim();
    const origin = (row['Origin'] || row['origin'] || row['Điểm đi/POL'] || '').trim();
    const destination = (row['Destination'] || row['destination'] || row['Điểm đến/POD'] || '').trim();
    const chargeCode = (row['ChargeCode'] || row['chargeCode'] || row['Mã phí'] || 'OFR').trim();
    const chargeName = (row['ChargeName'] || row['chargeName'] || row['Tên phí'] || rateName || chargeCode).trim();
    const mode = (row['TransportMode'] || row['transportMode'] || 'SEA_FCL').toUpperCase() as TransportMode;
    const shipmentType = (row['ShipmentType'] || row['shipmentType'] || 'FCL').toUpperCase() as MasterShipmentType;
    const containerType = row['ContainerType'] || row['containerType'] || undefined;
    const basis = (row['Basis'] || row['basis'] || 'PER_CONTAINER').toUpperCase() as ChargeBasis;
    const unit = row['Unit'] || row['unit'] || 'Cont';

    const costAmount = parseFloat(row['CostAmount'] || row['costAmount'] || row['Giá vốn'] || '0');
    const costCurrency = ((row['CostCurrency'] || row['costCurrency'] || 'USD').toUpperCase() as Currency);
    const sellingAmount = parseFloat(row['SellingAmount'] || row['sellingAmount'] || row['Giá bán'] || '0');
    const sellingCurrency = ((row['SellingCurrency'] || row['sellingCurrency'] || 'USD').toUpperCase() as Currency);
    const vatRate = parseFloat(row['VatRate'] || row['vatRate'] || '0');

    const effectiveFrom = (row['EffectiveFrom'] || row['effectiveFrom'] || row['Từ ngày'] || '').trim();
    const effectiveTo = (row['EffectiveTo'] || row['effectiveTo'] || row['Đến ngày'] || '').trim();

    if (!rateName) errors.push('Thiếu Tên cước (Rate Name)');
    if (!origin) errors.push('Thiếu Điểm đi/POL (Origin)');
    if (!destination) errors.push('Thiếu Điểm đến/POD (Destination)');
    if (!effectiveFrom) errors.push('Thiếu Ngày bắt đầu hiệu lực (Effective From)');
    if (!effectiveTo) errors.push('Thiếu Ngày hết hạn (Effective To)');
    if (isNaN(costAmount) || costAmount < 0) errors.push('Giá vốn không hợp lệ');
    if (isNaN(sellingAmount) || sellingAmount < 0) errors.push('Giá bán không hợp lệ');

    const candidate: RateMasterItem = {
      id: `rate-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      rateCode,
      rateName,
      rateType: ['BUY', 'SELL', 'REFERENCE', 'CONTRACT'].includes(rateType) ? rateType : 'SELL',
      chargeCode,
      chargeName,
      category: 'FREIGHT',
      chargeType: 'BASE_FREIGHT',
      transportMode: mode,
      shipmentType,
      carrier,
      origin,
      destination,
      containerType: containerType as any,
      basis,
      unit,
      costAmount: isNaN(costAmount) ? 0 : costAmount,
      costCurrency: costCurrency === 'VND' ? 'VND' : 'USD',
      sellingAmount: isNaN(sellingAmount) ? 0 : sellingAmount,
      sellingCurrency: sellingCurrency === 'VND' ? 'VND' : 'USD',
      vatRate: isNaN(vatRate) ? 0 : vatRate,
      effectiveFrom,
      effectiveTo,
      status: 'DRAFT',
      priority: 50,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const integrity = validateRateIntegrity(candidate, [...existingRates, ...itemsToImport]);
    if (!integrity.isValid) {
      integrity.errors.forEach(e => errors.push(e.messageVi));
    }
    integrity.warnings.forEach(w => warnings.push(w.messageVi));

    const isValid = errors.length === 0;

    rowDetails.push({
      rowNumber: rowNum,
      rawData: row,
      parsedRate: candidate,
      isValid,
      errors,
      warnings,
    });

    if (isValid) {
      itemsToImport.push(candidate);
    }
  });

  return {
    totalRows: csvRows.length,
    validRows: itemsToImport.length,
    invalidRows: csvRows.length - itemsToImport.length,
    itemsToImport,
    rowDetails,
  };
}

/**
 * Generates UTF-8 with BOM CSV string for export
 */
export function exportRatesToCsv(rates: RateMasterItem[]): string {
  const headers = [
    'RateCode',
    'RateName',
    'RateType',
    'TransportMode',
    'Carrier',
    'Supplier',
    'Origin',
    'Destination',
    'ChargeCode',
    'ChargeName',
    'ContainerType',
    'Basis',
    'Unit',
    'CostAmount',
    'CostCurrency',
    'SellingAmount',
    'SellingCurrency',
    'VatRate',
    'EffectiveFrom',
    'EffectiveTo',
    'Status',
    'Version',
    'TransitTime',
    'FreeTime',
    'Notes'
  ];

  const rows = rates.map(r => [
    `"${r.rateCode || ''}"`,
    `"${(r.rateName || '').replace(/"/g, '""')}"`,
    `"${r.rateType || 'SELL'}"`,
    `"${r.transportMode || ''}"`,
    `"${(r.carrier || '').replace(/"/g, '""')}"`,
    `"${(r.supplierName || '').replace(/"/g, '""')}"`,
    `"${(r.origin || '').replace(/"/g, '""')}"`,
    `"${(r.destination || '').replace(/"/g, '""')}"`,
    `"${r.chargeCode || ''}"`,
    `"${(r.chargeName || '').replace(/"/g, '""')}"`,
    `"${r.containerType || ''}"`,
    `"${r.basis || ''}"`,
    `"${r.unit || ''}"`,
    r.costAmount ?? 0,
    `"${r.costCurrency || 'USD'}"`,
    r.sellingAmount ?? 0,
    `"${r.sellingCurrency || 'USD'}"`,
    r.vatRate ?? 0,
    `"${r.effectiveFrom || ''}"`,
    `"${r.effectiveTo || ''}"`,
    `"${r.status || 'DRAFT'}"`,
    r.version || 1,
    `"${(r.transitTime || '').replace(/"/g, '""')}"`,
    `"${(r.freeTime || '').replace(/"/g, '""')}"`,
    `"${(r.notes || '').replace(/"/g, '""')}"`,
  ].join(','));

  // Prepend UTF-8 BOM \uFEFF for proper Vietnamese rendering in Microsoft Excel
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

/**
 * Returns a ready-to-use CSV template for user bulk import
 */
export function getSampleCsvTemplate(): string {
  const headers = [
    'RateCode',
    'RateName',
    'RateType',
    'TransportMode',
    'Carrier',
    'Origin',
    'Destination',
    'ChargeCode',
    'ChargeName',
    'ContainerType',
    'Basis',
    'Unit',
    'CostAmount',
    'CostCurrency',
    'SellingAmount',
    'SellingCurrency',
    'VatRate',
    'EffectiveFrom',
    'EffectiveTo'
  ].join(',');

  const sampleRow1 = [
    'RATE-MSK-CATLAI-LAX-40HC',
    'Cước Biển Tuyến Cát Lái đi Los Angeles (40HC)',
    'SELL',
    'SEA_FCL',
    'Maersk Line',
    'Ho Chi Minh (Cat Lai)',
    'Los Angeles (USLAX)',
    'OFR',
    'Ocean Freight',
    "40'HC",
    'PER_CONTAINER',
    "Cont 40'HC",
    '1850',
    'USD',
    '2150',
    'USD',
    '0',
    '2026-09-01',
    '2026-10-31'
  ].join(',');

  const sampleRow2 = [
    'RATE-VN-SGN-FRA-AIR',
    'Cước Hàng Không Tân Sơn Nhất đi Frankfurt',
    'SELL',
    'AIR_FREIGHT',
    'Vietnam Airlines',
    'Ho Chi Minh (SGN)',
    'Frankfurt (FRA)',
    'AFR',
    'Air Freight',
    '',
    'PER_CHARGEABLE_KG',
    'KG',
    '3.2',
    'USD',
    '4.1',
    'USD',
    '0',
    '2026-09-01',
    '2026-10-31'
  ].join(',');

  return '\uFEFF' + [headers, sampleRow1, sampleRow2].join('\r\n');
}
