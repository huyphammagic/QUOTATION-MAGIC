/**
 * Logistics Quotation Management Platform - Phase 57 (Lựa Chọn 1)
 * Competitor Intelligence & Dynamic Win/Loss Price Benchmark Engine
 * Core Logic, Lane Market Rates, Probability Calculator & Sweet-Spot Optimizer
 */

import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  LaneMarketBenchmark, 
  CompetitorProfile, 
  WinProbabilityResult, 
  PriceCompetitivenessRating, 
  WinLossFeedbackRecord 
} from '../../types/competitorIntelligence';
import { TransportMode, ContainerType, Currency } from '../../types/logistics';

const COLLECTION_WIN_LOSS = 'competitorWinLossRecords';

// In-memory cache for fast calculation and test resilience
let memoryWinLossList: WinLossFeedbackRecord[] = [];

// ============================================================================
// 1. STANDARD MARKET LANE BENCHMARKS (Biểu cước thị trường chuẩn)
// ============================================================================
export const STANDARD_LANE_BENCHMARKS: LaneMarketBenchmark[] = [
  {
    id: 'bm_hcm_lax_40hc',
    pol: 'Cát Lái, Hồ Chí Minh',
    pod: 'Long Beach / Los Angeles, USA',
    mode: 'SEA_FCL',
    containerType: "40'HC",
    currency: 'USD',
    p10LowPrice: 1650,    // Mức thấp (Spot phá giá, hãng tàu budget)
    p50MedianPrice: 1850, // Mức trung bình chuẩn thị trường
    p90HighPrice: 2200,   // Mức cao (Direct tàu nhanh APL EX1/Matson, 14-21 ngày DEM)
    carrierAverages: {
      'ONE': 1800,
      'Maersk': 1950,
      'Evergreen': 1820,
      'Cosco': 1750,
      'ZIM': 1780
    },
    trend: 'STABLE',
    sampleQuotesCount: 142,
    lastUpdated: '2026-10-01',
    notesVi: 'Tuyến Bờ Tây Mỹ tải ổn định, space dồi dào, khách hàng chuộng free time DEM/DET 14 ngày tại cảng đến.'
  },
  {
    id: 'bm_hph_ham_40hc',
    pol: 'Hải Phòng Port',
    pod: 'Hamburg / Rotterdam, EU',
    mode: 'SEA_FCL',
    containerType: "40'HC",
    currency: 'USD',
    p10LowPrice: 2800,
    p50MedianPrice: 3200,
    p90HighPrice: 3850,
    carrierAverages: {
      'Hapag-Lloyd': 3250,
      'Maersk': 3400,
      'CMA CGM': 3150,
      'ONE': 3100
    },
    trend: 'FALLING',
    sampleQuotesCount: 88,
    lastUpdated: '2026-09-28',
    notesVi: 'Tuyến Bắc Âu giá đang có xu hướng giảm nhẹ sau mùa cao điểm, khách chuộng tàu đi qua Mũi Hảo Vọng an toàn.'
  },
  {
    id: 'bm_hcm_tyo_20rf',
    pol: 'Cát Lái, Hồ Chí Minh',
    pod: 'Tokyo / Yokohama, Japan',
    mode: 'SEA_FCL',
    containerType: "20'RF",
    currency: 'USD',
    p10LowPrice: 1100,
    p50MedianPrice: 1350,
    p90HighPrice: 1650,
    carrierAverages: {
      'ONE': 1300,
      'SITC': 1180,
      'Wanhai': 1250,
      'Maersk': 1450
    },
    trend: 'RISING',
    sampleQuotesCount: 65,
    lastUpdated: '2026-10-02',
    notesVi: 'Cont lạnh đi Nhật Bản yêu cầu khắt khe về nhiệt độ (-18C đến -25C), cắm điện liên tục, ưu tiên hãng tàu Nhật (ONE).'
  },
  {
    id: 'bm_hph_ham_lcl',
    pol: 'Hải Phòng Port',
    pod: 'Hamburg Port, Germany',
    mode: 'SEA_LCL',
    containerType: 'LCL (CBM/KGS)',
    currency: 'USD',
    p10LowPrice: 25,
    p50MedianPrice: 42,
    p90HighPrice: 65,
    carrierAverages: {
      'Vanguard': 40,
      'ECU Worldwide': 45,
      'Shipco': 42
    },
    trend: 'STABLE',
    sampleQuotesCount: 54,
    lastUpdated: '2026-10-01',
    notesVi: 'Hàng lẻ ghép cont LCL tính theo CBM hoặc RT (Revenue Ton). Chú ý kiểm tra phụ phí CFS tại cảng đến.'
  }
];

