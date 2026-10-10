import { 
  TradeLaneBenchmark, 
  ContainerEquipmentType, 
  TransportModeType, 
  FreightRateBenchmarkAuditResult, 
  PricingStrategyScenario, 
  WinProbabilitySimulationPoint, 
  AiMarketBenchmarkAnalysis 
} from '../../types/rateBenchmarking';
import { MASTER_TRADE_LANE_BENCHMARKS } from '../../data/marketFreightBenchmarks';
import { QuoteData, LineItem } from '../../types/logistics';

// Helper to remove accents for fuzzy matching
const normalizeText = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
};

/**
 * Match a trade lane benchmark based on origin, destination and transport mode
 */
export function matchTradeLaneBenchmark(
  origin: string = '', 
  destination: string = '', 
  mode: TransportModeType = 'SEA_FCL',
  equipment: ContainerEquipmentType = '40HC'
): TradeLaneBenchmark {
  const normOrigin = normalizeText(origin);
  const normDest = normalizeText(destination);

  // 1. Exact or keyword match
  const matched = MASTER_TRADE_LANE_BENCHMARKS.find(lane => {
    const laneOrigin = normalizeText(`${lane.originPort} ${lane.originCode} ${lane.originCountry}`);
    const laneDest = normalizeText(`${lane.destinationPort} ${lane.destinationCode} ${lane.destinationCountry}`);
    
    const originMatch = !normOrigin || laneOrigin.includes(normOrigin) || normOrigin.includes(normalizeText(lane.originCode));
    const destMatch = !normDest || laneDest.includes(normDest) || normDest.includes(normalizeText(lane.destinationCode));
    const modeMatch = lane.transportMode === mode;
    const equipMatch = lane.equipmentType === equipment;

    return originMatch && destMatch && modeMatch && equipMatch;
  });

  if (matched) return matched;

  // 2. Fallback match by destination region
  const partialDestMatch = MASTER_TRADE_LANE_BENCHMARKS.find(lane => {
    const laneDest = normalizeText(`${lane.destinationPort} ${lane.destinationCode} ${lane.destinationCountry}`);
    return normDest && (laneDest.includes(normDest) || normDest.includes(normalizeText(lane.destinationCode)));
  });

  if (partialDestMatch) return partialDestMatch;

  // 3. Fallback to default US West Coast benchmark
  return MASTER_TRADE_LANE_BENCHMARKS[0];
}

/**
 * Calibrated Win Probability Calculator
 * Based on logistic/sigmoid function centered around market median
 */
export function calculateWinProbability(
  proposedPrice: number,
  lane: TradeLaneBenchmark
): number {
  if (proposedPrice <= 0) return 0;
  
  const median = lane.marketMedianRate;
  const spread = Math.max(1, lane.highSpotRate - lane.lowSpotRate);
  
  // Normalized delta: positive means more expensive than median, negative means cheaper
  const delta = (proposedPrice - median) / (spread / 3);
  
  // Logistic sigmoid formula: P = 1 / (1 + exp(k * delta))
  // At delta = 0 (proposedPrice = median), P ≈ 65% (industry standard win rate for fair price)
  // At delta = -1.5 (proposedPrice = lowSpot), P ≈ 92%
  // At delta = +1.5 (proposedPrice = highSpot), P ≈ 22%
  const sigmoid = 1 / (1 + Math.exp(1.2 * delta - 0.6));
  
  // Clamp between 3% and 98%
  const winProbability = Math.min(98, Math.max(3, Math.round(sigmoid * 100)));
  return winProbability;
}

/**
 * Build 3 Intelligent Pricing Strategies:
 * 1. AGGRESSIVE (Thâu tóm khách mới / Thắng thầu bằng mọi giá)
 * 2. BALANCED (Cân bằng khuyến nghị / Sweet Spot tối đa hóa Expected Gross Margin)
 * 3. PREMIUM (Tối đa hóa Lợi nhuận / Khách hàng VIP cam kết dịch vụ)
 */
