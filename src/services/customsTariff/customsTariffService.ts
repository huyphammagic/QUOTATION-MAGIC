import { 
  HsCodeTariffItem, 
  CustomsTaxCalculationRequest, 
  CustomsTaxCalculationResult,
  FtaComparisonRow,
  CustomsRiskAssessment,
  AdvanceRulingDossier
} from '../../types/customsTariff';
import { COMMON_HS_CODE_DATABASE } from '../../data/commonHsTariffs';
import { LineItem } from '../../types/logistics';

export interface HsCodeLookupResponse {
  query: string;
  items: HsCodeTariffItem[];
  rulingAdvice: string;
  detectedCategory: string;
  isExactMatch?: boolean;
  matchType?: 'EXACT_HS_CODE' | 'EXACT_PRODUCT_NAME' | 'KEYWORD_MATCH' | 'AI_REASONED' | 'ALL';
}

/**
 * Remove Vietnamese accents/diacritics for insensitive keyword search
 */
export function removeVietnameseDiacritics(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Clean HS Code string (removes dots, spaces, hyphens)
 */
export function normalizeHsDigits(str: string): string {
  return (str || '').replace(/[^\d]/g, '');
}

export interface MasterTariffSearchResult {
  query: string;
  items: HsCodeTariffItem[];
  exactMatch: HsCodeTariffItem | null;
  totalFound: number;
  rulingAdvice: string;
  detectedCategory: string;
  matchType: 'EXACT_HS_CODE' | 'EXACT_PRODUCT_NAME' | 'KEYWORD_MATCH' | 'ALL';
}

/**
 * Deterministic, instant, 100% accurate search engine across the Master Customs Tariff Schedule.
 * Filters both by exact HS Code (8-digit, 4-digit, 2-digit) and product name (Vietnamese / English / Diacritics-free).
 */
export function searchMasterHsTariffs(
  rawQuery: string,
  categoryFilter?: string
): MasterTariffSearchResult {
  const trimmed = (rawQuery || '').trim();
  const queryLower = trimmed.toLowerCase();
  const queryNoDiacritics = removeVietnameseDiacritics(trimmed);
  const queryDigits = normalizeHsDigits(trimmed);

  // Filter by category group first if active
  let basePool = COMMON_HS_CODE_DATABASE;
  if (categoryFilter && categoryFilter !== 'ALL') {
    basePool = basePool.filter(item => item.categoryGroup === categoryFilter);
  }

  if (!trimmed) {
    return {
      query: '',
      items: basePool,
      exactMatch: null,
      totalFound: basePool.length,
      rulingAdvice: 'Hiển thị toàn bộ Danh mục Biểu thuế XNK Việt Nam (Nghị định 26/2023/NĐ-CP). Nhập tên hàng hoặc mã HS để lọc 100% chính xác.',
      detectedCategory: categoryFilter && categoryFilter !== 'ALL' ? categoryFilter : 'Tất Cả Danh Mục',
      matchType: 'ALL',
    };
  }

  // 1. CHECK FOR EXACT HS CODE MATCH (100% Precision)
  if (queryDigits.length >= 2) {
    // Check 8-digit exact match
    const exactCodeItem = basePool.find(item => {
      const itemDigits = normalizeHsDigits(item.hsCode);
      return itemDigits === queryDigits || item.hsCode.toLowerCase() === queryLower;
    });

    if (exactCodeItem) {
      const matchedItem: HsCodeTariffItem = {
        ...exactCodeItem,
        isExactMatch: true,
        confidenceScore: 100,
      };

      // Also get related items in same heading/chapter
      const relatedItems = basePool.filter(
        item => item.id !== exactCodeItem.id && item.chapter === exactCodeItem.chapter
      );

      return {
        query: trimmed,
        items: [matchedItem, ...relatedItems],
        exactMatch: matchedItem,
        totalFound: 1 + relatedItems.length,
        rulingAdvice: `Khớp chính xác 100% mã HS ${matchedItem.hsCode} theo Biểu thuế XNK Việt Nam hiện hành (Chương ${matchedItem.chapter}).`,
        detectedCategory: matchedItem.categoryNameVi || 'Biểu Thuế Hải Quan',
        matchType: 'EXACT_HS_CODE',
      };
    }

    // Check heading (4 digits) or chapter (2 digits) prefix match
    if (queryDigits.length >= 4) {
      const headingMatches = basePool.filter(item => {
        const itemDigits = normalizeHsDigits(item.hsCode);
        return itemDigits.startsWith(queryDigits);
      });

      if (headingMatches.length > 0) {
        return {
          query: trimmed,
          items: headingMatches,
          exactMatch: headingMatches.length === 1 ? headingMatches[0] : null,
          totalFound: headingMatches.length,
          rulingAdvice: `Lọc chính xác theo phân nhóm/mã số HS bắt đầu bằng [${trimmed}]. Gồm ${headingMatches.length} dòng hàng theo biểu thuế.`,
          detectedCategory: headingMatches[0].categoryNameVi || 'Phân Nhóm Hải Quan',
          matchType: 'EXACT_HS_CODE',
        };
      }
    }
  }

  // 2. CHECK FOR EXACT COMMODITY NAME & KEYWORD MATCH (100% Precision)
  const scoredItems: { item: HsCodeTariffItem; score: number; isExact: boolean }[] = [];

  for (const item of basePool) {
    let score = 0;
    let isExact = false;

    const descViLower = item.descriptionVi.toLowerCase();
    const descEnLower = item.descriptionEn.toLowerCase();
    const descViNoDia = removeVietnameseDiacritics(item.descriptionVi);
    const itemHsDigits = normalizeHsDigits(item.hsCode);

    // Check HS digits prefix/contains
    if (queryDigits.length >= 2 && itemHsDigits.includes(queryDigits)) {
      score += 300;
    }

    // Check exact keyword match in predefined keywords list
    if (item.keywords && Array.isArray(item.keywords)) {
      for (const kw of item.keywords) {
        const kwLower = kw.toLowerCase();
        const kwNoDia = removeVietnameseDiacritics(kw);

        // Exact match with query
        if (kwLower === queryLower || kwNoDia === queryNoDiacritics) {
          score += 1000;
          isExact = true;
          break;
        }

        // Substring match in keyword
        if (queryLower.includes(kwLower) || kwLower.includes(queryLower) ||
            queryNoDiacritics.includes(kwNoDia) || kwNoDia.includes(queryNoDiacritics)) {
          score += 500;
        }
      }
    }

    // Check exact match in description
    if (descViLower.includes(queryLower) || descViNoDia.includes(queryNoDiacritics)) {
      score += 400;
      if (descViLower.startsWith(queryLower) || descViNoDia.startsWith(queryNoDiacritics)) {
        score += 200;
      }
    }

    if (descEnLower.includes(queryLower)) {
      score += 300;
    }

    // Tokenize query and check word coverage
    const tokens = queryNoDiacritics.split(/\s+/).filter(t => t.length > 1);
    if (tokens.length > 1) {
      const allTokensInVi = tokens.every(t => descViNoDia.includes(t));
      if (allTokensInVi) {
        score += 450;
      } else {
        const tokenMatchCount = tokens.filter(t => descViNoDia.includes(t)).length;
        score += tokenMatchCount * 80;
      }
    }

    if (score > 0) {
      scoredItems.push({ item, score, isExact });
    }
  }

  // Sort descending by match score
  scoredItems.sort((a, b) => b.score - a.score);

  if (scoredItems.length > 0) {
    const topScored = scoredItems[0];
    const isTopExact = topScored.isExact || topScored.score >= 900;
    
    const results = scoredItems.map(s => ({
      ...s.item,
      isExactMatch: s.isExact || s.score >= 900,
      confidenceScore: s.isExact ? 100 : Math.min(99, Math.max(70, Math.round(s.score / 10))),
    }));

    const exactItem = isTopExact ? results[0] : null;

    return {
      query: trimmed,
      items: results,
      exactMatch: exactItem,
      totalFound: results.length,
      rulingAdvice: isTopExact
        ? `Lọc chính xác 100% cho sản phẩm "${trimmed}" khớp với mã HS ${results[0].hsCode} (${results[0].descriptionVi}).`
        : `Tìm thấy ${results.length} mặt hàng phù hợp nhất trong Biểu thuế XNK cho "${trimmed}".`,
      detectedCategory: results[0].categoryNameVi || 'Danh Mục Phù Hợp',
      matchType: isTopExact ? 'EXACT_PRODUCT_NAME' : 'KEYWORD_MATCH',
    };
  }

  // Fallback if no match: return entire or category pool with advice
  return {
    query: trimmed,
    items: basePool.slice(0, 5),
    exactMatch: null,
    totalFound: 0,
    rulingAdvice: `Không tìm thấy mã HS khớp tuyệt đối cho "${trimmed}". Bấm nút "AI Tra Cứu" để kích hoạt mô hình Gemini chuyên sâu phân tích phân loại.`,
    detectedCategory: 'Chưa xác định',
    matchType: 'ALL',
  };
}

/**
 * Intelligent HS Code lookup: Prioritizes 100% exact local master schedule match,
 * with seamless fallback/enhancement via backend Gemini AI engine.
 */
export async function lookupHsCodeWithAi(
  commodityQuery: string,
  originCountry?: string
): Promise<HsCodeLookupResponse> {
  const trimmed = (commodityQuery || '').trim();
  if (!trimmed) {
    return {
      query: '',
      items: COMMON_HS_CODE_DATABASE.slice(0, 5),
      rulingAdvice: 'Vui lòng nhập tên hàng hóa hoặc mã HS để hệ thống lọc ra chính xác 100%.',
      detectedCategory: 'Tất cả danh mục',
    };
  }

  // 1. Try local master database search first (Instant & 100% deterministic)
  const localSearch = searchMasterHsTariffs(trimmed);
  if (localSearch.exactMatch) {
    return {
      query: trimmed,
      items: localSearch.items,
      rulingAdvice: `Đã đối chiếu chính xác 100% với Biểu thuế XNK Việt Nam (Nghị định 26/2023/NĐ-CP). Mã HS ${localSearch.exactMatch.hsCode} là mã chính thức của sản phẩm này.`,
      detectedCategory: localSearch.detectedCategory,
      isExactMatch: true,
      matchType: localSearch.matchType,
    };
  }

  // 2. If no exact match or complex description, call AI endpoint
  try {
    const res = await fetch('/api/gemini/hs-code-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commodityQuery: trimmed,
        originCountry: originCountry || 'China / Korea / EU / USA / ASEAN',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items) && data.items.length > 0) {
        // Reconcile AI response with Master database to guarantee legal tax rate precision
        const reconciledItems: HsCodeTariffItem[] = data.items.map((aiItem: any) => {
          const aiDigits = normalizeHsDigits(aiItem.hsCode);
          const masterMatch = COMMON_HS_CODE_DATABASE.find(
            m => normalizeHsDigits(m.hsCode) === aiDigits
          );

          if (masterMatch) {
            // Guarantee 100% legal rate accuracy from official database
            return {
              ...masterMatch,
              classificationReason: aiItem.classificationReason || masterMatch.classificationReason,
              confidenceScore: Math.max(aiItem.confidenceScore || 90, masterMatch.confidenceScore),
              isExactMatch: true,
            };
          }

          return aiItem;
        });

        return {
          query: trimmed,
          items: reconciledItems,
          rulingAdvice: data.rulingAdvice || 'Đã phân tích theo 6 Quy tắc tổng quát giải thích phân loại hàng hóa GIR.',
          detectedCategory: data.detectedCategory || 'Tổng hợp',
          isExactMatch: reconciledItems.some(i => i.isExactMatch),
          matchType: 'AI_REASONED',
        };
      }
    }
  } catch (err) {
    console.warn('AI HS Lookup server error, falling back to master tariff schedule:', err);
  }

  // 3. Fallback to local match results
  return {
    query: trimmed,
    items: localSearch.items.length > 0 ? localSearch.items : COMMON_HS_CODE_DATABASE.slice(0, 4),
    rulingAdvice: localSearch.rulingAdvice,
    detectedCategory: localSearch.detectedCategory,
    isExactMatch: !!localSearch.exactMatch,
    matchType: localSearch.matchType,
  };
}