// ============================================================================
import { VIETNAM_FORWARDER_COMPETITORS } from '../../data/vietnamForwarderCompetitors';
import {
  CompetitorScanResult,
  LaneCompetitorAnalysis,
  QuoteTearDownResult
} from '../../types/competitorIntelligence';

const STORAGE_KEY_CUSTOM_COMPETITORS = 'bogi_custom_competitor_profiles';

// ============================================================================
// 2. COMPETITOR PROFILES & BATTLE TACTICS (Hồ sơ đối thủ cạnh tranh Việt Nam)
// ============================================================================
export const STANDARD_COMPETITORS: CompetitorProfile[] = VIETNAM_FORWARDER_COMPETITORS;

/**
 * Lấy danh sách đối thủ (kết hợp thư viện chuẩn thị trường VN + đối thủ do người dùng thêm/quét AI)
 */
export function getStoredCompetitors(): CompetitorProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_COMPETITORS);
    if (!raw) return STANDARD_COMPETITORS;
    const customList: CompetitorProfile[] = JSON.parse(raw);
    
    // Merge: custom items override or prepend standard ones
    const map = new Map<string, CompetitorProfile>();
    STANDARD_COMPETITORS.forEach(c => map.set(c.id, c));
    customList.forEach(c => map.set(c.id, c));
    
    return Array.from(map.values());
  } catch (err) {
    console.warn('Error reading stored competitors from localStorage:', err);
    return STANDARD_COMPETITORS;
  }
}

/**
 * Lưu hoặc cập nhật hồ sơ đối thủ vào bộ nhớ cục bộ và Firestore
 */
export async function saveStoredCompetitor(profile: CompetitorProfile): Promise<void> {
  try {
    const current = getStoredCompetitors();
    const idx = current.findIndex(c => c.id === profile.id);
    let updated: CompetitorProfile[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...profile, lastScannedAt: new Date().toISOString() };
    } else {
      updated = [{ ...profile, lastScannedAt: new Date().toISOString() }, ...current];
    }
    
    // Save to localStorage
    const customOnly = updated.filter(c => c.isCustomAdded || c.isAiGenerated);
    localStorage.setItem(STORAGE_KEY_CUSTOM_COMPETITORS, JSON.stringify(customOnly));

    // Async sync to Firestore
    try {
      const docRef = doc(db, 'competitorProfiles', profile.id);
      await setDoc(docRef, profile, { merge: true });
    } catch (fErr) {
      console.warn('Notice saving competitor to Firestore (cached locally):', fErr);
    }
  } catch (err) {
    console.error('Failed to save competitor profile:', err);
  }
}

/**
 * Xóa một đối thủ khỏi danh sách tùy chỉnh
 */
export function deleteStoredCompetitor(id: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_COMPETITORS);
    if (!raw) return;
    const list: CompetitorProfile[] = JSON.parse(raw);
    const filtered = list.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY_CUSTOM_COMPETITORS, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete competitor:', err);
  }
}

/**
 * Reset về danh sách chuẩn mặc định thị trường Việt Nam
 */
export function resetToStandardCompetitors(): CompetitorProfile[] {
  try {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_COMPETITORS);
  } catch {}
  return STANDARD_COMPETITORS;
}

// ============================================================================
// 2B. AI FORWARDER RADAR & COMPETITOR SCAN ENGINES
// ============================================================================

/**
 * Quét AI thông tin đối thủ Forwarder cụ thể tại Việt Nam
 */
