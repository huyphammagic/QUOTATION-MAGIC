import { TransportMode, ContainerType, Currency, LineItem, CustomerInfo, ShipmentDetails } from './logistics';

export type LogisticsDocumentType =
  | 'AUTO_DETECT'
  | 'BILL_OF_LADING'        // Vận đơn đường biển (B/L, HBL, MBL)
  | 'BOOKING_CONFIRMATION'  // Xác nhận đặt chỗ hãng tàu / Co-loader
  | 'COMMERCIAL_INVOICE'    // Hóa đơn thương mại
  | 'PACKING_LIST'          // Phiếu đóng gói chi tiết
  | 'CUSTOMS_DECLARATION'   // Tờ khai hải quan điện tử (VNACCS)
  | 'ARRIVAL_NOTICE'        // Giấy báo nhận hàng (A/N)
  | 'CERTIFICATE_OF_ORIGIN' // Chứng nhận xuất xứ (C/O)
  | 'DELIVERY_ORDER';       // Lệnh giao hàng (D/O)

export interface DocumentPartyInfo {
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
}

export interface ExtractedContainerSeal {
  id: string;
  containerNo: string;
  sealNo: string;
  type: string;             // e.g., "40'HC", "20'GP", "40'RF"
  tareWeightKg?: number;
  maxPayloadKg?: number;
  packageCount?: number;
  grossWeightKg?: number;
}

export interface ExtractedChargeItem {
  id: string;
  code: string;             // e.g., "O/F", "THC", "BL", "SEAL", "D/O"
  description: string;
  amount: number;
  currency: Currency;
  unit: string;             // Cont, Set, Bill, CBM...
  category?: string;
}

export interface ParsedDocumentData {
  id: string;
  documentType: LogisticsDocumentType;
  documentTypeNameVi: string;
  documentNumber: string;
  issueDate?: string;
  carrierOrIssuer?: string;     // e.g. Maersk, ONE, CMA CGM, Chi cục Hải quan...
  bookingReference?: string;
  blNumber?: string;
  invoiceNumber?: string;
  declarationNumber?: string;
  vesselOrFlight?: string;
  voyageNo?: string;
  contractNumber?: string;

  // Parties involved
  shipper: DocumentPartyInfo;
  consignee: DocumentPartyInfo;
  notifyParty?: DocumentPartyInfo;

  // Transport & Routing
  mode: TransportMode;
  pol: string;                  // Port of Loading / Airport / Điểm đi
  pod: string;                  // Port of Discharge / Điểm đến
  placeOfReceipt?: string;
  placeOfDelivery?: string;
  etd?: string;
  eta?: string;
  cyCutOff?: string;            // Closing time CY
  siCutOff?: string;            // Shipping Instruction cut-off
  vgmCutOff?: string;           // VGM cut-off
  emptyDepot?: string;          // Điểm cấp/lấy vỏ rỗng
  fullTerminal?: string;        // Điểm hạ bãi cont đầy
  transitTime?: string;
  freeTimeDemDet?: string;      // e.g. "14 ngày Free Dem/Det"

  // Cargo specifications
  commodity: string;
  containerType: ContainerType;
  containerCount: number;
  packageCount: number;
  packageUnit: string;          // Kiện, Cartons, Pallets, Thùng, Bao...
  grossWeightKg: number;
  netWeightKg: number;
  volumeCbm: number;
  chargeableWeightKg: number;
  hsCode?: string;
  marksAndNumbers?: string;
  temperatureSetting?: string;  // e.g. "-18°C" cho cont lạnh
  dgClass?: string;             // Hàng nguy hiểm (UN No / IMDG Class)

  // Container & Seal List
  containers: ExtractedContainerSeal[];

  // Commercial & Financials (Invoices, A/N, Charges)
  incoterm?: string;            // FOB, CIF, EXW, DDP...
  currency: Currency;
  totalInvoiceAmount?: number;
  paymentTerms?: string;
  charges: ExtractedChargeItem[];

  // AI Extraction Diagnostics
  confidenceScore: number;      // 0 - 100
  fieldConfidence: Record<string, number>;
  warnings: string[];
  extractionNotes: string[];
  rawSummary: string;
  parsedAt: string;
  processingTimeMs: number;

  // Original Document File Details
  fileName: string;
  fileType: string;
  fileSize: number;
  previewUrl?: string;          // Data URL or object URL
  rawText?: string;             // Raw extracted OCR text
}

export interface CrossCheckFieldResult {
  fieldName: string;
  labelVi: string;
  valueDocA: string | number;
  valueDocB: string | number;
  status: 'MATCH' | 'WARNING' | 'MISMATCH';
  message: string;
}

export interface CrossCheckResult {
  docAId: string;
  docBId: string;
  docAName: string;
  docBName: string;
  overallMatchScore: number;    // 0 - 100%
  checkedAt: string;
  fields: CrossCheckFieldResult[];
  criticalAlerts: string[];
  recommendations: string[];
}
