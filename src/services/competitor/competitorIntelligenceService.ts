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
// 2. COMPETITOR PROFILES & BATTLE TACTICS (Hồ sơ đối thủ cạnh tranh)
// ============================================================================
export const STANDARD_COMPETITORS: CompetitorProfile[] = [
  {
    id: 'comp_maersk_direct',
    name: 'Maersk Spot Direct',
    code: 'MAERSK_SPOT',
    tier: 'DIRECT_CARRIER',
    strongLanes: ['Hồ Chí Minh -> Long Beach', 'Hải Phòng -> Rotterdam'],
    typicalDiscountPercent: -3, // Rẻ hơn khoảng 3% nếu đặt online không qua fwd
    strengths: [
      'Thương hiệu số 1 toàn cầu, đặt chỗ online tự động',
      'Cam kết giữ chỗ (Loading Guarantee) nếu mua gói đắt tiền'
    ],
    weaknesses: [
      'Không hỗ trợ khai báo hải quan hay trucking nội địa trọn gói',
      'Phạt hủy booking cực nặng (Cancellation fee $300-$500/cont)',
      'Không bao giờ cấp thêm Free Time DEM/DET quá 7 ngày'
    ],
    winningCounterTactics: [
      'Nhấn mạnh vào dịch vụ Door-to-Door trọn gói (Hải quan + Trucking + Kho)',
      'Tặng 14 ngày Free Time DEM/DET (Maersk chỉ cho 5-7 ngày, tiền phạt lưu cont $150/ngày)',
      'Hỗ trợ linh hoạt dời ngày tàu mà không bị phạt tiền cọc nặng'
    ]
  },
  {
    id: 'comp_kn_global',
    name: 'Kuehne + Nagel (K&N)',
    code: 'KN_GLOBAL',
    tier: 'TIER_1_GLOBAL',
    strongLanes: ['Hồ Chí Minh -> Châu Âu', 'Hải Phòng -> Mỹ'],
    typicalDiscountPercent: 8, // Giá thường cao hơn thị trường 5-10%
    strengths: [
      'Hệ thống công nghệ theo dõi myKN vượt trội',
      'Mạng lưới đại lý toàn cầu phủ 100+ quốc gia'
    ],
    weaknesses: [
      'Phí Local Charges và phụ phí hồ sơ rất cao',
      'Quy trình xử lý nội bộ cồng kềnh, phản hồi báo giá chậm',
      'Không chăm sóc tận tình các khách hàng vừa và nhỏ (SME)'
    ],
    winningCounterTactics: [
      'Chứng minh tổng chi phí All-in của chúng ta tiết kiệm hơn $200-$300 nhờ phụ phí minh bạch',
      'Phản hồi nhanh trong 15 phút, có nhân sự chăm sóc 1-1 trực tiếp qua Zalo/Phone',
      'Linh hoạt điều chỉnh công nợ thanh toán 30 ngày'
    ]
  },
  {
    id: 'comp_local_bee',
    name: 'Bee Logistics / Sotrans',
    code: 'TOP_LOCAL',
    tier: 'TOP_LOCAL_FORWARDER',
    strongLanes: ['Hồ Chí Minh -> Mỹ', 'Nội Á (Intra-Asia)'],
    typicalDiscountPercent: -2,
    strengths: [
      'Mối quan hệ nội địa tốt, hệ thống kho bãi & xe đầu kéo mạnh',
      'Giá cước cạnh tranh sát ván trên các tuyến truyền thống'
    ],
    weaknesses: [
      'Đại lý đầu nước ngoài (Mỹ/Âu) đôi khi chậm chạp giải quyết sự cố',
      'Công nghệ báo giá và tracking chưa tối ưu cho khách hàng'
    ],
    winningCounterTactics: [
      'Cung cấp Customer Portal trực tuyến có tracking live và e-Sign hiện đại',
      'Cam kết đại lý nước ngoài bản địa xử lý thủ tục thông quan nhập khẩu trong 24h',
      'Đưa ra gói bảo hiểm hàng hóa All-Risks tặng kèm'
    ]
  },
  {
    id: 'comp_budget_fwd',
    name: 'Nhóm Forwarder Phá Giá (Budget Forwarders)',
    code: 'BUDGET_FWD',
    tier: 'BUDGET_FORWARDER',
    strongLanes: ['Tất cả các tuyến phổ thông'],
    typicalDiscountPercent: -7, // Thường báo rẻ hơn $50-$100
    strengths: [
      'Báo giá cước biển (Ocean Freight) cực rẻ để câu khách'
    ],
    weaknesses: [
      'Phụ phí ẩn (Hidden fees) khi hàng đến cảng đích cắt cổ khách mua',
      'Dễ bị rớt cont (Roll container) vào mùa cao điểm vì không có hợp đồng khối lượng',
      'Dịch vụ khách hàng kém khi phát sinh hư hỏng hoặc trễ hạn'
    ],
    winningCounterTactics: [
      'Cảnh báo khách hàng về "Bẫy cước rẻ nhưng phụ phí ẩn ở cảng đến"',
      'Cam kết cam kết hợp đồng không phát sinh chi phí All-in rõ ràng',
      'Bảo đảm chỗ 100% không bị rớt hàng ngay cả cao điểm'
    ]
  }
];

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