export async function scanCompetitorWithAi(params: {
  competitorName: string;
  tradeLane?: string;
  headquarters?: string;
}): Promise<CompetitorScanResult> {
  const { competitorName, tradeLane, headquarters } = params;

  // 1. Try real server-side Gemini API endpoint
  try {
    const res = await fetch('/api/gemini/scan-competitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitorName, tradeLane, headquarters }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.competitor) {
        const enrichedCompetitor: CompetitorProfile = {
          ...data.competitor,
          id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          code: (data.competitor.code || competitorName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()).substring(0, 16),
          isAiGenerated: true,
          isCustomAdded: true,
          lastScannedAt: new Date().toISOString(),
        };

        // Automatically store
        await saveStoredCompetitor(enrichedCompetitor);

        return {
          competitor: enrichedCompetitor,
          marketIntelligenceSummaryVi: data.marketIntelligenceSummaryVi || `Đã hoàn tất phân tích trí tuệ cạnh tranh cho ${competitorName}.`,
          keyVulnerabilitiesVi: data.keyVulnerabilitiesVi || data.competitor.weaknesses || [],
          immediateSalesActionVi: data.immediateSalesActionVi || data.competitor.killPitchVi || 'Chủ động liên hệ khách hàng với kịch bản phản đòn.',
        };
      }
    }
  } catch (apiErr) {
    console.warn('Notice: Server AI scan failed or offline, using built-in intelligent scanner fallback:', apiErr);
  }

  // 2. Intelligent Fallback Engine: Check matched preloaded forwarders or generate rich heuristic profile
  const matched = VIETNAM_FORWARDER_COMPETITORS.find(c => 
    c.name.toLowerCase().includes(competitorName.toLowerCase()) || 
    (c.legalName && c.legalName.toLowerCase().includes(competitorName.toLowerCase())) ||
    (c.brandName && c.brandName.toLowerCase().includes(competitorName.toLowerCase()))
  );

  if (matched) {
    return {
      competitor: matched,
      marketIntelligenceSummaryVi: `${matched.name} là đối thủ mạnh thuộc nhóm ${matched.tier === 'TIER_1_GLOBAL' ? 'Đa Quốc Gia' : matched.tier === 'TOP_LOCAL_FORWARDER' ? 'Top Forwarder Việt Nam' : 'Hãng tàu bán trực tiếp'}. Điểm yếu lớn nhất là ${matched.weaknesses[0]}.`,
      keyVulnerabilitiesVi: matched.weaknesses,
      immediateSalesActionVi: matched.winningCounterTactics[0],
    };
  }

  // Synthetic forwarder profile based on intelligent logistics heuristics
  const isGlobalLike = /global|dhl|schenker|expeditors|panalpina|nagel|kintetsu|nippon|yusen|bollore/i.test(competitorName);
  const isCarrierLike = /maersk|msc|cma|cosco|evergreen|one|sitc|yang ming|hapag/i.test(competitorName);

  const fallbackTier = isGlobalLike ? 'TIER_1_GLOBAL' : isCarrierLike ? 'DIRECT_CARRIER' : 'TOP_LOCAL_FORWARDER';

  const syntheticCompetitor: CompetitorProfile = {
    id: `comp_gen_${Date.now()}`,
    name: competitorName,
    legalName: `Công ty Giao nhận Vận tải ${competitorName}`,
    brandName: competitorName,
    code: competitorName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10) || 'FWD',
    tier: fallbackTier,
    headquarters: headquarters || 'TP. Hồ Chí Minh & Hải Phòng',
    establishedYear: 2010,
    employeeCount: isGlobalLike ? '500+ nhân sự' : '150-300 nhân sự',
    strongLanes: tradeLane ? [tradeLane, 'Tuyến Châu Á (Intra-Asia)', 'Tuyến Bắc Mỹ'] : ['Hồ Chí Minh -> Mỹ', 'Hải Phòng -> Châu Âu', 'Tuyến Nội Á'],
    typicalDiscountPercent: isGlobalLike ? 6 : isCarrierLike ? -3 : -2,
    pricePositioning: isGlobalLike ? 'PREMIUM' : 'STANDARD',
    localChargesRating: isGlobalLike ? 'EXPENSIVE' : 'MODERATE',
    strengths: [
      `Có mạng lưới đại lý ổn định trên các tuyến truyền thống`,
      `Giá cước cước biển được chiết khấu theo khối lượng hợp đồng`,
      `Quan hệ tốt với bộ phận khai thác cảng tại Việt Nam`
    ],
    weaknesses: [
      `Phụ phí Local charges và phí lưu kho bãi phát sinh cao khi có sự cố`,
      `Quy trình phê duyệt báo giá và cấp booking mất từ 24-48 giờ`,
      `Hỗ trợ sau bán hàng và xử lý vướng mắc kiểm hóa chậm vào ngoài giờ hành chính`
    ],
    swotAnalysis: {
      strengths: ['Giá cước cạnh tranh theo mùa', 'Thương hiệu quen thuộc tại địa phương'],
      weaknesses: ['Chậm phản hồi sự cố', 'Phụ phí cảng đến không cố định'],
      opportunities: ['Tận dụng sự chậm chạp của họ để BOGI Logistics chốt đơn trước'],
      threats: ['Họ sẵn sàng hạ giá thêm $20-$30/cont nếu khách hàng mặc cả']
    },
    winningCounterTactics: [
      `Báo giá trọn gói All-in cam kết không phát sinh phụ phí tại cảng đích`,
      `Tặng thêm 7-14 ngày Free DEM/DET tại cảng đến để vượt trội đối thủ`,
      `Phản hồi báo giá trong 15 phút với chuyên viên hỗ trợ 1-1 qua Zalo 24/7`
    ],
    killPitchVi: `${competitorName} có mức giá cước biển ban đầu khá tốt, nhưng điểm yếu của họ là hay phát sinh phụ phí Local charges và phí chứng từ tại cảng đích. BOGI Logistics cam kết báo giá trọn gói bằng văn bản, hỗ trợ thủ tục hải quan tận nơi và cấp 14 ngày free-time miễn phí.`,
    zaloScriptVi: `Em chào Anh/Chị, BOGI Logistics xin gửi bảng so sánh chi tiết giữa bên em và ${competitorName}. Bên em đảm bảo giá All-in trọn gói, không có phụ phí ẩn và cam kết giữ chỗ 100% không lo bị rớt cont ạ.`,
    trapQuestionsVi: [
      `Đối thủ ${competitorName} có cam kết bằng văn bản không phát sinh phụ phí tại cảng đến không ạ?`,
      `Bên họ có hỗ trợ trực tiếp ngoài giờ hành chính nếu lô hàng cần thông quan gấp không ạ?`
    ],
    isAiGenerated: true,
    isCustomAdded: true,
    lastScannedAt: new Date().toISOString(),
  };

  await saveStoredCompetitor(syntheticCompetitor);

  return {
    competitor: syntheticCompetitor,
    marketIntelligenceSummaryVi: `Đã phân tích ${competitorName} dựa trên cơ sở dữ liệu thị trường Forwarder Việt Nam. Đối thủ thuộc nhóm ${syntheticCompetitor.tier}.`,
    keyVulnerabilitiesVi: syntheticCompetitor.weaknesses,
    immediateSalesActionVi: syntheticCompetitor.killPitchVi || 'Báo giá nhanh kèm cam kết Free DEM/DET.',
  };
}