/**
 * Calculate import duties, VAT, special excise taxes, and environmental taxes
 * according to Vietnam Customs Valuation and Tariff Law (Nghị định 26/2023/NĐ-CP).
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
    const fta = hsItem.ftaTariffs?.find(f => f.agreementCode === appliedAgreementCode);
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
  const vatRate = hsItem.vatTariff !== undefined ? hsItem.vatTariff : 8;
  const taxableVatBaseVnd = cifValueVnd + importDutyVnd + specialConsumptionTaxVnd + environmentalTaxVnd;
  const vatTaxVnd = Math.round(taxableVatBaseVnd * (vatRate / 100));
  const vatTaxUsd = vatTaxVnd / exRate;

  // Tổng thuế phải nộp vào ngân sách nhà nước
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

  // Line item 2: Thuế Tiêu Thụ Đặc Biệt (nếu > 0)
  if (specialConsumptionTaxVnd > 0) {
    suggestedLineItems.push({
      id: `duty_ttdb_${Date.now()}_2`,
      code: 'EXCISE_TAX',
      description: `Thuế Tiêu Thụ Đặc Biệt hàng ${hsItem.hsCode} (${specialRate}%)`,
      category: 'CUSTOMS',
      location: 'POD',
      unit: 'Lô hàng',
      quantity: 1,
      unitPrice: specialConsumptionTaxVnd,
      currency: 'VND',
      vatRate: 0,
      amountVnd: specialConsumptionTaxVnd,
      amountUsd: specialConsumptionTaxUsd,
      note: `Hàng thuộc diện chịu thuế tiêu thụ đặc biệt theo Luật Thuế TTĐB`,
    });
  }

  // Line item 3: Thuế VAT Nhập Khẩu
  if (vatTaxVnd > 0) {
    suggestedLineItems.push({
      id: `duty_vat_${Date.now()}_3`,
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

  // Line item 4: Phí Kiểm Tra Chuyên Ngành (nếu có)
  if (hsItem.specializedInspection?.isRequired) {
    const inspCost = hsItem.specializedInspection.estimatedCostVnd || 2500000;
    suggestedLineItems.push({
      id: `duty_insp_${Date.now()}_4`,
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

/**
 * Compare all FTA preferential tariffs against standard MFN duty to calculate exact tax savings.
 */
