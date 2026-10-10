import { 
  HsCodeTariffItem, 
  CustomsTaxCalculationRequest, 
  CustomsTaxCalculationResult 
} from '../../types/customsTariff';
import { COMMON_HS_CODE_DATABASE } from '../../data/commonHsTariffs';
import { LineItem } from '../../types/logistics';

export interface HsCodeLookupResponse {
  query: string;
  items: HsCodeTariffItem[];
  rulingAdvice: string;
  detectedCategory: string;
}

export async function lookupHsCodeWithAi(
  commodityQuery: string,
  originCountry?: string
): Promise<HsCodeLookupResponse> {
  const trimmed = (commodityQuery || '').trim();
  if (!trimmed) {
    return {
      query: '',
      items: COMMON_HS_CODE_DATABASE.slice(0, 4),
      rulingAdvice: 'Vui lòng nhập tên hàng hóa hoặc công dụng để AI tra cứu mã HS.',
      detectedCategory: 'Tất cả danh mục',
    };
  }

  try {
    const res = await fetch('/api/gemini/hs-code-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commodityQuery: trimmed,
        originCountry: originCountry || 'China / Korea / EU / USA',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items) && data.items.length > 0) {
        return {
          query: trimmed,
          items: data.items,
          rulingAdvice: data.rulingAdvice || 'Đã đối chiếu theo 6 quy tắc tổng quát (GIR) và Biểu thuế XNK Việt Nam hiện hành.',
          detectedCategory: data.detectedCategory || 'Tổng hợp',
        };
      }
    }
  } catch (err) {
    console.warn('AI HS Lookup server error, falling back to local database match:', err);
  }

  // Graceful local search fallback
  const queryLower = trimmed.toLowerCase();
  const matched = COMMON_HS_CODE_DATABASE.filter(item => {
    return (
      item.hsCode.includes(queryLower) ||
      item.descriptionVi.toLowerCase().includes(queryLower) ||
      item.descriptionEn.toLowerCase().includes(queryLower)
    );
  });

  const results = matched.length > 0 ? matched : COMMON_HS_CODE_DATABASE.slice(0, 3);

  return {
    query: trimmed,
    items: results,
    rulingAdvice: 'Hiển thị kết quả tra cứu từ cơ sở dữ liệu biểu thuế xuất nhập khẩu đã được chuẩn hóa.',
    detectedCategory: 'Danh mục phù hợp',
  };
}

/**
 * Calculate import duties, VAT, special excise taxes, and environmental taxes
 * according to Vietnam Customs Valuation and Tariff Law.
 */
