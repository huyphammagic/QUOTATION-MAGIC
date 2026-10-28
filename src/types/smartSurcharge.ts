import { FeeCategory, ChargeLocation, ChargeBasis, Currency, TransportMode } from './logistics';

export type SurchargeConfidence = 'MANDATORY' | 'HIGH' | 'RECOMMENDED';

export interface SmartSurchargeSuggestion {
  id: string;
  code: string;
  nameVi: string;
  nameEn: string;
  category: FeeCategory;
  location: ChargeLocation;
  transportMode: TransportMode | 'ALL';
  basis: ChargeBasis;
  unit: string;
  suggestedUnitPrice: number;
  suggestedCostPrice: number;
  currency: Currency;
  vatRate: number;
  confidence: SurchargeConfidence;
  categoryTag: 'FUEL' | 'PEAK_SEASON' | 'SECURITY' | 'REGULATORY' | 'TERMINAL' | 'WAR_RISK' | 'EQUIPMENT' | 'INLAND';
  reasonVi: string;
  marketNoteVi?: string;
  regulatoryRef?: string;
  estimatedTotalUsd: number;
  estimatedTotalVnd: number;
  isAlreadyAdded: boolean;
}

export interface SmartRouteAnalysis {
  originCountry: string;
  originRegion: 'VIETNAM' | 'ASIA' | 'NORTH_AMERICA' | 'EUROPE' | 'OTHER';
  destinationCountry: string;
  destinationRegion: 'VIETNAM' | 'ASIA' | 'NORTH_AMERICA' | 'EUROPE' | 'OTHER';
  tradeLane: 'TRANSPACIFIC' | 'ASIA_EUROPE' | 'INTRA_ASIA' | 'DOMESTIC_VN' | 'TRANSATLANTIC' | 'GLOBAL';
  isExportFromVietnam: boolean;
  isImportToVietnam: boolean;
  isPeakSeasonActive: boolean;
  peakSeasonName?: string;
  mode: TransportMode;
}

export interface SmartSurchargeAnalysis {
  routeAnalysis: SmartRouteAnalysis;
  suggestions: SmartSurchargeSuggestion[];
  totalPotentialRevenueUsd: number;
  totalPotentialRevenueVnd: number;
  unappliedCount: number;
  mandatoryCount: number;
  summaryPitchVi: string;
}