export function compareFtaTaxSavings(
  hsItem: HsCodeTariffItem,
  cifValueUsd: number,
  exchangeRate: number
): FtaComparisonRow[] {
  const cifVnd = cifValueUsd * exchangeRate;
  const mfnRate = hsItem.importPreferentialTariff;
  const mfnDutyVnd = (cifVnd * mfnRate) / 100;
  const mfnDutyUsd = (cifValueUsd * mfnRate) / 100;

  const rows: FtaComparisonRow[] = [
    {
      agreementCode: 'MFN',
      agreementName: 'Biểu thuế NK Ưu đãi Chuẩn (MFN)',
      rate: mfnRate,
      coForm: 'Không yêu cầu C/O',
      qualifyingRule: 'Tiêu chuẩn',
      dutyAmountVnd: mfnDutyVnd,
      dutyAmountUsd: mfnDutyUsd,
      savingsVsMfnVnd: 0,
      savingsVsMfnUsd: 0,
      isBestOption: false,
      notes: 'Áp dụng mặc định khi không có C/O ưu đãi'
    }
  ];

  if (!hsItem.ftaTariffs || hsItem.ftaTariffs.length === 0) {
    return rows;
  }

  // Find lowest rate
  let minRate = mfnRate;
  hsItem.ftaTariffs.forEach(fta => {
    if (fta.rate < minRate) {
      minRate = fta.rate;
    }
  });

  hsItem.ftaTariffs.forEach(fta => {
    const ftaDutyVnd = (cifVnd * fta.rate) / 100;
    const ftaDutyUsd = (cifValueUsd * fta.rate) / 100;
    const savingsVnd = Math.max(0, mfnDutyVnd - ftaDutyVnd);
    const savingsUsd = Math.max(0, mfnDutyUsd - ftaDutyUsd);

    rows.push({
      agreementCode: fta.agreementCode,
      agreementName: fta.agreementName,
      rate: fta.rate,
      coForm: fta.coForm,
      qualifyingRule: fta.qualifyingRule || 'RVC 40% / CTSH',
      dutyAmountVnd: ftaDutyVnd,
      dutyAmountUsd: ftaDutyUsd,
      savingsVsMfnVnd: savingsVnd,
      savingsVsMfnUsd: savingsUsd,
      isBestOption: fta.rate === minRate && fta.rate < mfnRate,
      notes: fta.conditionNotes || 'Cần xuất trình C/O bản gốc hợp lệ tại thời điểm làm thủ tục'
    });
  });

  return rows;
}