export function calculateCustomsTaxes(
  params: CustomsTaxCalculationRequest
): CustomsTaxCalculationResult {
  const { cifValueUsd, exchangeRate, quantity, appliedAgreementCode, hsItem } = params;
  const exRate = exchangeRate > 0 ? exchangeRate : 25400;
  const cifValueVnd = Math.round(cifValueUsd * exRate);

  // Determine applied import duty rate
  let appliedDutyRate = hsItem.importPreferentialTariff; // MFN default
  let appliedDutyName = 'Thuế NK Ưu Đãi (MFN)';
  let coFormRequired: string | undefined = undefined;

  if (appliedAgreementCode && appliedAgreementCode !== 'MFN') {
    const fta = hsItem.ftaTariffs.find(f => f.agreementCode === appliedAgreementCode);
    if (fta) {
      appliedDutyRate = fta.rate;
      appliedDutyName = `${fta.agreementName} (${fta.rate}%)`;
      coFormRequired = fta.coForm;
    }
  }

  // 1. Thuế Nhập Khẩu = Giá CIF x Thuế suất NK
  const importDutyVnd = Math.round(cifValueVnd * (appliedDutyRate / 100));
  const importDutyUsd = importDutyVnd / exRate;

  // 2. Thuế Tiêu Thụ Đặc Biệt (TTĐB) = (Giá CIF + Thuế NK) x Thuế suất TTĐB
  const specialRate = hsItem.specialConsumptionTariff || 0;
  const specialConsumptionTaxVnd = Math.round((cifValueVnd + importDutyVnd) * (specialRate / 100));
  const specialConsumptionTaxUsd = specialConsumptionTaxVnd / exRate;

  // 3. Thuế Bảo Vệ Môi Trường (BVMT) = Số lượng x Mức thuế tuyệt đối
  const envRatePerUnit = hsItem.environmentalTaxVnd || 0;
  const environmentalTaxVnd = Math.round(envRatePerUnit * (quantity || 1));
  const environmentalTaxUsd = environmentalTaxVnd / exRate;

  // 4. Thuế GTGT (VAT) = (Giá CIF + Thuế NK + Thuế TTĐB + Thuế BVMT) x Thuế suất VAT
  const vatRate = hsItem.vatTariff || 8;
  const taxableVatBaseVnd = cifValueVnd + importDutyVnd + specialConsumptionTaxVnd + environmentalTaxVnd;
  const vatTaxVnd = Math.round(taxableVatBaseVnd * (vatRate / 100));
  const vatTaxUsd = vatTaxVnd / exRate;

  // Tổng thuế phải nộp
  const totalCustomsTaxVnd = importDutyVnd + specialConsumptionTaxVnd + environmentalTaxVnd + vatTaxVnd;
  const totalCustomsTaxUsd = totalCustomsTaxVnd / exRate;
  const effectiveTaxRatePercent = cifValueVnd > 0 ? (totalCustomsTaxVnd / cifValueVnd) * 100 : 0;

  // Generate suggested quotation line items
  const suggestedLineItems: LineItem[] = [];

  // Line item 1: Thuế Nhập Khẩu (nếu > 0)
  if (importDutyVnd > 0) {
    suggestedLineItems.push({
      id: `duty_nk_${Date.now()}_1`,
      code: 'IMPORT_DUTY',
      description: `Thuế Nhập Khẩu hàng ${hsItem.hsCode} (${appliedDutyRate}% ${coFormRequired ? `kèm ${coFormRequired}` : ''})`,
      category: 'CUSTOMS',
      location: 'POD',
      unit: 'Lô hàng',
      quantity: 1,
      unitPrice: importDutyVnd,
      currency: 'VND',
      vatRate: 0,
      amountVnd: importDutyVnd,
      amountUsd: importDutyUsd,
      note: `Căn cứ theo mã HS ${hsItem.hsCode} - Trị giá CIF: ${cifValueUsd.toLocaleString()} USD`,
    });
  }

  // Line item 2: Thuế VAT Nhập Khẩu
  if (vatTaxVnd > 0) {
    suggestedLineItems.push({
      id: `duty_vat_${Date.now()}_2`,
      code: 'IMPORT_VAT',
      description: `Thuế GTGT (VAT) Hàng Nhập Khẩu (${vatRate}%)`,
      category: 'CUSTOMS',
      location: 'POD',
      unit: 'Lô hàng',
      quantity: 1,
      unitPrice: vatTaxVnd,
      currency: 'VND',
      vatRate: 0,
      amountVnd: vatTaxVnd,
      amountUsd: vatTaxUsd,
      note: 'Thuế VAT nộp vào ngân sách nhà nước theo giấy nộp tiền hải quan',
    });
  }

  // Line item 3: Phí Kiểm Tra Chuyên Ngành (nếu có)
  if (hsItem.specializedInspection?.isRequired) {
    const inspCost = hsItem.specializedInspection.estimatedCostVnd || 2500000;
    suggestedLineItems.push({
      id: `duty_insp_${Date.now()}_3`,
      code: 'SPECIAL_INSP',
      description: `Phí ${hsItem.specializedInspection.inspectionType || 'Kiểm tra chuyên ngành'} (${hsItem.specializedInspection.agency || 'Cơ quan chỉ định'})`,
      category: 'CUSTOMS',
      location: 'POD',
      unit: 'Bộ hồ sơ',
      quantity: 1,
      unitPrice: inspCost,
      currency: 'VND',
      vatRate: 8,
      amountVnd: inspCost,
      amountUsd: inspCost / exRate,
      note: `Thời gian dự kiến: ${hsItem.specializedInspection.estimatedDays || 3} ngày làm việc`,
    });
  }

  return {
    cifValueVnd,
    cifValueUsd,
    appliedDutyRate,
    appliedDutyName,
    coFormRequired,
    importDutyVnd,
    importDutyUsd,
    specialConsumptionTaxVnd,
    specialConsumptionTaxUsd,
    environmentalTaxVnd,
    environmentalTaxUsd,
    vatTaxVnd,
    vatTaxUsd,
    totalCustomsTaxVnd,
    totalCustomsTaxUsd,
    effectiveTaxRatePercent,
    suggestedLineItems,
  };
}