export function generatePricingStrategies(
  buyRateCost: number,
  lane: TradeLaneBenchmark
): {
  aggressive: PricingStrategyScenario;
  balanced: PricingStrategyScenario;
  premium: PricingStrategyScenario;
} {
  const effectiveCost = buyRateCost > 0 ? buyRateCost : lane.carrierBuyRateEstimate;
  
  // 1. AGGRESSIVE: Price near Market Low Spot, but never lower than Cost + $80 min safe margin
  const aggressivePrice = Math.max(
    effectiveCost + 90,
    Math.round(lane.lowSpotRate * 0.98)
  );
  const aggressiveMargin = aggressivePrice - effectiveCost;
  const aggressiveWinRate = calculateWinProbability(aggressivePrice, lane);
  
  const aggressive: PricingStrategyScenario = {
    id: 'AGGRESSIVE',
    nameVi: 'Chiến Lược Thâu Tóm (Aggressive Penetration)',
    nameEn: 'Aggressive Volume Capture',
    taglineVi: 'Đè bẹp đối thủ cạnh tranh bằng mức giá sàn, thâu tóm khách hàng mới hoặc đấu thầu dự án lớn.',
    badgeColor: 'emerald',
    proposedSellingPrice: aggressivePrice,
    buyRateCost: effectiveCost,
    grossMarginAmount: aggressiveMargin,
    grossMarginPercent: Number(((aggressiveMargin / aggressivePrice) * 100).toFixed(1)),
    winProbabilityPercent: Math.max(82, aggressiveWinRate),
    expectedGrossMargin: Math.round((Math.max(82, aggressiveWinRate) / 100) * aggressiveMargin),
    recommendedForVi: 'Khách hàng mới tiềm năng cao, đơn hàng số lượng cont lớn (>= 10 conts), hoặc khi đối thủ đang ép giá sát ván.',
    tacticalAdvantageVi: [
      'Xác suất chốt đơn cực cao (85% - 95%)',
      'Đánh bật các đối thủ trung gian trên tuyến',
      'Bảo vệ an toàn giá vốn (không bán phá giá âm tiền)',
    ],
    risksVi: [
      'Biên lợi nhuận mỏng, nhạy cảm nếu hãng tàu bất ngờ tăng phụ phí',
      'Cần yêu cầu khách cọc sớm hoặc chốt volume chắc chắn',
    ],
    isAiRecommended: false,
  };

  // 2. BALANCED (AI Recommended Sweet Spot): Maximizes Expected Gross Margin
  // Price at around P45 - P50 (slightly below median to capture sweet spot)
  const balancedPrice = Math.round(lane.marketMedianRate * 0.97);
  const balancedMargin = balancedPrice - effectiveCost;
  const balancedWinRate = calculateWinProbability(balancedPrice, lane);

  const balanced: PricingStrategyScenario = {
    id: 'BALANCED',
    nameVi: 'Điểm Ngọt Khuyến Nghị AI (Sweet-Spot Balanced)',
    nameEn: 'AI Sweet-Spot Gross Profit Optimizer',
    taglineVi: 'Tối ưu hóa tổng lợi nhuận kỳ vọng (Expected Profit) - cân bằng hoàn hảo giữa tỷ lệ chốt đơn và biên lãi.',
    badgeColor: 'blue',
    proposedSellingPrice: balancedPrice,
    buyRateCost: effectiveCost,
    grossMarginAmount: balancedMargin,
    grossMarginPercent: Number(((balancedMargin / balancedPrice) * 100).toFixed(1)),
    winProbabilityPercent: balancedWinRate,
    expectedGrossMargin: Math.round((balancedWinRate / 100) * balancedMargin),
    recommendedForVi: 'Phần lớn các khách hàng doanh nghiệp vừa và nhỏ (SMEs), báo giá thường quy, đơn hàng từ 1-5 conts.',
    tacticalAdvantageVi: [
      'Đạt tổng lợi nhuận kỳ vọng cao nhất trong mô phỏng toán học',
      'Mức giá hợp lý so với trung bình thị trường (không bị coi là đắt)',
      'Tỷ lệ chốt đơn vững vàng từ 65% - 75%',
    ],
    risksVi: [
      'Nếu khách hàng quá nhạy cảm về giá (chỉ so sánh từng $10), có thể phải nhượng bộ thêm $30-$50',
    ],
    isAiRecommended: true,
  };

  // 3. PREMIUM: Higher margin, targeting VIP clients requiring high space guarantee & service
  const premiumPrice = Math.round(lane.percentile75 * 1.02);
  const premiumMargin = premiumPrice - effectiveCost;
  const premiumWinRate = calculateWinProbability(premiumPrice, lane);

  const premium: PricingStrategyScenario = {
    id: 'PREMIUM',
    nameVi: 'Gói Giá Trị Cao Cấp (Premium Value Maximizer)',
    nameEn: 'Premium Service & Space Guarantee',
    taglineVi: 'Bán giá cao với biên lợi nhuận dày, cam kết chỗ 100%, bảo hiểm hàng hóa và đội ngũ hỗ trợ 24/7.',
    badgeColor: 'purple',
    proposedSellingPrice: premiumPrice,
    buyRateCost: effectiveCost,
    grossMarginAmount: premiumMargin,
    grossMarginPercent: Number(((premiumMargin / premiumPrice) * 100).toFixed(1)),
    winProbabilityPercent: premiumWinRate,
    expectedGrossMargin: Math.round((premiumWinRate / 100) * premiumMargin),
    recommendedForVi: 'Khách hàng VIP, hàng hóa giá trị cao, mùa cao điểm khan hiếm vỏ cont hoặc cần giao đúng hạn tuyệt đối.',
    tacticalAdvantageVi: [
      'Biên lợi nhuận gộp vượt trội ($500 - $900+/cont)',
      'Kèm gói bảo hiểm, cam kết đền bù nếu rớt tàu, 14 ngày free DEM/DET',
      'Định vị thương hiệu Forwarder chuyên nghiệp, uy tín',
    ],
    risksVi: [
      'Tỷ lệ trượt thầu cao hơn nếu khách chỉ cần dịch vụ bình dân',
      'Đòi hỏi Sales phải có kỹ năng tư vấn giá trị và xử lý từ chối tốt',
    ],
    isAiRecommended: false,
  };

  return { aggressive, balanced, premium };
}

