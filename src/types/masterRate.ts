import { Currency, FeeCategory, ChargeLocation, TransportMode, ContainerType, IncotermCode } from './logistics';
import { ChargeBasis } from './pricing';

export type MasterRateStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export type MasterShipmentType = 'FCL' | 'LCL' | 'AIR' | 'TRUCK' | 'CUSTOMS' | 'OTHER';

export interface ChargeMasterItem {
  id: string;
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

export interface RateMasterItem {
  id: string;
  rateCode: string;             // E.g. RATE-MSC-CATLAI-LAX-40HC-01
  rateName: string;             // E.g. Cước Biển MSC Tuyến Cát Lái - Los Angeles
  chargeId?: string;            // Link to ChargeMasterItem if available
  chargeCode: string;           // E.g. OFR, THC, BL, etc.
  chargeName: string;           // Tên khoản phí
  category: FeeCategory;        // FREIGHT, LOCAL_CHARGE, SURCHARGE, CUSTOMS, TRUCKING, HANDLING
  chargeType: string;           // BASE_FREIGHT, LOCAL_CHARGE, SURCHARGE, CUSTOMS, TRUCKING
  transportMode: TransportMode; // SEA_FCL | SEA_LCL | AIR_FREIGHT | INLAND_TRUCKING | CUSTOMS_CLEARANCE | MULTIMODAL
  shipmentType: MasterShipmentType; // FCL | LCL | AIR | TRUCK | CUSTOMS | OTHER
  
  // Carrier & Providers
  carrier: string;              // Shipping Line / Airline / Trucker (e.g. Maersk, ONE, VN Airlines)
  carrierCode?: string;         // E.g. MSK, ONE, VN
  
  // Routing & Ports
  origin: string;               // Port / Airport / City (e.g. Cat Lai Port, VNSGN)
  originCountry?: string;       // VN
  originPort?: string;          // VNSGN
  destination: string;          // Port / Airport / City (e.g. Los Angeles Port, USLAX)
  destinationCountry?: string;  // US
  destinationPort?: string;     // USLAX
  
  // Conditions & Equipments
  incoterm?: IncotermCode;
  containerType?: ContainerType;// 20'GP, 40'HC, 45'HC, etc.
  containerQuantity?: number;
  basis: ChargeBasis;           // PER_CONTAINER, PER_WM, PER_CHARGEABLE_KG, PER_BL, PER_SHIPMENT, etc.
  unit: string;                 // Cont 40'HC, Bill, CBM, KG, Trip
  
  // Financial Rates (Cost & Selling)
  costAmount: number;           // Giá vốn đầu vào của Forwarder
  costCurrency: Currency;       // USD | VND
  sellingAmount: number;        // Giá bán đề xuất cho khách
  sellingCurrency: Currency;    // USD | VND
  vatRate: number;              // Thuế suất VAT (0, 5, 8, 10)
  
  // Minimum & Maximum Rule
  minimumCharge?: number;       // Mức thu tối thiểu (VD: Min 100 USD / LCL)
  maximumCharge?: number;       // Mức thu tối đa nếu có
  
  // Validity Range
  effectiveFrom: string;        // YYYY-MM-DD
  effectiveTo: string;          // YYYY-MM-DD
  status: MasterRateStatus;     // DRAFT | ACTIVE | INACTIVE | EXPIRED
  
  // Priority & Customer-specific rule
  priority: number;             // 100: Customer Rate, 80: Contract, 50: Carrier, 10: General
  customerCode?: string;        // Specific Customer Code if applicable
  customerName?: string;
  contractNo?: string;          // Số hợp đồng giá đại lý / hãng tàu
  
  // Operational Details
  transitTime?: string;         // Thời gian hành trình (e.g. 14-16 ngày)
  frequency?: string;           // Tần suất (e.g. 2 chuyến/tuần - Thứ 3, Thứ 6)
  routing?: string;             // Tuyến (e.g. Direct / Tuyến thẳng)
  freeTime?: string;            // Miễn phí lưu container (e.g. 7 days Dem/Det)
  
  // Versioning & Audit
  version: number;              // Version number (1, 2, 3, ...)
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface RateHistoryItem {
  id: string;
  rateId: string;
  rateCode: string;
  action: 'CREATE' | 'UPDATE' | 'ACTIVATE' | 'DEACTIVATE' | 'DUPLICATE' | 'EXPIRE' | 'DELETE_SOFT';
  timestamp: string;
  actor: string;
  changes?: Record<string, { oldValue: any; newValue: any }>;
  snapshot: Partial<RateMasterItem>;
  note?: string;
}

export interface RateSearchParams {
  transportMode?: TransportMode | 'ALL';
  shipmentType?: MasterShipmentType | 'ALL';
  origin?: string;
  destination?: string;
  carrier?: string;
  containerType?: ContainerType | string;
  date?: string;                // Date to test validity against (defaults to today or quote creation date)
  customerCode?: string;
  status?: MasterRateStatus | 'ALL';
  keyword?: string;
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
  incoterm?: IncotermCode | string;
  origin?: string;
  destination?: string;
  pol?: string;
  pod?: string;
  country?: string;
  carrier?: string;
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
}

export interface BulkImportRateRow {
  rowNumber: number;
  rawData: Record<string, any>;
  parsedRate?: Partial<RateMasterItem>;
  isValid: boolean;
  errors: string[];
}

export interface BulkImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  itemsToImport: RateMasterItem[];
  rowDetails: BulkImportRateRow[];
}
