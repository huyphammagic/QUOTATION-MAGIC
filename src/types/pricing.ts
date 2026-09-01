import { Currency, FeeCategory, ChargeLocation, TransportMode, ContainerType } from './logistics';

export type ChargeBasis = 
  | 'PER_SHIPMENT'
  | 'PER_CONTAINER'
  | 'PER_BL'
  | 'PER_DOCUMENT'
  | 'PER_TRUCK'
  | 'PER_TRIP'
  | 'PER_KG'
  | 'PER_CHARGEABLE_KG'
  | 'PER_CBM'
  | 'PER_WM'
  | 'PER_PACKAGE'
  | 'PER_PALLET'
  | 'PER_CARTON'
  | 'PER_UNIT'
  | 'PERCENTAGE'
  | 'FIXED';

export type PercentageBase = 
  | 'FREIGHT' 
  | 'OCEAN_FREIGHT' 
  | 'AIR_FREIGHT' 
  | 'TOTAL_ORIGIN' 
  | 'TOTAL_DESTINATION' 
  | 'SUBTOTAL' 
  | 'CUSTOMS' 
  | 'TRUCKING';

export interface PricingConfig {
  airVolumetricDivisor: number; // default 6000 (IATA standard)
  lclCbmToTonRatio: number;      // default 1000 (1 CBM = 1000 KGS = 1 Ton)
  defaultExchangeRate: number;   // default e.g. 25400
  roundingPolicy: {
    usdDecimals: number;         // 2
    vndDecimals: number;         // 0
  };
}

export interface CalculatedLineItem {
  id: string;
  category: FeeCategory;
  location: ChargeLocation;
  code: string;
  description: string;
  basis: ChargeBasis;
  percentageBase?: PercentageBase;
  percentageRate?: number;
  
  // Quantities & Units
  quantity: number;
  effectiveQuantity: number;
  unit: string;
  
  // Currency & Rates
  currency: Currency;
  exchangeRate: number;
  
  // Prices
  costPrice: number;       // Giá vốn đơn vị
  unitPrice: number;       // Giá bán đơn vị (Selling unit price)
  
  // Tax
  vatRate: number;         // 0, 5, 8, 10, etc.
  vatAmountUsd: number;
  vatAmountVnd: number;
  
  // Line Totals
  costTotalUsd: number;
  costTotalVnd: number;
  amountUsd: number;       // Sell Total before VAT in USD
  amountVnd: number;       // Sell Total before VAT in VND
  totalWithVatUsd: number; // Sell Total + VAT in USD
  totalWithVatVnd: number; // Sell Total + VAT in VND
  
  // Profitability
  profitUsd: number;       // Sell USD - Cost USD
  profitVnd: number;       // Sell VND - Cost VND
  marginPercent: number;   // (Profit / Sell) * 100
  
  note?: string;
}

export interface GroupPricingBreakdown {
  label: string;
  count: number;
  costUsd: number;
  costVnd: number;
  sellUsd: number;
  sellVnd: number;
  profitUsd: number;
  profitVnd: number;
  marginPercent: number;
  vatUsd: number;
  vatVnd: number;
  grandTotalUsd: number;
  grandTotalVnd: number;
}

export interface QuotePricingSummary {
  // Selling (Doanh thu)
  subtotalUsd: number;
  subtotalVnd: number;
  vatTotalUsd: number;
  vatTotalVnd: number;
  grandTotalUsd: number;
  grandTotalVnd: number;
  
  // Cost (Giá vốn)
  totalCostUsd: number;
  totalCostVnd: number;
  
  // Profit & Margin (Lợi nhuận)
  totalProfitUsd: number;
  totalProfitVnd: number;
  overallMarginPercent: number;
  
  // By Leg / Location Breakdown
  byLocation: {
    pol: GroupPricingBreakdown;
    freight: GroupPricingBreakdown;
    pod: GroupPricingBreakdown;
    other: GroupPricingBreakdown;
  };
  
  // By Category Breakdown
  byCategory: {
    freight: GroupPricingBreakdown;
    localCharge: GroupPricingBreakdown;
    surcharge: GroupPricingBreakdown;
    customs: GroupPricingBreakdown;
    trucking: GroupPricingBreakdown;
    handling: GroupPricingBreakdown;
    other: GroupPricingBreakdown;
  };
  
  // Chargeable weight / metrics computed
  metrics: {
    grossWeightKg: number;
    volumeCbm: number;
    chargeableWeight: number;
    airVolumetricWeightKg: number;
    lclWmFactor: number;
    containerCount: number;
  };
}

export interface ValidationError {
  itemId?: string;
  field: string;
  messageVi: string;
  messageEn: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}