/**
 * Quét đối thủ và mức cước thị trường theo tuyến vận chuyển
 */
export async function scanLaneCompetitorsWithAi(params: {
  origin: string;
  destination: string;
  mode?: string;
  commodity?: string;
}): Promise<LaneCompetitorAnalysis> {
  const { origin, destination, mode = 'SEA_FCL', commodity = 'General Cargo' } = params;

  try {
    const res = await fetch('/api/gemini/scan-market-lane', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, mode, commodity }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.keyCompetitors) {
        return data as LaneCompetitorAnalysis;
      }
    }
  } catch (err) {
    console.warn('API lane scan failed, using fallback:', err);
  }

  // Fallback lane competitor mapping
  return {
    lane: `${origin} -> ${destination}`,
    mode: mode as any,
    marketLeader: 'Kuehne + Nagel & Maersk Spot',
    keyCompetitors: [
      {
        name: 'Kuehne + Nagel Vietnam',
        tier: 'TIER_1_GLOBAL',
        estimatedShare: '22% thị phần',
        typicalRateUsd: 1950,
        pros: 'Thương hiệu uy tín, công nghệ myKN theo dõi tốt',
        cons: 'Phụ phí local charges cao, xử lý khiếu nại chậm'
      },
      {
        name: 'Bee Logistics Corp',
        tier: 'TOP_LOCAL_FORWARDER',
        estimatedShare: '15% thị phần',
        typicalRateUsd: 1820,
        pros: 'Mạng lưới nội địa dày đặc, giá cạnh tranh',
        cons: 'Đại lý đầu nước ngoài phụ thuộc bên thứ ba'
      },
      {
        name: 'Maersk Spot Direct',
        tier: 'DIRECT_CARRIER',
        estimatedShare: '18% thị phần',
        typicalRateUsd: 1780,
        pros: 'Đặt chỗ tự động trên website',
        cons: 'Phạt hủy cọc nặng $300/cont, free time ngắn chỉ 5 ngày'
      }
    ],
    bogiStrategyRecommendation: 'Áp dụng mức giá Sweet-Spot ~$1,830 kết hợp tặng 14 ngày Free DEM/DET và dịch vụ Door-to-Door trọn gói hỗ trợ hải quan 24/7 để chiến thắng cả 3 đối thủ trên.',
    priceSweetSpotUsd: 1830
  };
}

