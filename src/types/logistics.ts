export type TransportMode = 
  | 'SEA_FCL' 
  | 'SEA_LCL' 
  | 'AIR_FREIGHT' 
  | 'INLAND_TRUCKING' 
  | 'CUSTOMS_CLEARANCE' 
  | 'WAREHOUSING'
  | 'MULTIMODAL';

export type ContainerType = 
  | "20'GP" 
  | "40'GP" 
  | "40'HC" 
  | "45'HC" 
  | "20'RF" 
  | "40'RF" 
  | "20'OT" 
  | "40'OT" 
  | "LCL (CBM/KGS)" 
  | "AIR (KGS/CW)" 
  | "Xe Tải 1.25 Tấn" 
  | "Xe Tải 2.5 Tấn" 
  | "Xe Tải 5 Tấn" 
  | "Xe Tải 8 Tấn" 
  | "Xe Tải 15 Tấn" 
  | "Xe Đầu Kéo / Moóc";

export type FeeCategory = 
  | 'FREIGHT' 
  | 'LOCAL_CHARGE' 
  | 'SURCHARGE' 
  | 'CUSTOMS' 
  | 'TRUCKING' 
  | 'HANDLING' 
  | 'OTHER';

export type ChargeLocation = 'POL' | 'FREIGHT' | 'POD' | 'OTHER';

export type Currency = 'USD' | 'VND';

export type QuoteStatus = 
  | 'DRAFT' 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'ISSUED' 
  | 'SENT' 
  | 'VIEWED' 
  | 'ACCEPTED' 
  | 'REJECTED' 
  | 'EXPIRED' 
  | 'CANCELLED';

export type IncotermCode = 'FOB' | 'CIF' | 'EXW' | 'DDP' | 'DAP' | 'CFR' | 'FCA' | 'CPT' | 'CIP' | 'DPU';

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

export interface LineItem {
  id: string;
  category: FeeCategory;
  location?: ChargeLocation; // POL (Đầu xuất), FREIGHT (Chặng chính), POD (Đầu nhập), OTHER (Khác)
  code: string;           // E.g. THC, BL, Ocean Freight, BAF
  description: string;    // E.g. Terminal Handling Charge tại Cảng Cát Lái
  basis?: ChargeBasis;    // E.g. PER_CONTAINER, PER_BL, PER_WM, etc.
  percentageBase?: PercentageBase;
  percentageRate?: number;
  quantity: number;
  unit: string;           // Container, Bill, Set, CBM, KGS, Trip, Shipment
  unitPrice: number;      // Selling price per unit
  costPrice?: number;     // Cost price per unit (Giá vốn)
  currency: Currency;     // USD or VND
  vatRate: number;        // Percentage: 0, 5, 8, 10
  vatAmountUsd?: number;  // Computed VAT in USD
  vatAmountVnd?: number;  // Computed VAT in VND
  amountUsd: number;      // Calculated total selling in USD (before VAT)
  amountVnd: number;      // Calculated total selling in VND (before VAT)
  totalWithVatUsd?: number; // Total selling + VAT (USD)
  totalWithVatVnd?: number; // Total selling + VAT (VND)
  costTotalUsd?: number;  // Total cost in USD
  costTotalVnd?: number;  // Total cost in VND
  profitUsd?: number;     // amountUsd - costTotalUsd
  profitVnd?: number;     // amountVnd - costTotalVnd
  marginPercent?: number; // (profit / amount) * 100
  note?: string;

  // Master Rate Snapshot Preservation Fields
  rateId?: string;
  rateCode?: string;
  rateVersion?: number;
  carrier?: string;
  origin?: string;
  destination?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  minimumAmount?: number; // Minimum charge rule (e.g. Min $100)
  maximumAmount?: number; // Maximum charge rule if set
  transitTime?: string;
  freeTime?: string;

  // Manual Override Tracking Fields (Phase C)
  isOverridden?: boolean;
  originalUnitPrice?: number;
  originalCostPrice?: number;
  overrideReason?: string;
  overriddenAt?: string;
  overriddenBy?: string;

  // Contract & Price Source Traceability (Phase 14)
  priceSource?: 'CUSTOMER_CONTRACT' | 'SUPPLIER_CONTRACT' | 'STANDARD_RATE' | 'SPOT_RATE' | 'MANUAL';
  sourceId?: string;           // contractId or rateId
  sourceContractNumber?: string; // e.g. CTR-CUST-2026-001
  sourceVersion?: number | string; // e.g. 1, 2, or 'V1'
  sourceRateId?: string;       // e.g. CRATE-001
  priceTraceability?: string;  // e.g. "Hợp đồng KH: CTR-2026-001 (V1) - Giá SELL"
}