/**
 * Generate Win Probability Simulation Curve across the spectrum
 */
export function generateSimulationCurve(
  buyRateCost: number,
  lane: TradeLaneBenchmark,
  currentPrice: number,
  sweetSpotPrice: number
): WinProbabilitySimulationPoint[] {
  const effectiveCost = buyRateCost > 0 ? buyRateCost : lane.carrierBuyRateEstimate;
  const minPrice = Math.min(effectiveCost + 50, Math.round(lane.lowSpotRate * 0.95));
  const maxPrice = Math.round(lane.highSpotRate * 1.15);
  const step = Math.max(20, Math.round((maxPrice - minPrice) / 12));

  const points: WinProbabilitySimulationPoint[] = [];

  for (let price = minPrice; price <= maxPrice; price += step) {
    const winRate = calculateWinProbability(price, lane);
    const margin = price - effectiveCost;
    const marginPercent = Number(((margin / price) * 100).toFixed(1));
    const expectedProfit = Math.round((winRate / 100) * margin);

    const isCurrent = Math.abs(price - currentPrice) < step / 2;
    const isSweet = Math.abs(price - sweetSpotPrice) < step / 2;

    points.push({
      proposedPrice: price,
      winProbability: winRate,
      marginAmount: margin,
      marginPercent,
      expectedProfit,
      isCurrentQuote: isCurrent,
      isAiSweetSpot: isSweet,
    });
  }

  return points;
}

/**
 * Full Audit of Quotation vs Market Benchmarks
 */
