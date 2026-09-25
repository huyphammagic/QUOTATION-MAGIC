import { Currency, TransportMode, ContainerType, IncotermCode, QuoteData, CustomerRecord } from './logistics';
import { RateMasterItem, RateSource } from './masterRate';
import { ContractRecord } from './contract';
import { BusinessOpportunity } from './opportunity';

export type DecisionSourceEntity = 'RFQ' | 'QUOTATION' | 'OPPORTUNITY' | 'RATE' | 'RATE_REVIEW' | 'CUSTOMER' | 'STANDALONE';

export interface RFQParameters {
  id?: string;
  customerId: string;
  customerName: string;
  customerCode?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  origin: string;
  destination: string;
  originPort?: string;
  destinationPort?: string;
  mode: TransportMode;
  serviceType: string;
  incoterm: IncotermCode;
  commodity: string;
  containerType?: ContainerType;
  quantity?: number;
  grossWeightKg?: number;
  volumeCbm?: number;
  chargeableWeight?: number;
  expectedShipmentDate?: string;
  requestedValidity?: string;
  specialRequirements?: string;
  targetRate?: number;
  targetCurrency?: Currency;
}

export interface CustomerCommercialContext {
  customerId: string;
  customerName: string;
  customerCode?: string;
  segment?: string;
  salesOwner?: string;
  status: 'ACTIVE' | 'POTENTIAL' | 'DORMANT' | 'INACTIVE';
  paymentTerm?: string;
  creditLimit?: number;
  totalHistoricalQuotes: number;
  totalHistoricalShipments: number;
  lastQuoteDate?: string;
  lastQuotePrice?: number;
  lastQuoteCurrency?: Currency;
  lastShipmentDate?: string;
  openOpportunitiesCount: number;
  openFollowUpsCount: number;
  activeContractsCount: number;
}

export interface LaneHistoricalContext {
  laneKey: string;
  origin: string;
  destination: string;
  mode: TransportMode;
  totalQuotesOnLane: number;
  acceptedQuotesCount: number;
  winRatePercent: number;
  averageMarginPercent: number;
  lastQuotedPrice?: number;
  lastQuotedCurrency?: Currency;
  lastQuotedDate?: string;
  totalShipmentsOnLane: number;
  previousQuotes: {
    id: string;
    quoteNumber: string;
    createdDate: string;
    subtotal: number;
    currency: Currency;
    marginPercent?: number;
    status: string;
    serviceMode?: string;
  }[];
}

export type DecisionRateSource = 
  | 'CUSTOMER_CONTRACT' 
  | 'CARRIER_DIRECT' 
  | 'SUPPLIER_CONTRACT' 
  | 'SPOT_TARIFF' 
  | 'GENERAL_DEFAULT' 
  | 'CUSTOM_ADJUSTED';

export interface DecisionCandidateRate {
  id: string;
  rateType: 'CUSTOMER' | 'CONTRACT' | 'SUPPLIER' | 'GENERAL' | 'SPOT';
  source: DecisionRateSource;
  tier: number; // 1 = highest (Customer Contract), 5 = lowest (General)
  supplierId?: string;
  supplierName?: string;
  carrier?: string;
  origin: string;
  destination: string;
  mode: TransportMode;
  equipment?: string;
  buyCost: number;
  buyCostUsd?: number;
  buyCostVnd?: number;
  currency: Currency;
  validFrom: string;
  validUntil: string;
  contractId?: string;
  contractNumber?: string;
  transitTimeDays?: number;
  freeTimeDays?: number;
  isExpiringSoon?: boolean;
  isExpired?: boolean;
  notes?: string;
}

export interface ScenarioSurcharge {
  id: string;
  code: string;
  name: string;
  amount: number;
  currency: Currency;
  category?: string;
}

