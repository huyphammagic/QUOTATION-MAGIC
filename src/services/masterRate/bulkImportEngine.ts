import { 
  RateMasterItem, 
  BulkImportJob, 
  ImportRowError, 
  DuplicatePolicy, 
  RateType, 
  MasterShipmentType 
} from '../../types/masterRate';
import { TransportMode, Currency } from '../../types/logistics';
import { ChargeBasis } from '../../types/pricing';
import { generateRateIdentityKey, detectRateOverlap } from './rateIdentityService';
import { createNewRateVersion } from './rateSnapshot';

export interface PreImportInspection {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  warningRows: number;
  previewItems: RateMasterItem[];
  errors: ImportRowError[];
  duplicates: { rowNumber: number; candidate: RateMasterItem; existingMatch: RateMasterItem }[];
}

/**
 * Normalizes header string to recognize multi-language columns
 */
function normalizeHeader(h: string): string {
  return (h || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Extracts raw tabular rows from an ArrayBuffer of an Excel or CSV file
 */
export async function parseFileToRawRows(file: File): Promise<Record<string, any>[]> {
  const XLSX = await import('xlsx');
  const isCsv = file.name.endsWith('.csv');
  const buffer = await file.arrayBuffer();

  if (isCsv) {
    const text = new TextDecoder('utf-8').decode(buffer);
    const workbook = XLSX.read(text, { type: 'string' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
  } else {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
  }
}

/**
 * Helper to safely extract value by matching flexible header names
 */
function getColumnValue(row: Record<string, any>, possibleNames: string[]): any {
  const normNames = possibleNames.map(normalizeHeader);
  for (const [key, val] of Object.entries(row)) {
    const normKey = normalizeHeader(key);
    if (normNames.includes(normKey)) {
      return val;
    }
  }
  return '';
}

/**
 * Pre-import Validation & Duplicate Detection Engine
 * Inspects all rows, detects schema defects, checks sanity (dates, prices) and maps candidate objects.
 */
export function inspectImportDataset(
  rawRows: Record<string, any>[],
  existingRates: RateMasterItem[],
  companyId?: string
): PreImportInspection {
  const errors: ImportRowError[] = [];
  const previewItems: RateMasterItem[] = [];
  const duplicates: { rowNumber: number; candidate: RateMasterItem; existingMatch: RateMasterItem }[] = [];

  let duplicateCount = 0;
  let invalidCount = 0;
  let validCount = 0;
  let warningCount = 0;

  const now = new Date().toISOString();

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // Excel row numbering (Header is row 1)
    const rowErrors: string[] = [];

    // Map fields
    const rateName = String(getColumnValue(row, ['RateName', 'Rate Name', 'Ten Cuoc', 'Tên cước', 'Description']) || '').trim();
    const rateCode = String(getColumnValue(row, ['RateCode', 'Rate Code', 'Ma Cuoc', 'Mã cước']) || '').trim() || 
                     `RATE-IMP-${Date.now()}-${idx}`;
    const carrier = String(getColumnValue(row, ['Carrier', 'Hang Tau', 'Hãng tàu', 'Airline', 'Trucker']) || '').trim();
    const origin = String(getColumnValue(row, ['Origin', 'POL', 'Diem Di', 'Điểm đi', 'Port of Loading']) || '').trim();
    const destination = String(getColumnValue(row, ['Destination', 'POD', 'Diem Den', 'Điểm đến', 'Port of Discharge']) || '').trim();
    const chargeCode = String(getColumnValue(row, ['ChargeCode', 'Charge Code', 'Ma Phi', 'Mã phí']) || 'OFR').trim().toUpperCase();
    const chargeName = String(getColumnValue(row, ['ChargeName', 'Charge Name', 'Ten Phi', 'Tên phí']) || rateName || chargeCode).trim();
    
    // Transport Mode
    const rawMode = String(getColumnValue(row, ['TransportMode', 'Mode', 'Phuong Thuc', 'Phương thức']) || 'SEA_FCL').trim().toUpperCase();
    let mode: TransportMode = 'SEA_FCL';
    if (rawMode.includes('LCL')) mode = 'SEA_LCL';
    else if (rawMode.includes('AIR')) mode = 'AIR_FREIGHT';
    else if (rawMode.includes('TRUCK')) mode = 'INLAND_TRUCKING';
    else if (rawMode.includes('CUSTOM')) mode = 'CUSTOMS_CLEARANCE';
    else if (rawMode.includes('MULTI')) mode = 'MULTIMODAL';

    // Shipment Type
    let shipmentType: MasterShipmentType = 'FCL';
    if (mode === 'SEA_LCL') shipmentType = 'LCL';
    else if (mode === 'AIR_FREIGHT') shipmentType = 'AIR';
    else if (mode === 'INLAND_TRUCKING') shipmentType = 'TRUCK';
    else if (mode === 'CUSTOMS_CLEARANCE') shipmentType = 'CUSTOMS';

    // Equipment / Container
    const equipment = String(getColumnValue(row, ['Equipment', 'ContainerType', 'Cont Type', 'Loai Cont', 'Loại Cont']) || '').trim();
    const unit = String(getColumnValue(row, ['Unit', 'Don Vi', 'Đơn vị']) || (mode === 'SEA_FCL' ? 'Cont' : 'Kgs')).trim();
    const basis = (String(getColumnValue(row, ['Basis', 'Charge Basis', 'Co So Tinh', 'Cơ sở tính']) || (mode === 'SEA_FCL' ? 'PER_CONTAINER' : 'PER_KG')).trim().toUpperCase() as ChargeBasis);

    // Amounts
    const costRaw = getColumnValue(row, ['CostAmount', 'Cost', 'Gia Von', 'Giá vốn', 'Buy Rate', 'Gia Mua']);
    const sellRaw = getColumnValue(row, ['SellingAmount', 'Sell', 'Gia Ban', 'Giá bán', 'Sell Rate']);
    const costAmount = parseFloat(String(costRaw).replace(/,/g, '')) || 0;
    const sellingAmount = parseFloat(String(sellRaw).replace(/,/g, '')) || 0;

    // Currency
    const rawCurrency = String(getColumnValue(row, ['Currency', 'Tien Te', 'Tiền tệ', 'CostCurrency']) || 'USD').trim().toUpperCase();
    const currency: Currency = rawCurrency === 'VND' ? 'VND' : 'USD';

    // Effective Dates
    let effectiveFrom = String(getColumnValue(row, ['EffectiveFrom', 'From Date', 'Tu Ngay', 'Từ ngày', 'Valid From']) || '').trim();
    let effectiveTo = String(getColumnValue(row, ['EffectiveTo', 'To Date', 'Den Ngay', 'Đến ngày', 'Valid To']) || '').trim();

    // Standardize date formats (convert DD/MM/YYYY to YYYY-MM-DD if needed)
    if (effectiveFrom.includes('/')) {
      const parts = effectiveFrom.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        effectiveFrom = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    if (effectiveTo.includes('/')) {
      const parts = effectiveTo.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        effectiveTo = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    // Validation Rules
    if (!rateName) rowErrors.push('Thiếu Tên bảng giá (Rate Name)');
    if (!origin) rowErrors.push('Thiếu Điểm đi/POL (Origin)');
    if (!destination) rowErrors.push('Thiếu Điểm đến/POD (Destination)');
    if (!effectiveFrom) rowErrors.push('Thiếu Ngày bắt đầu hiệu lực (Effective From)');
    if (!effectiveTo) rowErrors.push('Thiếu Ngày kết thúc hiệu lực (Effective To)');

    if (effectiveFrom && effectiveTo) {
      const tFrom = new Date(effectiveFrom).getTime();
      const tTo = new Date(effectiveTo).getTime();
      if (isNaN(tFrom)) rowErrors.push(`Định dạng ngày bắt đầu không hợp lệ (${effectiveFrom})`);
      if (isNaN(tTo)) rowErrors.push(`Định dạng ngày kết thúc không hợp lệ (${effectiveTo})`);
      if (!isNaN(tFrom) && !isNaN(tTo) && tTo < tFrom) {
        rowErrors.push(`Ngày hết hạn (${effectiveTo}) không thể trước ngày bắt đầu (${effectiveFrom})`);
      }
    }

    if (costAmount < 0) rowErrors.push('Giá vốn (Cost Amount) không thể là số âm');
    if (sellingAmount < 0) rowErrors.push('Giá bán (Selling Amount) không thể là số âm');

    if (rowErrors.length > 0) {
      invalidCount++;
      rowErrors.forEach(msg => {
        errors.push({
          rowNumber: rowNum,
          rateCode,
          field: 'General',
          messageVi: msg,
          messageEn: msg,
          rawData: row,
        });
      });
      return;
    }

    // Build Candidate
    const candidate: RateMasterItem = {
      id: `rate-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      companyId: companyId || 'DEFAULT',
      rateCode,
      rateName,
      rateType: 'SELL',
      chargeCode,
      chargeName,
      category: 'FREIGHT',
      chargeType: 'BASE_FREIGHT',
      transportMode: mode,
      shipmentType,
      carrier,
      origin,
      destination,
      containerType: (equipment as any) || undefined,
      basis,
      unit,
      costAmount,
      costCurrency: currency,
      sellingAmount,
      sellingCurrency: currency,
      vatRate: 0,
      effectiveFrom,
      effectiveTo,
      status: 'ACTIVE',
      priority: 50,
      version: 1,
      source: 'IMPORTED',
      sourceType: 'EXCEL_IMPORT',
      createdAt: now,
      updatedAt: now,
    };

    candidate.rateIdentityKey = generateRateIdentityKey(candidate);

    // Duplicate detection against existing rates
    const overlapResult = detectRateOverlap(candidate, existingRates);
    if (overlapResult.exactDuplicate) {
      duplicateCount++;
      duplicates.push({
        rowNumber: rowNum,
        candidate,
        existingMatch: overlapResult.exactDuplicate,
      });
    } else if (overlapResult.hasOverlap) {
      warningCount++;
    }

    validCount++;
    previewItems.push(candidate);
  });

  return {
    totalRows: rawRows.length,
    validRows: validCount,
    invalidRows: invalidCount,
    duplicateRows: duplicateCount,
    warningRows: warningCount,
    previewItems,
    errors,
    duplicates,
  };
}

/**
 * Executes Chunk/Streaming Bulk Import to avoid freezing browser memory and UI
 * Yields periodically to allow React rendering and user cancellation.
 */
export async function executeStreamingBulkImport(
  itemsToImport: RateMasterItem[],
  existingRates: RateMasterItem[],
  policy: DuplicatePolicy,
  onProgress: (processed: number, total: number, percentage: number) => void,
  shouldCancel: () => boolean,
  chunkSize: number = 100
): Promise<{
  successRates: RateMasterItem[];
  skippedCount: number;
  updatedCount: number;
  newVersionCount: number;
  cancelled: boolean;
}> {
  const successRates: RateMasterItem[] = [];
  let skipped = 0;
  let updated = 0;
  let newVersion = 0;

  const total = itemsToImport.length;
  let processed = 0;

  // Build identity map for fast lookup
  const existingMap = new Map<string, RateMasterItem>();
  for (const r of existingRates) {
    const k = r.rateIdentityKey || generateRateIdentityKey(r);
    existingMap.set(k, r);
  }

  for (let i = 0; i < total; i += chunkSize) {
    if (shouldCancel()) {
      return {
        successRates,
        skippedCount: skipped,
        updatedCount: updated,
        newVersionCount: newVersion,
        cancelled: true,
      };
    }

    const chunk = itemsToImport.slice(i, i + chunkSize);

    for (const candidate of chunk) {
      const key = candidate.rateIdentityKey || generateRateIdentityKey(candidate);
      const existing = existingMap.get(key);

      if (existing) {
        if (policy === 'SKIP') {
          skipped++;
          continue;
        } else if (policy === 'UPDATE') {
          const merged: RateMasterItem = {
            ...existing,
            ...candidate,
            id: existing.id,
            version: existing.version,
            updatedAt: new Date().toISOString(),
          };
          successRates.push(merged);
          existingMap.set(key, merged);
          updated++;
        } else if (policy === 'CREATE_NEW_VERSION') {
          const newVer = createNewRateVersion(existing, candidate, 'Bulk Import new version');
          successRates.push(newVer);
          existingMap.set(key, newVer);
          newVersion++;
        } else if (policy === 'REJECT') {
          // Reject skips adding duplicate
          skipped++;
          continue;
        }
      } else {
        successRates.push(candidate);
        existingMap.set(key, candidate);
      }
    }

    processed += chunk.length;
    const pct = Math.min(100, Math.round((processed / total) * 100));
    onProgress(processed, total, pct);

    // Yield control to main thread
    await new Promise(res => setTimeout(res, 16));
  }

  return {
    successRates,
    skippedCount: skipped,
    updatedCount: updated,
    newVersionCount: newVersion,
    cancelled: false,
  };
}

/**
 * Generates an Excel error report downloadable as an .xlsx blob
 */
export async function exportErrorsToExcel(errors: ImportRowError[]): Promise<Blob> {
  const XLSX = await import('xlsx');
  const errorData = errors.map(e => ({
    'Dòng (Row)': e.rowNumber,
    'Mã cước (Rate Code)': e.rateCode || '',
    'Trường dữ liệu': e.field || '',
    'Lý do lỗi (Tiếng Việt)': e.messageVi,
    'Error Reason (EN)': e.messageEn,
  }));

  const worksheet = XLSX.utils.json_to_sheet(errorData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Errors');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Generates a clean Excel Template for user rate imports
 */
export async function generateRateImportTemplate(): Promise<Blob> {
  const XLSX = await import('xlsx');
  const sampleData = [
    {
      'RateName': 'Cước Biển Cát Lái - Los Angeles Cont 40HC',
      'RateCode': 'RATE-MSC-SGN-LAX-40HC',
      'Carrier': 'MSC',
      'TransportMode': 'SEA_FCL',
      'Origin': 'Cat Lai, Ho Chi Minh (VNSGN)',
      'Destination': 'Los Angeles Port (USLAX)',
      'ChargeCode': 'OFR',
      'ChargeName': 'Ocean Freight',
      'Equipment': "40'HC",
      'Unit': 'Cont',
      'CostAmount': 1850,
      'SellingAmount': 2100,
      'Currency': 'USD',
      'EffectiveFrom': new Date().toISOString().slice(0, 10),
      'EffectiveTo': new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    },
    {
      'RateName': 'Cước Hàng Không Tân Sơn Nhất - Incheon Air (+300KG)',
      'RateCode': 'RATE-VN-SGN-ICN-AIR',
      'Carrier': 'Vietnam Airlines',
      'TransportMode': 'AIR_FREIGHT',
      'Origin': 'Tan Son Nhat (SGN)',
      'Destination': 'Incheon (ICN)',
      'ChargeCode': 'AFR',
      'ChargeName': 'Air Freight',
      'Equipment': '',
      'Unit': 'Kgs',
      'CostAmount': 2.4,
      'SellingAmount': 2.85,
      'Currency': 'USD',
      'EffectiveFrom': new Date().toISOString().slice(0, 10),
      'EffectiveTo': new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    },
    {
      'RateName': 'Vận Chuyển Nội Địa Cát Lái - KCN VSIP 1 Bình Dương Cont 40',
      'RateCode': 'RATE-TRK-CATLAI-VSIP1-40',
      'Carrier': 'Doi Xe Noi Dia',
      'TransportMode': 'INLAND_TRUCKING',
      'Origin': 'Cang Cat Lai, TP.HCM',
      'Destination': 'KCN VSIP 1, Thuan An, Binh Duong',
      'ChargeCode': 'TRUCKING',
      'ChargeName': 'Inland Trucking',
      'Equipment': "40'GP",
      'Unit': 'Chuyến',
      'CostAmount': 3200000,
      'SellingAmount': 3800000,
      'Currency': 'VND',
      'EffectiveFrom': new Date().toISOString().slice(0, 10),
      'EffectiveTo': new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'MasterRatesTemplate');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
