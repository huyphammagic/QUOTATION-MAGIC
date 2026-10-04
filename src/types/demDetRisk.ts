/**
 * Logistics Quotation Management Platform - Phase 60 (Lựa Chọn 4)
 * AI Container Free-Time (DEM/DET) Cost Optimizer & Port Congestion Risk Radar
 * Bộ Tính Phí Lưu Bãi Lũy Tiến, Ma Trận Free-Time Hãng Tàu & Radar Kẹt Cảng Biển
 */

export interface DemDetProgressiveTier {
  tierLabel: string;
  dayFrom: number;
  dayTo: number; // e.g. 999 for infinity
  dailyRateUsd20: number;
  dailyRateUsd40: number;
  dailyRateUsd40Hc: number;
  dailyRateUsdReefer: number;
}

export interface CarrierFreeTimePolicy {
  carrierCode: string;
  carrierName: string;
  logoColor: string;
  standardCombinedDays: number; // Total Free Days (Demurrage + Detention)
  standardDemurrageDays: number; // Free days at terminal/quay
  standardDetentionDays: number; // Free days at customer factory/warehouse
  reeferFreeDays: number;
  specialTierNegotiableDays: number; // Max days forwarder can request with letter of guarantee
  favorableLanesVi: string;
  termsSummaryVi: string;
  penaltyTiers: DemDetProgressiveTier[];
}

export interface DemDetSimulationInput {
  containerType: '20GP' | '40GP' | '40HC' | '20RF' | '40RF';
  quantity: number;
  freeDaysGranted: number;
  expectedStorageDays: number;
  carrierCode: string;
  portCode: string;
  dailyCargoDelayValueUsd?: number;
}

export interface DemDetTierCalculationBreakdown {
  tierName: string;
  billableDays: number;
  ratePerDayUsd: number;
  subtotalUsd: number;
}

export interface DemDetSimulationResult {
  carrierCode: string;
  carrierName: string;
  containerType: string;
  quantity: number;
  freeDaysGranted: number;
  expectedStorageDays: number;
  overdueDays: number;
  totalDemDetFeeUsd: number;
  costBreakdownByTier: DemDetTierCalculationBreakdown[];
  riskLevel: 'SAFE' | 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  potentialSavingsWithExtra7DaysUsd: number;
  recommendationVi: string;
  customerAdviceBulletPoints: string[];
}

export interface PortCongestionIndicator {
  portCode: string;
  portNameVi: string;
  country: string;
  region: 'VIETNAM' | 'US_WEST_COAST' | 'EUROPE' | 'INTRA_ASIA';
  waitingTimeDays: number; // Average anchor waiting time
  yardDensityPercent: number; // Terminal yard utilization rate (60% - 95%)
  vesselQueueCount: number;
  congestionLevel: 'SMOOTH' | 'MODERATE' | 'HEAVY' | 'SEVERE';
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING';
  lastUpdated: string;
  impactOnFreeTimeRiskVi: string;
  recommendedAlternativePortVi?: string;
  opsMitigationAdviceVi: string;
}

export interface FreeTimeValueWeaponPitch {
  pitchTitleVi: string;
  targetCustomer: string;
  route: string;
  offeredFreeDays: number;
  marketStandardFreeDays: number;
  guaranteedSavingsUsd: number;
  salesPitchParagraphVi: string;
  contractClauseSnippetVi: string;
}
