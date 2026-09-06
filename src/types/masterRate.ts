import { Currency, FeeCategory, ChargeLocation, TransportMode, ContainerType, IncotermCode } from './logistics';
import { ChargeBasis } from './pricing';

export type MasterRateStatus = 
  | 'DRAFT' 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'ACTIVE' 
  | 'EXPIRED' 
  | 'SUSPENDED' 
  | 'CANCELLED'
  | 'INACTIVE';

export type RateType = 
  | 'BUY' 
  | 'SELL' 
  | 'REFERENCE' 
  | 'CONTRACT' 
  | 'SPOT' 
  | 'CUSTOMER_CONTRACT' 
  | 'SUPPLIER_RATE' 
  | 'CARRIER_RATE';

export type MasterShipmentType = 'FCL' | 'LCL' | 'AIR' | 'TRUCK' | 'CUSTOMS' | 'LOCAL_CHARGE' | 'OTHER';

export type ServiceType = 
  | 'OCEAN_FCL' 
  | 'OCEAN_LCL' 
  | 'AIR' 
  | 'TRUCKING' 
  | 'CUSTOMS' 
  | 'LOCAL_CHARGE' 
  | 'WAREHOUSE' 
  | 'DOCUMENTATION' 
  | 'OTHER';

export type RateSource = 'CARRIER' | 'SUPPLIER' | 'AGENT' | 'CONTRACT' | 'MANUAL' | 'IMPORTED' | 'SYSTEM';

export type SupplierType = 
  | 'CARRIER' 
  | 'TRUCKING' 
  | 'CUSTOMS_BROKER' 
  | 'CO-LOADER' 
  | 'OVERSEAS_AGENT' 
  | 'WAREHOUSE' 
  | 'OTHER';