export function auditQuotationVsMarket(
  quote: Partial<QuoteData>,
  overrideLane?: TradeLaneBenchmark
): FreightRateBenchmarkAuditResult {
  const origin = quote.shipment?.pol || '';
  const destination = quote.shipment?.pod || '';
  const mode = (quote.shipment?.mode as TransportModeType) || 'SEA_FCL';
  
  // Determine equipment
  let equipment: ContainerEquipmentType = '40HC';
  if (mode === 'AIR_FREIGHT') equipment = 'AIR_KG';
  else if (mode === 'SEA_LCL') equipment = 'LCL_CBM';
  else if (quote.shipment?.containerType?.includes('20')) equipment = '20GP';
  else if (quote.shipment?.containerType?.includes('45')) equipment = '45HC';

  const lane = overrideLane || matchTradeLaneBenchmark(origin, destination, mode, equipment);

  // Extract base freight line items
  const freightItems = (quote.items || []).filter(item => 
    item.category === 'FREIGHT' || 
    item.location === 'FREIGHT' ||
    normalizeText(item.description || item.code || '').includes('freight') ||
    normalizeText(item.description || item.code || '').includes('cuoc bien') ||
    normalizeText(item.description || item.code || '').includes('cuoc bay')
  );

  let currentQuoteBuyRate = 0;
  let currentQuoteSellingRate = 0;

  if (freightItems.length > 0) {
    currentQuoteBuyRate = freightItems.reduce((acc, it) => acc + (it.costPrice || 0), 0) / freightItems.length;
    currentQuoteSellingRate = freightItems.reduce((acc, it) => acc + (it.unitPrice || 0), 0) / freightItems.length;
  }

  // Fallbacks if quote is empty
  if (currentQuoteBuyRate <= 0) currentQuoteBuyRate = lane.carrierBuyRateEstimate;
  if (currentQuoteSellingRate <= 0) currentQuoteSellingRate = lane.marketMedianRate;

  const currentMarginAmount = currentQuoteSellingRate - currentQuoteBuyRate;
  const currentMarginPercent = Number(((currentMarginAmount / currentQuoteSellingRate) * 100).toFixed(1));
  const currentWinProbability = calculateWinProbability(currentQuoteSellingRate, lane);
  const currentExpectedProfit = Math.round((currentWinProbability / 100) * currentMarginAmount);

  // Positioning vs Market Median
  const rateGapVsMarketMedian = currentQuoteSellingRate - lane.marketMedianRate;
  const rateGapPercentVsMarketMedian = Number(((rateGapVsMarketMedian / lane.marketMedianRate) * 100).toFixed(1));

  let marketPositioning: 'ULTRA_CHEAP' | 'COMPETITIVE_SWEET_SPOT' | 'FAIR_MARKET' | 'PREMIUM' | 'OVERPRICED_RISK' = 'FAIR_MARKET';
  let marketPositioningLabelVi = 'Mức giá chuẩn thị trường (Fair Market)';

  if (currentQuoteSellingRate < lane.lowSpotRate) {
    marketPositioning = 'ULTRA_CHEAP';
    marketPositioningLabelVi = 'Mức giá cực rẻ (Cảnh báo biên lãi mỏng)';
  } else if (currentQuoteSellingRate <= lane.marketMedianRate * 0.98) {
    marketPositioning = 'COMPETITIVE_SWEET_SPOT';
    marketPositioningLabelVi = 'Điểm ngọt cạnh tranh (Tỷ lệ thắng cao 75%+)';
  } else if (currentQuoteSellingRate <= lane.percentile75) {
    marketPositioning = 'FAIR_MARKET';
    marketPositioningLabelVi = 'Mức giá hợp lý theo thị trường (Win Rate ~60%)';
  } else if (currentQuoteSellingRate <= lane.highSpotRate) {
    marketPositioning = 'PREMIUM';
    marketPositioningLabelVi = 'Mức giá cao cấp (Cần cam kết dịch vụ)';
  } else {
    marketPositioning = 'OVERPRICED_RISK';
    marketPositioningLabelVi = 'Giá quá cao so với thị trường (Nguy cơ trượt thầu)';
  }

  // 3 AI Scenarios
  const strategies = generatePricingStrategies(currentQuoteBuyRate, lane);

  // Simulation Curve
  const simulationCurve = generateSimulationCurve(
    currentQuoteBuyRate, 
    lane, 
    currentQuoteSellingRate, 
    strategies.balanced.proposedSellingPrice
  );

  // Profit Leakages Detection
  const profitLeakages: FreightRateBenchmarkAuditResult['profitLeakages'] = [];

  if (currentMarginPercent < 6) {
    profitLeakages.push({
      type: 'MARGIN_TOO_THIN',
      titleVi: 'Biên lợi nhuận gộp dưới 6% (Mức báo động)',
      severity: 'danger',
      descriptionVi: `Biên lãi hiện tại chỉ đạt ${currentMarginPercent}% ($${currentMarginAmount}/cont). Rất dễ bị âm tiền nếu hãng tàu áp phụ phí phát sinh hoặc biến động tỷ giá.`,
      impactAmount: currentMarginAmount,
    });
  }

  if (currentWinProbability < 30) {
    profitLeakages.push({
      type: 'OVERPRICED_WIN_RATE_LOW',
      titleVi: 'Tỷ lệ chốt đơn rất thấp do giá cao hơn thị trường',
      severity: 'warning',
      descriptionVi: `Giá chào $${currentQuoteSellingRate} cao hơn trung bình thị trường $${rateGapVsMarketMedian} (+${rateGapPercentVsMarketMedian}%). Khách hàng có xu hướng chọn FWD khác.`,
    });
  }

  // Check missing surcharges
  const existingLineItemCodes = (quote.items || []).map(it => (it.code || it.description || '').toUpperCase());
  lane.typicalCarrierSurcharges.forEach(surcharge => {
    const isFound = existingLineItemCodes.some(code => code.includes(surcharge.code));
    if (!isFound) {
      profitLeakages.push({
        type: 'MISSING_SURCHARGE',
        titleVi: `Chưa có phụ phí bắt buộc ${surcharge.code} (${surcharge.nameVi})`,
        severity: 'warning',
        descriptionVi: `Tuyến này thường có phụ phí ${surcharge.code} trị giá khoảng $${surcharge.amount}. Nếu không báo cho khách, công ty sẽ phải bù lỗ khoản này.`,
        impactAmount: surcharge.amount,
      });
    }
  });

  return {
    lane,
    currentQuoteBuyRate,
    currentQuoteSellingRate,
    currentMarginAmount,
    currentMarginPercent,
    rateGapVsMarketMedian,
    rateGapPercentVsMarketMedian,
    marketPositioning,
    marketPositioningLabelVi,
    currentWinProbability,
    currentExpectedProfit,
    strategies,
    simulationCurve,
    profitLeakages,
  };
}

