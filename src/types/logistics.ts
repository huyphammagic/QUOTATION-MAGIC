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

export type Currency = 'USD' | 'VND';

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export type IncotermCode = 'FOB' | 'CIF' | 'EXW' | 'DDP' | 'DAP' | 'CFR' | 'FCA' | 'CPT' | 'CIP' | 'DPU';

export interface LineItem {
  id: string;
  category: FeeCategory;
  code: string;           // E.g. THC, BL, Ocean Freight, BAF
  description: string;    // E.g. Terminal Handling Charge tại Cảng Cát Lái
  quantity: number;
  unit: string;           // Container, Bill, Set, CBM, KGS, Trip, Shipment
  unitPrice: number;      // Price per unit
  currency: Currency;     // USD or VND
  vatRate: number;        // Percentage: 0, 5, 8, 10
  amountUsd: number;      // Calculated total in USD
  amountVnd: number;      // Calculated total in VND
  note?: string;
}

export interface CustomerRecord extends CustomerInfo {
  id: string;
  code: string;
  group?: string;
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
  unit: string;
  priceUsd: number;
  priceVnd: number;
  vatRate: number;
  currency: Currency;
}

export interface CustomerInfo {
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

export interface TermsAndConditions {
  incoterm: IncotermCode;
  validityDate: string;     // Hiệu lực báo giá
  paymentTerm: string;      // Điều khoản thanh toán (VD: Thanh toán trước khi phát hành B/L)
  exclusionsNotes: string;  // Ngoại trừ & Ghi chú (VD: Không bao gồm thuế nhập khẩu, phí lưu kho bãi quá hạn)
  bankAccountInfo: string;  // Thông tin chuyển khoản công ty
}

export interface CompanyProfile {
  name: string;
  englishName: string;
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
}

export interface QuoteData {
  id: string;
  quoteNumber: string;      // E.g. LOG-2026-0701
  createdDate: string;
  updatedDate: string;
  status: QuoteStatus;
  exchangeRate: number;     // E.g. 25400 VND/USD
  customer: CustomerInfo;
  shipment: ShipmentDetails;
  items: LineItem[];
  terms: TermsAndConditions;
  company: CompanyProfile;
  // Computed summaries
  subtotalUsd: number;
  subtotalVnd: number;
  vatTotalUsd: number;
  vatTotalVnd: number;
  grandTotalUsd: number;
  grandTotalVnd: number;
}