export interface DecisionScenario {
  id: string;
  name: string;
  description?: string;
  isBaseline?: boolean;
  mode: TransportMode;
  serviceType: string;
  carrier: string;
  supplierId?: string;
  supplierName?: string;
  rateSource: DecisionRateSource;
  rateId?: string;
  rateVersion?: number;
  currency: Currency;
  buyCost: number;
  sellingPrice: number;
  surcharges: ScenarioSurcharge[];
  totalSurcharges: number;
  discountAmount: number;
  discountPercent: number;
  totalCost: number;
  totalSellingPrice: number;
  grossProfit: number;
  marginPercent: number;
  rateValidUntil?: string;
  quoteValidUntil?: string;
  transitTime?: string;
  freeTime?: string;
  factualTags: ('LOWER_COST' | 'LONGER_VALIDITY' | 'HIGHER_MARGIN' | 'CUSTOMER_CONTRACT' | 'EXPIRING_SOON' | 'HIGH_RISK')[];
  status: 'DRAFT' | 'ACTIVE' | 'SELECTED' | 'REJECTED';
}

export type DecisionRiskSeverity = 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';

export type DecisionRiskCode = 
  | 'RATE_VALIDITY_CONFLICT'
  | 'LOW_MARGIN'
  | 'NEGATIVE_MARGIN'
  | 'EXPIRED_RATE'
  | 'RATE_EXPIRING_SOON'
  | 'MISSING_RATE'
  | 'MISSING_REQUIRED_CHARGE'
  | 'CONTRACT_EXPIRY'
  | 'CUSTOMER_RATE_CONFLICT'
  | 'INCOMPLETE_DATA'
  | 'CURRENCY_MISMATCH'
  | 'HIGH_DISCOUNT';

export interface DecisionRiskItem {
  id: string;
  riskType: DecisionRiskCode;
  severity: DecisionRiskSeverity;
  title: string;
  titleEn: string;
  reason: string;
  reasonEn: string;
  source: string;
  suggestedReview: string;
  suggestedReviewEn: string;
}

export interface DataCompletenessField {
  field: string;
  labelVi: string;
  labelEn: string;
  status: 'COMPLETE' | 'MISSING' | 'OPTIONAL';
  value?: string | number;
  hint?: string;
}

export interface DataCompletenessReport {
  mode: TransportMode;
  serviceType: string;
  completionScore: number; // 0 - 100
  isReadyForQuote: boolean;
  items: DataCompletenessField[];
  missingRequiredKeys: string[];
}

export interface SuggestedNextAction {
  id: string;
  titleVi: string;
  titleEn: string;
  whyVi: string;
  whyEn: string;
  source: string;
  actionType: 
    | 'CONFIRM_RATE_VALIDITY' 
    | 'ADJUST_MARGIN' 
    | 'FILL_MISSING_DATA' 
    | 'SELECT_CONTRACT_RATE' 
    | 'CREATE_DRAFT_QUOTE' 
    | 'CREATE_FOLLOW_UP' 
    | 'REVIEW_CUSTOMER_360';
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  payload?: any;
}

export interface DecisionSnapshot {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  sourceEntity: DecisionSourceEntity;
  sourceEntityId: string;
  baseVersion: number;
  rfq: RFQParameters;
  selectedScenarioId?: string;
  selectedScenario?: DecisionScenario;
  scenarios: DecisionScenario[];
  risks: DecisionRiskItem[];
  completenessScore: number;
  missingData: string[];
  recommendations: SuggestedNextAction[];
  userNotes?: string;
  decisionStatus: 'IN_EVALUATION' | 'SCENARIO_ACCEPTED' | 'QUOTATION_CREATED' | 'DISMISSED';
  createdQuoteId?: string;
  createdQuoteNumber?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentDecisionScenario {
  id: string;
  companyId: string;
  scenarioName: string;
  scenarioStatus: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'SELECTED';
  sourceEntityType: DecisionSourceEntity;
  sourceEntityId: string;
  sourceVersion: number;
  scenarioInputs: RFQParameters;
  scenario: DecisionScenario;
  userNotes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConcurrencyCheckResult {
  hasConflict: boolean;
  sourceType: DecisionSourceEntity;
  sourceId: string;
  recordedVersion: number;
  currentVersion: number;
  messageVi?: string;
  messageEn?: string;
}