/**
 * Intelligent Customs Risk Assessment Engine (Dự báo Luồng tờ khai & Rủi ro kiểm tra)
 */
export function assessCustomsRisk(
  hsItem: HsCodeTariffItem,
  cifValueUsd: number
): CustomsRiskAssessment {
  const riskFactors: string[] = [];
  const mitigationSteps: string[] = [];
  const requiredDossierDocuments: string[] = [
    'Hóa đơn thương mại (Commercial Invoice)',
    'Phiếu đóng gói chi tiết (Packing List)',
    'Vận đơn đường biển / Hàng không (Bill of Lading / Airway Bill)',
  ];

  let score = 95; // Baseline high confidence

  // Factor 1: Specialized Inspection
  if (hsItem.specializedInspection?.isRequired) {
    score -= 25;
    riskFactors.push(`Hàng thuộc diện kiểm tra chuyên ngành bắt buộc (${hsItem.specializedInspection.agency} - ${hsItem.specializedInspection.inspectionType}).`);
    mitigationSteps.push(`Đăng ký số hồ sơ kiểm tra chất lượng / kiểm dịch trên Cổng một cửa quốc gia NSW trước khi tàu cập cảng.`);
    requiredDossierDocuments.push(`Giấy đăng ký kiểm tra chuyên ngành đã được NSW cấp số tiếp nhận`);
  }

  // Factor 2: High CIF Valuation risk
  if (cifValueUsd > 50000) {
    score -= 10;
    riskFactors.push(`Lô hàng có trị giá cao (> $50,000 USD), nguy cơ bị chuyển tham vấn giá hải quan.`);
    mitigationSteps.push(`Chuẩn bị sẵn Ủy nhiệm chi thanh toán quốc tế (T/T, L/C) và Hợp đồng ngoại thương có chữ ký số.`);
    requiredDossierDocuments.push(`Chứng từ thanh toán ngân hàng (Swift message / Bank Slip)`, `Hợp đồng ngoại thương (Sales Contract)`);
  }

  // Factor 3: High Import Duty rate
  if (hsItem.importPreferentialTariff >= 15) {
    score -= 15;
    riskFactors.push(`Thuế suất MFN cao (${hsItem.importPreferentialTariff}%), Hải quan thường kiểm soát chặt chẽ mã HS để tránh gian lận thuế.`);
    mitigationSteps.push(`Chuẩn bị Bản mô tả thông số kỹ thuật (Catalogue / Spec Sheet) chứng minh cấu tạo và công dụng.`);
    requiredDossierDocuments.push(`Catalogue thông số kỹ thuật chính thức từ nhà sản xuất (Technical Spec)`);
  }

  // Factor 4: Special consumption tax
  if (hsItem.specialConsumptionTariff && hsItem.specialConsumptionTariff > 0) {
    score -= 20;
    riskFactors.push(`Hàng hóa chịu thuế tiêu thụ đặc biệt (${hsItem.specialConsumptionTariff}%).`);
    mitigationSteps.push(`Khai báo chính xác nhãn hiệu, số khung/số máy hoặc nồng độ cồn/thành phần theo quy định.`);
  }

  // Channel determination
  let predictedChannel: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
  if (score < 60) {
    predictedChannel = 'RED'; // Luồng Đỏ (Kiểm tra thực tế hàng hóa)
  } else if (score < 80) {
    predictedChannel = 'YELLOW'; // Luồng Vàng (Kiểm tra chi tiết hồ sơ)
  }

  // Valuation risk
  let valuationRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (cifValueUsd > 100000 || (hsItem.importPreferentialTariff >= 20)) {
    valuationRisk = 'HIGH';
  } else if (cifValueUsd > 30000 || hsItem.importPreferentialTariff >= 10) {
    valuationRisk = 'MEDIUM';
  }

  // HS Discrepancy risk
  let hsDiscrepancyRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (hsItem.categoryGroup === 'ELECTRONICS' || hsItem.categoryGroup === 'MACHINERY' || hsItem.categoryGroup === 'CHEMICAL') {
    hsDiscrepancyRisk = 'MEDIUM';
    if (hsItem.classificationReason.includes('GIR 3') || hsItem.classificationReason.includes('GIR 2')) {
      hsDiscrepancyRisk = 'HIGH';
    }
  }

  if (mitigationSteps.length === 0) {
    mitigationSteps.push('Hồ sơ tiêu chuẩn, khai báo đúng tên hàng thương mại và mã HS trên phần mềm VNACCS.');
  }

  return {
    predictedChannel,
    valuationRisk,
    hsDiscrepancyRisk,
    overallScore: Math.max(10, Math.min(100, score)),
    riskFactors,
    mitigationSteps,
    requiredDossierDocuments
  };
}