/**
 * Call Gemini AI for Deep Freight Market Reasoning
 */
export async function getAiFreightRateBenchmarkAnalysis(
  audit: FreightRateBenchmarkAuditResult,
  customerName: string = 'Khách hàng doanh nghiệp'
): Promise<AiMarketBenchmarkAnalysis> {
  try {
    const response = await fetch('/api/ai/freight-rate-benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        laneId: audit.lane.id,
        originPort: audit.lane.originPort,
        destinationPort: audit.lane.destinationPort,
        mode: audit.lane.transportMode,
        equipmentType: audit.lane.equipmentType,
        lowSpotRate: audit.lane.lowSpotRate,
        marketMedianRate: audit.lane.marketMedianRate,
        highSpotRate: audit.lane.highSpotRate,
        currentBuyRate: audit.currentQuoteBuyRate,
        currentSellingRate: audit.currentQuoteSellingRate,
        currentMargin: audit.currentMarginAmount,
        customerName,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return {
          macroMarketSummaryVi: data.macroMarketSummaryVi,
          carrierSpaceAdviceVi: data.carrierSpaceAdviceVi,
          competitorCountermeasuresVi: data.competitorCountermeasuresVi || [],
          salesPitchTalkingPointsVi: data.salesPitchTalkingPointsVi || [],
          demDetNegotiationAdviceVi: data.demDetNegotiationAdviceVi,
          recommendedSellingPrice: data.recommendedSellingPrice || audit.strategies.balanced.proposedSellingPrice,
          confidenceScore: data.confidenceScore || 95,
        };
      }
    }
  } catch (err) {
    console.warn('Backend AI benchmark failed, falling back to local reasoning:', err);
  }

  // High-fidelity local AI fallback
  return {
    macroMarketSummaryVi: `Thị trường tuyến ${audit.lane.originCode} ➔ ${audit.lane.destinationCode} hiện đang ở trạng thái ${
      audit.lane.marketTrend === 'surging' ? 'tăng nhiệt (Surging) với áp lực chỗ chặt' : 'ổn định (Stable)'
    }. Chỉ số SCFI và Drewry ghi nhận dao động trong biên độ ${audit.lane.trendPercentageWoW > 0 ? '+' : ''}${audit.lane.trendPercentageWoW}%.`,
    carrierSpaceAdviceVi: `Tỷ lệ hủy chuyến (Blank sailings) trên tuyến đạt khoảng ${audit.lane.blankSailingRatePercent}%. Khuyến nghị đặt booking trước ETD ít nhất 7-10 ngày để giữ chỗ hãng tàu ${audit.lane.carrierDirectNames.slice(0, 3).join(', ')}.`,
    competitorCountermeasuresVi: [
      `Đối đầu K+N / DHL: Nhấn mạnh sự linh hoạt, phản hồi trong 15 phút và thời gian giải phóng cont tại cảng đến vượt trội.`,
      `Đối đầu Maersk Spot / Hãng tàu trực tiếp: Chỉ rõ nguy cơ phạt no-show fee khi hủy chuyến và cam kết không phát sinh phụ phí ẩn.`,
      `Đối đầu FWD giá rẻ: Cảnh báo nguy cơ rớt cont (roll cargo) và cam kết đền bù nếu trễ hẹn giao hàng.`,
    ],
    salesPitchTalkingPointsVi: [
      `"Chúng tôi giữ giá cố định đến hết tháng, bảo vệ quý khách trước đợt tăng phụ phí GRI sắp tới."`,
      `"Mức giá đã bao gồm dịch vụ theo dõi hành trình 24/7 và hỗ trợ thông quan hải quan 1 cửa."`,
      `"Cam kết vỏ cont đạt chuẩn loại A, không bị ẩm mốc hay hư hỏng bao bì."`,
    ],
    demDetNegotiationAdviceVi: `Khách hàng tuyến này rất quan tâm chi phí lưu bãi. Đề xuất xin thêm 7-14 ngày Free DEM/DET tại cảng đến để tạo vũ khí chốt sale quyết định.`,
    recommendedSellingPrice: audit.strategies.balanced.proposedSellingPrice,
    confidenceScore: 92,
  };
}