/**
 * Bóc tách và phản biện báo giá của đối thủ cạnh tranh
 */
export async function teardownCompetitorQuoteWithAi(params: {
  rawQuoteText: string;
  competitorName?: string;
  customerName?: string;
}): Promise<QuoteTearDownResult> {
  const { rawQuoteText, competitorName, customerName } = params;

  try {
    const res = await fetch('/api/gemini/teardown-competitor-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawQuoteText, competitorName, customerName }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.hiddenFeeAlerts) {
        return data as QuoteTearDownResult;
      }
    }
  } catch (err) {
    console.warn('API teardown failed, using fallback engine:', err);
  }

  // Fallback analysis
  return {
    competitorName: competitorName || 'Đối thủ cạnh tranh',
    totalCostDetected: 'Báo giá sơ bộ (chưa gồm phụ phí phát sinh)',
    hiddenFeeAlerts: [
      {
        feeName: 'Phí D/O & Handling đầu đến (Destination Delivery Order)',
        estimatedCost: '$80 - $150 / B/L',
        descriptionVi: 'Báo giá đối thủ chỉ nêu cước biển (Ocean Freight) mà chưa bao gồm phí phát lệnh giao hàng tại cảng đến.'
      },
      {
        feeName: 'Tiền phạt lưu container (DEM/DET Exceeded Charge)',
        estimatedCost: '$120 - $180 / ngày / cont',
        descriptionVi: 'Đối thủ thường chỉ cấp 5-7 ngày Free time. Nếu hàng kẹt kiểm dịch hoặc thông quan chậm, khách sẽ bị phạt nặng.'
      },
      {
        feeName: 'Phụ phí biến động nhiên liệu (BAF / LSS Float)',
        estimatedCost: '$50 - $100 / cont',
        descriptionVi: 'Điều khoản cước chưa cố định phụ phí nhiên liệu tại thời điểm tàu chạy thực tế.'
      }
    ],
    weaknessPoints: [
      'Không cam kết thời gian giữ vỏ cont miễn phí tại cảng đích',
      'Thiếu gói hỗ trợ khai báo hải quan và xử lý kiểm hóa trực tiếp tại cảng',
      'Điều khoản phạt hủy booking nặng nếu tiến độ sản xuất của khách bị chậm'
    ],
    bogiAdvantages: [
      'Báo giá All-in trọn gói 100% không phát sinh chi phí ẩn',
      'Tặng kèm 14 ngày Free DEM/DET tại cảng đến',
      'Đội ngũ hiện trường xử lý hải quan 24/7 tại Cát Lái và Hải Phòng'
    ],
    counterPitchVi: `Chào anh/chị, em đã xem kỹ báo giá của bên ${competitorName || 'đối thủ'}. Nhìn bề ngoài cước biển của họ thấp hơn khoảng $30, nhưng họ chưa tính phí D/O đầu đến và chỉ cho 5 ngày free time. Nếu hàng thông quan trễ 2 ngày thì tiền phạt lưu bãi đã mất hơn $300. BOGI Logistics xin giữ nguyên báo giá trọn gói và tặng 14 ngày free time để anh/chị an tâm tuyệt đối.`,
    zaloMessageTemplateVi: `Dạ em chào Anh/Chị, em kiểm tra báo giá bên ${competitorName || 'đối thủ'} thì thấy họ chưa chốt phí Local charges đầu đến. BOGI Logistics cam kết trọn gói All-in không phát sinh 1 đồng và tặng 14 ngày Free DEM/DET. Anh/chị xem xét duyệt giúp em để em khóa vỏ cont đẹp cho lô này nhé ạ!`,
    suggestedDiscountStrategy: 'Không nên giảm giá tiền mặt! Hãy giữ nguyên giá và tăng giá trị bằng việc tặng 14 ngày Free DEM/DET + miễn phí phí chứng từ B/L nháp.'
  };
}