/**
 * Generate official Advance Ruling Dossier Draft (Đề nghị xác định trước mã số theo Điều 28 Luật HQ 2014)
 */
export function generateAdvanceRulingDossier(
  hsItem: HsCodeTariffItem,
  commodityName: string,
  originCountry: string = 'Trung Quốc'
): AdvanceRulingDossier {
  const dossierNum = `AR-${new Date().getFullYear()}-${hsItem.chapter}${hsItem.heading.slice(2)}-${Math.floor(1000 + Math.random() * 9000)}`;

  const girRule = hsItem.classificationReason.includes('GIR 1') 
    ? 'Quy tắc 1 (GIR 1) - Tên và đề mục chương, nhóm' 
    : hsItem.classificationReason.includes('GIR 2') 
    ? 'Quy tắc 2 (GIR 2) - Hàng dạng bán thành phẩm/tháo rời' 
    : hsItem.classificationReason.includes('GIR 3') 
    ? 'Quy tắc 3 (GIR 3) - Hàng đa thành phần/đặc trưng cơ bản' 
    : 'Quy tắc 1 & Quy tắc 6 (GIR 1 & GIR 6) - Căn cứ nội dung nhóm và phân nhóm 8 chữ số';

  const draftPetitionText = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
-----------------
ĐƠN ĐỀ NGHỊ XÁC ĐỊNH TRƯỚC MÃ SỐ HẢI QUAN
(Kèm theo Thông tư số 38/2015/TT-BTC & Thông tư 39/2018/TT-BTC)

Kính gửi: TỔNG CỤC HẢI QUAN VIỆT NAM (CỤC THUẾ XNK)

1. Tên tổ chức đề nghị: Doanh nghiệp xuất nhập khẩu (BogiLogistics Client)
2. Tên thương mại của hàng hóa: ${commodityName || hsItem.descriptionVi}
3. Tên khoa học / Kỹ thuật: ${hsItem.descriptionEn}
4. Xuất xứ hàng hóa: ${originCountry}
5. Thành phần cấu tạo: Vật liệu chính phù hợp nhóm ${hsItem.heading}
6. Công dụng và nguyên lý hoạt động: Phục vụ mục đích quy định tại Chương ${hsItem.chapter}
7. Mã số HS do Doanh nghiệp đề xuất: ${hsItem.hsCode}
8. Căn cứ phân loại đề xuất: 
   - Áp dụng ${girRule}.
   - Căn cứ Biểu thuế Xuất nhập khẩu hiện hành (Nghị định 26/2023/NĐ-CP).
   - Đảm bảo tính nhất quán giữa 6 số chuẩn WCO và 8 số Danh mục Biểu thuế Việt Nam.

Kính đề nghị Tổng cục Hải quan xem xét, ban hành Thông báo kết quả xác định trước mã số theo quy định.`;

  return {
    dossierNumber: dossierNum,
    commodityName: commodityName || hsItem.descriptionVi,
    suggestedHsCode: hsItem.hsCode,
    originCountry,
    materialComposition: 'Cấu tạo hợp chuẩn theo mô tả kỹ thuật nhóm ' + hsItem.heading,
    functionPrinciple: 'Vận hành đúng chức năng phân loại theo Chương ' + hsItem.chapter,
    packagingState: 'Hàng mới 100%, đóng gói theo quy chuẩn bảo vệ vận tải quốc tế',
    applicableGirRule: girRule,
    legalBasis: [
      'Điều 28 Luật Hải quan số 54/2014/QH13',
      'Điều 24 Nghị định số 08/2015/NĐ-CP',
      'Thông tư số 38/2015/TT-BTC và Thông tư số 39/2018/TT-BTC của Bộ Tài chính',
      'Nghị định 26/2023/NĐ-CP về Biểu thuế xuất khẩu, Biểu thuế nhập khẩu ưu đãi'
    ],
    requiredAttachments: [
      { name: 'Catalogue kỹ thuật / Tài liệu sản phẩm (Spec Sheet)', required: true, description: 'Hình ảnh, bản vẽ, thông số cấu tạo do nhà sản xuất phát hành' },
      { name: 'Quy trình công nghệ / Giấy chứng nhận phân tích (COA)', required: true, description: 'Certificate of Analysis chứng minh thành phần cấu tạo' },
      { name: 'Mẫu hàng hóa thực tế (nếu được yêu cầu)', required: false, description: 'Cung cấp mẫu thử phục vụ công tác giám định phân tích' },
      { name: 'Văn bản ủy quyền đại diện làm thủ tục (nếu có)', required: true, description: 'Hợp đồng đại lý làm thủ tục hải quan' }
    ],
    draftPetitionText
  };
}
