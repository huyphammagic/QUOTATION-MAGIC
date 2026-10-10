export type TransportModeType = 'SEA_FCL' | 'SEA_LCL' | 'AIR_FREIGHT' | 'INLAND_TRUCKING';

export type ContainerEquipmentType = '20GP' | '40GP' | '40HC' | '45HC' | '20RF' | '40RF' | 'LCL_CBM' | 'AIR_KG';

export type MarketTrendDirection = 'surging' | 'softening' | 'stable' | 'volatile';

export type SpaceTightnessLevel = 'tight' | 'moderate' | 'surplus' | 'critical';

export interface MarketIndexItem {
  code: string;
  name: string;
  source: string;
  latestValue: number;
  unit: string;
  changeRateWoW: number; // Week-over-week % (e.g. +3.4% or -1.8%)
  lastUpdated: string;
  descriptionVi: string;
}

export interface CompetitorRateProfile {
  id: string;
  competitorName: string;
  category: 'GLOBAL_TOP_FWD' | 'REGIONAL_TIER1' | 'SHIPPING_LINE_DIRECT' | 'LOCAL_DISCOUNTER';
  estimatedRate: number; // USD per container/CBM/KG
  transitDays: number;
  spaceGuarantee: 'GUARANTEED' | 'STANDBY' | 'NORMAL';
  freeDemDetDays: number;
  notesVi: string;
}

export interface HistoricalRatePoint {
  weekLabel: string; // e.g. "W-11", "W-10", ... "Hiện tại"
  date: string;
  scfiIndex: number;
  marketMedianSpot: number;
  marketLowSpot: number;
  marketHighSpot: number;
  ourCompanyRate?: number;
}

export interface TradeLaneBenchmark {
  id: string;
  originPort: string;
  originCode: string;
  originCountry: string;
  destinationPort: string;
  destinationCode: string;
  destinationCountry: string;
  transportMode: TransportModeType;
  equipmentType: ContainerEquipmentType;
  currency: string;
  
  // Market Spot Rate Ranges (USD)
  lowSpotRate: number;        // P10: Mức sàn / giá thấp nhất thị trường
  percentile25: number;       // P25: Cận dưới
  marketMedianRate: number;   // P50: Giá trung bình / Benchmark chuẩn
  percentile75: number;       // P75: Cận trên
  highSpotRate: number;       // P90: Mức trần / Giá mùa cao điểm
  
  // Carrier Costs (Ước tính giá vốn mua hãng tàu - Buy Rate chuẩn)
  carrierBuyRateEstimate: number; 
  typicalCarrierSurcharges: {
    code: string;
    nameVi: string;
    amount: number;
    currency: string;
  }[];

  // Market Intelligence
  marketTrend: MarketTrendDirection;
  trendPercentageWoW: number;
  spaceTightness: SpaceTightnessLevel;
  blankSailingRatePercent: number; // e.g. 15% chuyến bị hủy
  carrierDirectNames: string[]; // e.g. ["ONE", "Maersk", "Cosco", "Evergreen", "Hapag-Lloyd"]

  // Competitor Landscape
  competitors: CompetitorRateProfile[];

  // 12-Week Historical Trend
  historicalTrend: HistoricalRatePoint[];

  // Strategic AI Notes & Geo Risks
  geopoliticalNotesVi: string;
  negotiationTipsVi: string[];
}

export interface PricingStrategyScenario {
  id: 'AGGRESSIVE' | 'BALANCED' | 'PREMIUM';
  nameVi: string;
  nameEn: string;
  taglineVi: string;
  badgeColor: string; // 'emerald' | 'blue' | 'purple'
  
  proposedSellingPrice: number;
  buyRateCost: number;
  grossMarginAmount: number;
  grossMarginPercent: number;
  
  winProbabilityPercent: number; // 0 - 100%
  expectedGrossMargin: number;   // winProbability * grossMarginAmount
  
  recommendedForVi: string;
  tacticalAdvantageVi: string[];
  risksVi: string[];
  isAiRecommended: boolean;
}

export interface WinProbabilitySimulationPoint {
  proposedPrice: number;
  winProbability: number; // 0 - 100%
  marginAmount: number;
  marginPercent: number;
  expectedProfit: number; // winProbability * marginAmount
  isCurrentQuote: boolean;
  isAiSweetSpot: boolean;
}

export interface FreightRateBenchmarkAuditResult {
  lane: TradeLaneBenchmark;
  currentQuoteBuyRate: number;
  currentQuoteSellingRate: number;
  currentMarginAmount: number;
  currentMarginPercent: number;
  
  // Status vs Market Median
  rateGapVsMarketMedian: number;      // SellingRate - MarketMedian
  rateGapPercentVsMarketMedian: number;
  marketPositioning: 'ULTRA_CHEAP' | 'COMPETITIVE_SWEET_SPOT' | 'FAIR_MARKET' | 'PREMIUM' | 'OVERPRICED_RISK';
  marketPositioningLabelVi: string;
  
  currentWinProbability: number; // 0 - 100%
  currentExpectedProfit: number;
  
  // 3 AI Scenarios
  strategies: {
    aggressive: PricingStrategyScenario;
    balanced: PricingStrategyScenario; // AI Recommended
    premium: PricingStrategyScenario;
  };
  
  // Simulation Curve (Points from lowSpot to highSpot)
  simulationCurve: WinProbabilitySimulationPoint[];
  
  // Alerts & Surcharge leakages
  profitLeakages: {
    type: 'MISSING_SURCHARGE' | 'MARGIN_TOO_THIN' | 'OVERPRICED_WIN_RATE_LOW' | 'CARRIER_GRI_RISK';
    titleVi: string;
    severity: 'warning' | 'danger' | 'info';
    descriptionVi: string;
    impactAmount?: number;
  }[];
}

export interface AiMarketBenchmarkAnalysis {
  macroMarketSummaryVi: string;
  carrierSpaceAdviceVi: string;
  competitorCountermeasuresVi: string[];
  salesPitchTalkingPointsVi: string[];
  demDetNegotiationAdviceVi: string;
  recommendedSellingPrice: number;
  confidenceScore: number;
}