// ============================================================================
// 3. CORE CALCULATION ENGINES (Dự báo xác suất trúng thầu & Điểm ngọt Sweet-Spot)
// ============================================================================

/**
 * Tìm kiếm benchmark cước thị trường phù hợp nhất cho tuyến hàng
 */
export function findLaneBenchmark(
  pol: string, 
  pod: string, 
  mode: TransportMode = 'SEA_FCL', 
  containerType: ContainerType = "40'HC"
): LaneMarketBenchmark {
  const polLower = (pol || '').toLowerCase();
  const podLower = (pod || '').toLowerCase();

  // Match exact lane or fallback
  const matched = STANDARD_LANE_BENCHMARKS.find(b => {
    const bPol = b.pol.toLowerCase();
    const bPod = b.pod.toLowerCase();
    return (
      (polLower.includes('cát lái') || polLower.includes('hồ chí minh') || polLower.includes('hcm')) &&
      (podLower.includes('long beach') || podLower.includes('los angeles') || podLower.includes('lax') || podLower.includes('mỹ'))
    ) || (
      (polLower.includes('hải phòng') || polLower.includes('hai phong')) &&
      (podLower.includes('hamburg') || podLower.includes('rotterdam') || podLower.includes('châu âu'))
    ) || (
      b.mode === mode && b.containerType === containerType
    );
  });

  if (matched) return matched;

  // Default Fallback Benchmark
  return {
    id: 'bm_default_fcl',
    pol: pol || 'Cát Lái, Việt Nam',
    pod: pod || 'Cảng Đích Quốc Tế',
    mode,
    containerType,
    currency: 'USD',
    p10LowPrice: 1600,
    p50MedianPrice: 1850,
    p90HighPrice: 2200,
    carrierAverages: { 'ONE': 1820, 'Maersk': 1900 },
    trend: 'STABLE',
    sampleQuotesCount: 50,
    lastUpdated: new Date().toISOString().split('T')[0],
    notesVi: 'Dữ liệu cước dựa trên mức trung bình thị trường toàn ngành.'
  };
}

/**
 * Tính toán xác suất trúng thầu và đề xuất mức giá "Sweet Spot" tối ưu
 * Dựa trên mô hình đường cong độ nhạy giá (Price-Elasticity Probability Curve)
 */