export interface SupplierItem {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: SupplierType;
  country: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  isPreferred?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarrierItem {
  id: string;
  companyId: string;
  code: string;
  name: string;
  mode: 'OCEAN' | 'AIR' | 'TRUCK';
  country?: string;
  scacCode?: string;
  iataCode?: string;
  website?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  isPreferred?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChargeMasterItem {
  id: string;
  companyId?: string;
  chargeCode: string;           // E.g. THC, OFR, BL_FEE, CFS, SEAL, CUSTOMS_DEC, TRUCKING
  chargeName: string;           // Tên tiếng Việt (e.g. Phí Xếp Dỡ Cảng)
  chargeNameEn: string;         // English Name (e.g. Terminal Handling Charge)
  category: FeeCategory;        // FREIGHT | LOCAL_CHARGE | SURCHARGE | CUSTOMS | TRUCKING | HANDLING | OTHER
  transportMode: TransportMode | 'ALL';
  location: ChargeLocation;     // POL | FREIGHT | POD | OTHER
  defaultBasis: ChargeBasis;    // PER_CONTAINER | PER_BL | PER_WM | PER_CHARGEABLE_KG | etc.
  defaultUnit: string;          // Container, Bill, Set, CBM, KGS, Trip, Shipment
  defaultCurrency: Currency;    // USD | VND
  taxable: boolean;             // Có chịu thuế VAT hay không
  defaultVatRate: number;       // 0, 5, 8, 10
  description?: string;         // Diễn giải chi tiết nghiệp vụ
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface RateWeightBreak {
  minWeightKg: number;
  maxWeightKg?: number;
  ratePerKg: number;
  label: string; // e.g. "-45KG", "+45KG", "+100KG", "+300KG", "+500KG", "+1000KG"
}

export type SurchargeCalculationType = 
  | 'FIXED' 
  | 'PER_CONTAINER' 
  | 'PER_BL' 
  | 'PER_SHIPMENT' 
  | 'PER_KG' 
  | 'PER_CBM' 
  | 'PER_WM'
  | 'PERCENTAGE';

export interface RateSurchargeItem {
  id?: string;
  code: string;            // E.g. BAF, CAF, THC, LSS, EBS, DOC, AMS, ENS, ISPS
  name: string;            // Phụ phí (e.g. Bunker Adjustment Factor)
  type: SurchargeCalculationType;
  amount: number;
  currency: Currency;
  unit?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  applicableCondition?: string; // e.g. 'All 20/40 cont', 'Peak Season', 'US Destination'
}

export interface RateMasterItem {
  id: string;
  companyId?: string;           // Multi-tenant company isolation
  rateIdentityKey?: string;     // Unique canonical hash for deduplication and overlap prevention
  rateCode: string;             // E.g. RATE-MSC-CATLAI-LAX-40HC-01
  rateName: string;             // E.g. Cước Biển MSC Tuyến Cát Lái - Los Angeles
  rateType: RateType;           // BUY | SELL | REFERENCE | CONTRACT | SPOT | CUSTOMER_CONTRACT | SUPPLIER_RATE | CARRIER_RATE
  serviceType?: ServiceType;    // OCEAN_FCL | OCEAN_LCL | AIR | TRUCKING | etc.
  chargeId?: string;            // Link to ChargeMasterItem if available
  chargeCode: string;           // E.g. OFR, THC, BL, etc.
  chargeName: string;           // Tên khoản phí
  category: FeeCategory;        // FREIGHT, LOCAL_CHARGE, SURCHARGE, CUSTOMS, TRUCKING, HANDLING
  chargeType: string;           // BASE_FREIGHT, LOCAL_CHARGE, SURCHARGE, CUSTOMS, TRUCKING
  transportMode: TransportMode; // SEA_FCL | SEA_LCL | AIR_FREIGHT | INLAND_TRUCKING | CUSTOMS_CLEARANCE | MULTIMODAL
  shipmentType: MasterShipmentType; // FCL | LCL | AIR | TRUCK | CUSTOMS | OTHER
  source?: RateSource;          // CARRIER | SUPPLIER | AGENT | CONTRACT | MANUAL | IMPORTED
  sourceType?: 'MANUAL' | 'EXCEL_IMPORT' | 'CSV_IMPORT' | 'API' | 'CARRIER_CONTRACT' | 'SUPPLIER_CONTRACT';
  sourceReference?: string;
  importJobId?: string;
  
  // Carrier & Providers
  carrier: string;              // Shipping Line / Airline / Trucker (e.g. Maersk, ONE, VN Airlines)
  carrierId?: string;
  carrierCode?: string;         // E.g. MSK, ONE, VN
  supplierId?: string;
  supplierName?: string;
  agentId?: string;
  agentName?: string;
  
  // Routing & Ports
  origin: string;               // Port / Airport / City (e.g. Cat Lai Port, VNSGN)
  originCode?: string;          // E.g. VNSGN
  originCountry?: string;       // VN
  originPort?: string;          // VNSGN
  destination: string;          // Port / Airport / City (e.g. Los Angeles Port, USLAX)
  destinationCode?: string;     // E.g. USLAX
  destinationCountry?: string;  // US
  destinationPort?: string;     // USLAX
  pol?: string;
  pod?: string;
  
  // Conditions & Equipments
  incoterm?: IncotermCode;
  containerType?: ContainerType;// 20'GP, 40'HC, 45'HC, etc.
  containerQuantity?: number;
  basis: ChargeBasis;           // PER_CONTAINER, PER_WM, PER_CHARGEABLE_KG, PER_BL, PER_SHIPMENT, etc.
  unit: string;                 // Cont 40'HC, Bill, CBM, KG, Trip
  
  // Trucking & Air Specifics
  truckType?: string;
  truckCapacityTon?: number;
  weightBreaks?: RateWeightBreak[];
  
  // Financial Rates (Cost & Selling)
  costAmount: number;           // Giá vốn đầu vào của Forwarder (BUY RATE)
  costCurrency: Currency;       // USD | VND
  sellingAmount: number;        // Giá bán đề xuất cho khách (SELL RATE)
  sellingCurrency: Currency;    // USD | VND
  vatRate: number;              // Thuế suất VAT (0, 5, 8, 10)
  
  // Minimum & Maximum Rule
  minimumCharge?: number;       // Mức thu tối thiểu (VD: Min 100 USD / LCL, Min 50 USD / Air)
  maximumCharge?: number;       // Mức thu tối đa nếu có
  
  // Validity Range
  effectiveFrom: string;        // YYYY-MM-DD
  effectiveTo: string;          // YYYY-MM-DD
  status: MasterRateStatus;     // DRAFT | PENDING_APPROVAL | APPROVED | ACTIVE | EXPIRED | SUSPENDED | CANCELLED
  
  // Priority & Customer-specific rule
  priority: number;             // 100: Customer Rate, 80: Contract, 50: Carrier, 10: General
  isContractRate?: boolean;
  customerId?: string;
  customerCode?: string;        // Specific Customer Code if applicable
  customerName?: string;
  contractId?: string;
  contractNo?: string;          // Số hợp đồng giá đại lý / hãng tàu
  
  // Operational Details
  transitTime?: string;         // Thời gian hành trình (e.g. 14-16 ngày)
  frequency?: string;           // Tần suất (e.g. 2 chuyến/tuần - Thứ 3, Thứ 6)
  routing?: string;             // Tuyến (e.g. Direct / Tuyến thẳng)
  freeTime?: string;            // Miễn phí lưu container (e.g. 7 days Dem/Det)
  
  // Surcharges & Component Breakdown
  surcharges?: RateSurchargeItem[];
  localCharges?: RateSurchargeItem[];
  
  // Utilization Foundation
  usedCount?: number;
  lastUsedAt?: string;

  // Versioning & Audit
  version: number;              // Version number (1, 2, 3, ...)
  previousVersionId?: string;   // Pointer to previous rate version (Immutable linked list)
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Approval
  approvalId?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface RateHistoryItem {
  id: string;
  companyId?: string;
  rateId: string;
  rateCode: string;
  action: 
    | 'CREATE' 
    | 'UPDATE' 
    | 'SUBMIT' 
    | 'APPROVE' 
    | 'REJECT' 
    | 'ACTIVATE' 
    | 'DEACTIVATE' 
    | 'SUSPEND' 
    | 'CANCEL' 
    | 'DUPLICATE' 
    | 'NEW_VERSION' 
    | 'EXPIRE' 
    | 'DELETE_SOFT'
    | 'OVERRIDE'
    | 'RATE_CREATED'
    | 'RATE_UPDATED'
    | 'RATE_VERSION_CREATED'
    | 'RATE_IMPORTED'
    | 'RATE_APPROVAL_REQUESTED'
    | 'RATE_APPROVED'
    | 'RATE_REJECTED'
    | 'RATE_ACTIVATED'
    | 'RATE_DEACTIVATED'
    | 'RATE_ARCHIVED'
    | 'RATE_EXPIRED';
  timestamp: string;
  actor: string;
  changes?: Record<string, { oldValue: any; newValue: any }>;
  snapshot: Partial<RateMasterItem>;
  note?: string;
}

export interface RateApprovalRequest {
  id: string;
  companyId?: string;
  rateId: string;
  rateCode: string;
  rateName: string;
  version: number;
  rateType: RateType;
  carrier: string;
  origin: string;
  destination: string;
  costAmount: number;
  costCurrency: Currency;
  sellingAmount: number;
  sellingCurrency: Currency;
  effectiveFrom: string;
  effectiveTo: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  remarks?: string;
}

export interface RateRequestItem {
  id: string;
  companyId?: string;
  requestNumber: string;        // E.g. PR-2026-001
  customerId?: string;
  customerName: string;
  salesPersonId: string;
  salesPersonName: string;
  transportMode: TransportMode;
  shipmentType: MasterShipmentType;
  origin: string;
  destination: string;
  commodity: string;
  containerType?: ContainerType;
  quantity?: number;
  weightKg?: number;
  volumeCbm?: number;
  targetCostRate?: number;
  targetSellingRate?: number;
  currency: Currency;
  requiredDate: string;         // Date by which rate is required
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'DRAFT' | 'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  assignedToPricingStaff?: string;
  responseRateId?: string;
  responseNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RateSearchParams {
  transportMode?: TransportMode | 'ALL';
  shipmentType?: MasterShipmentType | 'ALL';
  serviceType?: ServiceType | 'ALL';
  rateType?: RateType | 'ALL';
  origin?: string;
  destination?: string;
  carrier?: string;
  supplierId?: string;
  containerType?: ContainerType | string;
  date?: string;                // Date to test validity against (defaults to today or quote creation date)
  customerCode?: string;
  status?: MasterRateStatus | 'ALL';
  keyword?: string;
  currency?: Currency;
}

export type MatchQuality = 
  | 'EXACT_MATCH' 
  | 'CUSTOMER_MATCH' 
  | 'CONTRACT_MATCH' 
  | 'CARRIER_MATCH' 
  | 'ROUTE_MATCH' 
  | 'GENERAL_RATE';

export type MatchingPriorityLevel = 1 | 2 | 3 | 4 | 5;

export interface RateSearchContext {
  transportMode?: TransportMode | 'ALL';
  shipmentType?: MasterShipmentType | 'ALL';
  serviceType?: ServiceType | 'ALL';
  rateType?: RateType | 'ALL';
  incoterm?: IncotermCode | string;
  origin?: string;
  destination?: string;
  pol?: string;
  pod?: string;
  country?: string;
  carrier?: string;
  supplierId?: string;
  containerType?: ContainerType | string;
  containerQuantity?: number;
  grossWeightKg?: number;
  volumeCbm?: number;
  chargeableWeight?: number;
  commodity?: string;
  customerId?: string;
  customerCode?: string;
  customerName?: string;
  quotationDate?: string;
  currency?: Currency;
  keyword?: string;
  status?: MasterRateStatus | 'ALL';
  chargeCategory?: FeeCategory;
  chargeLocation?: ChargeLocation;
}

export interface RateSearchResult {
  rate: RateMasterItem;
  matchScore: number;           // 0 to 100
  matchQuality: MatchQuality;
  priorityLevel: MatchingPriorityLevel;
  matchReasonVi: string;
  matchReasonEn: string;
  isExpired: boolean;
  isExpiringSoon: boolean;      // True if expiring within 14 days
  isFutureRate: boolean;        // True if effectiveFrom is after search date
  isValidForDate: boolean;
}

export interface SmartRateCategoryGroup {
  categoryKey: 'MAIN_FREIGHT' | 'POL_LOCAL' | 'POD_LOCAL' | 'TRUCKING' | 'CUSTOMS' | 'OTHER';
  titleVi: string;
  titleEn: string;
  items: RateSearchResult[];
  selectedCount: number;
}

export interface SmartRateScanResult {
  context: RateSearchContext;
  totalActiveMatches: number;
  totalExpiredMatches: number;
  groups: SmartRateCategoryGroup[];
  hasExactFreightMatch: boolean;
  recommendedCount: number;
}

export interface RateComparisonDiff {
  lineItemId: string;
  itemDescription: string;
  currentRateId?: string;
  currentRateCode?: string;
  currentRateVersion?: number;
  currentUnitPrice: number;
  currentCostPrice?: number;
  currentCurrency: Currency;
  latestRateItem?: RateMasterItem;
  latestUnitPrice: number;
  latestCostPrice?: number;
  latestCurrency: Currency;
  diffSellAmount: number;
  diffSellPercent: number;
  diffCostAmount: number;
  diffCostPercent: number;
  grossProfitImpact: number;
  marginImpactPercent: number;
  hasChanges: boolean;
  isExpiredNow: boolean;
  statusChange?: string;
}

export interface RateValidationResult {
  isValid: boolean;
  errors: {
    field: string;
    messageVi: string;
    messageEn: string;
  }[];
  warnings: {
    field: string;
    messageVi: string;
    messageEn: string;
  }[];
  isDuplicate?: boolean;
  duplicateRateCode?: string;
  hasOverlap?: boolean;
  overlappingRateCode?: string;
}

export interface BulkImportRateRow {
  rowNumber: number;
  rawData: Record<string, any>;
  parsedRate?: Partial<RateMasterItem>;
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface BulkImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  itemsToImport: RateMasterItem[];
  rowDetails: BulkImportRateRow[];
}

export interface RateCoverageSummary {
  totalRates: number;
  activeCount: number;
  pendingApprovalCount: number;
  expiredCount: number;
  expiringIn7Days: number;
  expiringIn14Days: number;
  expiringIn30Days: number;
  topLanes: { lane: string; count: number }[];
  missingCostCount: number;
  missingValidityCount: number;
  missingSupplierCount: number;
}

/**
 * ============================================================================
 * PHASE 13: RATE INTELLIGENCE, MATCHING & BULK IMPORT TYPES
 * ============================================================================
 */

export type DuplicatePolicy = 'SKIP' | 'UPDATE' | 'CREATE_NEW_VERSION' | 'REJECT';

export type ImportJobStatus = 
  | 'QUEUED' 
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'COMPLETED_WITH_ERRORS' 
  | 'FAILED' 
  | 'CANCELLED';

export interface ImportRowError {
  rowNumber: number;
  rateCode?: string;
  field?: string;
  messageVi: string;
  messageEn: string;
  rawData?: Record<string, any>;
}

export interface BulkImportJob {
  id: string;
  companyId?: string;
  fileName: string;
  fileType: 'EXCEL' | 'CSV';
  fileSize?: number;
  status: ImportJobStatus;
  duplicatePolicy: DuplicatePolicy;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  duplicateRows: number;
  warningRows: number;
  errors: ImportRowError[];
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

export type RateMatchStatus = 
  | 'MATCH_FOUND' 
  | 'NO_APPLICABLE_RATE_FOUND' 
  | 'RATE_CONFLICT' 
  | 'RATE_OVERLAP_CONFLICT';

export type RateMatchingPriority = 
  | 'CUSTOMER_CONTRACT' 
  | 'CARRIER_CONTRACT' 
  | 'SUPPLIER_CONTRACT' 
  | 'SPOT_RATE' 
  | 'DEFAULT_RATE';

export interface RateMatchQueryCriteria {
  companyId?: string;
  transportMode: TransportMode;
  serviceType?: ServiceType;
  rateType?: RateType | 'ALL';
  origin: string;
  destination: string;
  pol?: string;
  pod?: string;
  carrierId?: string;
  carrier?: string;
  supplierId?: string;
  equipment?: ContainerType | string;
  containerQuantity?: number;
  weightKg?: number;
  volumeCbm?: number;
  effectiveDate?: string;       // Default today or quotation date
  customerId?: string;
  customerCode?: string;
  customerName?: string;
  currency?: Currency;
}

export interface RateMatchOutcome {
  status: RateMatchStatus;
  bestMatch?: RateSearchResult;
  matchingCandidates: RateSearchResult[];
  conflictRates?: RateMasterItem[];
  conflictReason?: string;
  queryCriteria: RateMatchQueryCriteria;
  missingRateEventLogged?: boolean;
}

export interface MissingRateEvent {
  id: string;
  companyId?: string;
  transportMode: TransportMode;
  serviceType?: ServiceType;
  origin: string;
  destination: string;
  equipment?: string;
  carrier?: string;
  requestedDate: string;
  requestedBy?: string;
  hitCount: number;
  createdAt: string;
  lastRequestedAt: string;
  status: 'PENDING' | 'RESOLVED' | 'IGNORED';
  notes?: string;
}

export interface RateComparisonMatrixItem {
  id: string;
  rateCode: string;
  carrier: string;
  supplierName?: string;
  serviceType?: ServiceType;
  origin: string;
  destination: string;
  equipment?: string;
  costAmount: number;
  costCurrency: Currency;
  sellingAmount: number;
  sellingCurrency: Currency;
  grossProfit: number;
  marginPercent: number;
  effectiveFrom: string;
  effectiveTo: string;
  transitTime?: string;
  freeTime?: string;
  surchargesTotal: number;
  status: MasterRateStatus;
  rateType: RateType;
  priority: number;
  isBestCost?: boolean;
  isBestSell?: boolean;
  isHighestMargin?: boolean;
}