export interface CustomerRecord extends CustomerInfo {
  id: string;
  code: string;
  group?: string;
  segment?: string; // VIP, STRATEGIC, STANDARD
  notes?: string;
  createdDate?: string;
}

export type SurchargeTransportMode = 'SEA_FCL' | 'SEA_LCL' | 'AIR' | 'ROAD' | 'CUSTOMS' | 'ALL';

export interface SurchargeItem {
  id: string;
  code: string;
  name: string;
  category: FeeCategory;
  transportMode: SurchargeTransportMode;
  location?: ChargeLocation; // POL, FREIGHT, POD, OTHER
  unit: string;
  priceUsd: number;
  priceVnd: number;
  vatRate: number;
  currency: Currency;
}

export interface CustomerInfo {
  id?: string;
  code?: string;
  segment?: string;
  customerName: string;
  companyName: string;
  taxId: string;
  address: string;
  email: string;
  phone: string;
  contactPerson: string;
}

export interface ShipmentDetails {
  mode: TransportMode;
  pol: string;             // Port of Loading (Cảng bốc hàng)
  pod: string;             // Port of Discharge (Cảng dỡ hàng)
  commodity: string;       // Tên hàng hóa
  containerType: ContainerType;
  quantity: number;        // Số lượng Container / Chuyến / Lô
  grossWeightKg: number;   // Tổng trọng lượng (KG)
  volumeCbm: number;       // Tổng thể tích (CBM)
  chargeableWeight: number;// Trọng lượng tính cước (CW) - tự động tính cho Air/LCL
  etd?: string;            // Estimated Time of Departure
  eta?: string;            // Estimated Time of Arrival
  transitTime?: string;    // Thời gian vận chuyển (VD: 12-14 ngày)
  freeTime?: string;       // Thời gian lưu bãi/lưu vỏ (VD: 7 days Dem/Det)
}

export type QuoteCurrency = 'USD' | 'VND';

export interface TermsAndConditions {
  incoterm: IncotermCode;
  validityDate: string;     // Hiệu lực báo giá
  paymentTerm: string;      // Điều khoản thanh toán (VD: Thanh toán trước khi phát hành B/L)
  exclusionsNotes: string;  // Ngoại trừ & Ghi chú (VD: Không bao gồm thuế nhập khẩu, phí lưu kho bãi quá hạn)
  bankAccountInfo: string;  // Thông tin chuyển khoản công ty
  currency?: QuoteCurrency; // Loại tiền thể hiện chính trên báo giá ('USD' hoặc 'VND')
}

export interface CompanyProfile {
  name: string;
  englishName: string;
  shortName?: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl?: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountHolder: string;
  bankSwiftCode: string;
  salesRepName: string;
  salesRepTitle: string;
  salesRepPhone: string;
  salesRepEmail: string;
  version?: number;
  updatedAt?: string;
}

export type CustomerProfile = CustomerRecord;
export type QuoteHistoryItem = QuoteData;
export type MasterRateItem = any;

export interface QuoteData {
  id: string;
  quoteNumber: string;      // E.g. LOG-2026-0701
  createdDate: string;
  updatedDate: string;
  status: QuoteStatus;
  quoteCurrency?: QuoteCurrency; // 'USD' | 'VND' - Loại tiền chính hiển thị trên file báo giá (Mặc định USD)
  exchangeRate: number;     // E.g. 25400 VND/USD
  customer: CustomerInfo;
  shipment: ShipmentDetails;
  items: LineItem[];
  terms: TermsAndConditions;
  company: CompanyProfile;
  // Computed summaries (Selling)
  subtotalUsd: number;
  subtotalVnd: number;
  vatTotalUsd: number;
  vatTotalVnd: number;
  grandTotalUsd: number;
  grandTotalVnd: number;
  // Computed cost & profitability
  totalCostUsd?: number;
  totalCostVnd?: number;
  totalProfitUsd?: number;
  totalProfitVnd?: number;
  overallMarginPercent?: number;
  markupPercent?: number;
  targetMarginPercent?: number;
  minimumMarginPercent?: number;
  recommendedSellPriceUsd?: number;
  recommendedSellPriceVnd?: number;
  minimumSellPriceUsd?: number;
  minimumSellPriceVnd?: number;
  maximumDiscountUsd?: number;
  maximumDiscountPercent?: number;
  marginStatus?: string;
  priceFloorType?: any;
  priceLocked?: boolean;
  priceOverrideReason?: string;
  pricingPolicyId?: string;
  pricingPolicyCode?: string;
  pricingPolicyVersion?: number;
  profitSummary?: any;
  pricingSnapshot?: any;
  // Cloud-First Persistence & Concurrency (Phase 17)
  version?: number;
  companyId?: string;
  _updatedAt?: any;
  _updatedBy?: string;
  _createdAt?: any;
  _createdBy?: string;
}