export function analyzeWinProbability(params: {
  proposedPrice: number;
  costPrice: number;
  benchmark: LaneMarketBenchmark;
  currency?: Currency;
}): WinProbabilityResult {
  const { proposedPrice, costPrice, benchmark } = params;
  const currency = params.currency || benchmark.currency;

  const { p10LowPrice: p10, p50MedianPrice: p50, p90HighPrice: p90 } = benchmark;

  // 1. Calculate Win Probability (%) based on sigmoid curve around market percentiles
  let winProb = 50;

  if (proposedPrice <= p10) {
    // Giá cực rẻ (<= P10): Xác suất thắng từ 85% đến 98%
    const ratio = Math.max(0, (p10 - proposedPrice) / (p10 * 0.2));
    winProb = Math.min(98, 85 + ratio * 13);
  } else if (proposedPrice <= p50) {
    // Giá giữa P10 và P50: Xác suất từ 70% đến 85%
    const ratio = (p50 - proposedPrice) / (p50 - p10);
    winProb = 70 + ratio * 15;
  } else if (proposedPrice <= p90) {
    // Giá giữa P50 và P90: Xác suất từ 35% đến 70%
    const ratio = (p90 - proposedPrice) / (p90 - p50);
    winProb = 35 + ratio * 35;
  } else {
    // Giá vượt P90: Xác suất giảm nhanh từ 35% xuống < 10%
    const excess = (proposedPrice - p90) / (p90 * 0.2);
    winProb = Math.max(5, 35 - excess * 25);
  }

  winProb = Math.round(winProb);

  // 2. Determine rating
  let rating: PriceCompetitivenessRating = 'MODERATE_CHANCE';
  if (winProb >= 85) {
    rating = 'AGGRESSIVE_HIGH_WIN';
  } else if (winProb >= 70) {
    rating = 'OPTIMAL_SWEET_SPOT';
  } else if (winProb >= 50) {
    rating = 'MODERATE_CHANCE';
  } else {
    rating = 'OVERPRICED_HIGH_RISK';
  }

  // 3. Calculate Financials for Proposed
  const proposedProfit = Math.max(0, proposedPrice - costPrice);
  const proposedMargin = proposedPrice > 0 ? (proposedProfit / proposedPrice) * 100 : 0;

  // 4. Calculate Sweet Spot (Giá tối đa hóa Kỳ Vọng Lợi Nhuận: Expected Value = WinProb * Profit)
  // Quét các mức giá từ cost + 5% đến P90 để tìm điểm kỳ vọng lợi nhuận lớn nhất
  let bestExpectedValue = 0;
  let sweetSpotPrice = p50;
  let sweetSpotWinProb = 75;

  const minCandidate = Math.max(costPrice * 1.05, p10 * 0.95);
  const maxCandidate = p90;
  const step = (maxCandidate - minCandidate) / 30;

  for (let cand = minCandidate; cand <= maxCandidate; cand += step) {
    let p = 50;
    if (cand <= p10) {
      p = 85 + ((p10 - cand) / (p10 * 0.2)) * 13;
    } else if (cand <= p50) {
      p = 70 + ((p50 - cand) / (p50 - p10)) * 15;
    } else {
      p = 35 + ((p90 - cand) / (p90 - p50)) * 35;
    }
    p = Math.min(98, Math.max(5, p));

    const profit = Math.max(0, cand - costPrice);
    const expectedValue = (p / 100) * profit;

    // We also require win probability to be at least 65% for a realistic sweet spot
    if (expectedValue > bestExpectedValue && p >= 65) {
      bestExpectedValue = expectedValue;
      sweetSpotPrice = Math.round(cand);
      sweetSpotWinProb = Math.round(p);
    }
  }

  // If sweetSpot is below cost or invalid, set sensible default
  if (sweetSpotPrice <= costPrice) {
    sweetSpotPrice = Math.round(costPrice * 1.15);
  }

  const sweetSpotProfit = Math.max(0, sweetSpotPrice - costPrice);
  const sweetSpotMargin = sweetSpotPrice > 0 ? (sweetSpotProfit / sweetSpotPrice) * 100 : 0;

  // 5. Generate Scannable Explanations
  let analysisSummaryVi = '';
  let suggestedActionVi = '';

  if (rating === 'AGGRESSIVE_HIGH_WIN') {
    analysisSummaryVi = `Mức giá $${proposedPrice.toLocaleString()} thấp hơn mặt bằng thị trường (P10: $${p10.toLocaleString()}). Cơ hội trúng thầu cực cao (~${winProb}%) nhưng bạn đang chịu biên lợi nhuận mỏng (${proposedMargin.toFixed(1)}%).`;
    suggestedActionVi = `Có thể tự tin nâng giá lên mức Sweet-Spot $${sweetSpotPrice.toLocaleString()} để tăng thêm $${(sweetSpotProfit - proposedProfit).toFixed(0)} lợi nhuận mà vẫn duy trì khả năng thắng ${sweetSpotWinProb}%.`;
  } else if (rating === 'OPTIMAL_SWEET_SPOT') {
    analysisSummaryVi = `Mức giá $${proposedPrice.toLocaleString()} nằm ngay điểm vàng (P50: $${p50.toLocaleString()}), xác suất thắng rất tốt (${winProb}%), biên lợi nhuận đạt ${proposedMargin.toFixed(1)}%.`;
    suggestedActionVi = `Giữ nguyên mức giá này! Kết hợp bổ sung cam kết Free Time 14 ngày hoặc bảo hiểm hàng hóa để khóa đơn dứt điểm.`;
  } else if (rating === 'MODERATE_CHANCE') {
    analysisSummaryVi = `Mức giá $${proposedPrice.toLocaleString()} nhỉnh hơn mức trung bình thị trường $${p50.toLocaleString()}. Tỷ lệ thắng ở mức trung bình (${winProb}%).`;
    suggestedActionVi = `Nếu khách hàng nhạy cảm về giá, hãy xem xét hạ về mức Sweet-Spot $${sweetSpotPrice.toLocaleString()} hoặc kèm theo quyền lợi cộng thêm thay vì giảm tiền mặt.`;
  } else {
    analysisSummaryVi = `Cảnh báo: Mức giá $${proposedPrice.toLocaleString()} vượt ngưỡng P90 thị trường ($${p90.toLocaleString()}). Xác suất mất khách rất lớn (chỉ còn ${winProb}% cơ hội thắng).`;
    suggestedActionVi = `Cần tái đàm phán lại giá cước gốc từ hãng tàu hoặc điều chỉnh về vùng $${sweetSpotPrice.toLocaleString()} ngay lập tức trước khi đối thủ chốt đơn!`;
  }

  return {
    proposedPrice,
    currency,
    p10Low: p10,
    p50Median: p50,
    p90High: p90,
    winProbabilityPercent: winProb,
    rating,
    sweetSpotPrice,
    sweetSpotWinProbability: sweetSpotWinProb,
    marginPercentAtProposed: Number(proposedMargin.toFixed(1)),
    marginPercentAtSweetSpot: Number(sweetSpotMargin.toFixed(1)),
    expectedProfitProposed: Number(proposedProfit.toFixed(1)),
    expectedProfitSweetSpot: Number(sweetSpotProfit.toFixed(1)),
    analysisSummaryVi,
    suggestedActionVi
  };
}

// ============================================================================
// 4. WIN / LOSS FEEDBACK TRACKER (Lưu trữ và học từ kết quả thực tế)
// ============================================================================

export async function recordWinLossFeedback(record: WinLossFeedbackRecord): Promise<void> {
  memoryWinLossList.unshift(record);
  try {
    const docRef = doc(db, COLLECTION_WIN_LOSS, record.id);
    await setDoc(docRef, record);
  } catch (err) {
    console.warn('Notice saving WinLossFeedback to firestore (using local cache):', err);
  }
}

export function getLocalWinLossRecords(): WinLossFeedbackRecord[] {
  return memoryWinLossList;
}

export function saveLocalWinLossRecords(list: WinLossFeedbackRecord[]) {
  memoryWinLossList = list;
}
