import { CompanyProfile, CustomerInfo, FeeCategory } from './logistics';

export type DebitNoteStatus = 
  | 'DRAFT'           // Bản nháp đang soạn
  | 'ISSUED'          // Đã phát hành chính thức
  | 'SENT'            // Đã gửi cho khách hàng
  | 'PARTIALLY_PAID'  // Khách đã thanh toán 1 phần
  | 'PAID'            // Đã thanh toán đầy đủ
  | 'OVERDUE'         // Quá hạn thanh toán
  | 'CANCELLED';      // Đã hủy bỏ

export type DebitNoteCurrency = 'VND' | 'USD' | 'DUAL';

export interface DebitNoteItem {
  id: string;
  code: string;                  // e.g. OF, THC, DOC, CC, CFS, TRUCK, DEM, DET, STORAGE, SEAL, LSS...
  description: string;           // Tên chi phí tiếng Việt
  descriptionEn?: string;        // Tên chi phí tiếng Anh
  category: FeeCategory;         // OCEAN_FREIGHT, AIR_FREIGHT, ORIGIN_LOCAL, DESTINATION_LOCAL, CUSTOMS, TRUCKING, WAREHOUSING, OTHER
  unit: string;                  // cont, set, shpt, cbm, kg, trip, ton...
  quantity: number;
  currency: 'USD' | 'VND';
  unitPrice: number;
  amount: number;                // quantity * unitPrice
  vatRate: number;               // 0, 5, 8, 10 (%)
  vatAmount: number;             // amount * vatRate / 100
  totalAmount: number;           // amount + vatAmount
  exchangeRate?: number;         // Tỷ giá quy đổi riêng (nếu có)
  amountVndConverted?: number;   // Quy đổi VND tương đương
  notes?: string;
  isCustomCharge?: boolean;      // Phí phát sinh thực tế thêm ngoài báo giá gốc
}

export interface DebitNoteShipmentDetails {
  mode: string;                  // Đường biển FCL/LCL, Hàng không Air, Đường bộ Trucking
  pol: string;                   // Cảng bốc hàng / Sân bay đi
  pod: string;                   // Cảng dỡ hàng / Sân bay đến
  carrier?: string;              // Hãng tàu / Hãng bay (Maersk, ONE, Cosco, Vietnam Airlines...)
  vesselVoyage?: string;         // Tên tàu & Số chuyến (e.g. EVER GIVEN / 0422E)
  blNumber?: string;             // Master B/L hoặc House B/L
  bookingNumber?: string;        // Số Booking xác nhận
  containerSealNo?: string;      // Số Cont & Số Chì (e.g. TCNU1234567 / SL-998811)
  cargoDescription?: string;     // Tên mặt hàng / Mô tả hàng hóa
  grossWeightKg?: number;        // Tổng trọng lượng Gross Weight (KG)
  volumeCbm?: number;            // Thể tích CBM
  packages?: string;             // Số kiện (e.g. 500 Cartons / 10 Pallets)
  etd?: string;                  // Ngày tàu chạy dự kiến
  eta?: string;                  // Ngày tàu đến dự kiến
}

export interface DebitNoteBankAccount {
  bankId: string;                // Mã ngân hàng theo VietQR (e.g. VCB, TCB, MB, ACB, BIDV, CTG)
  bankName: string;              // Tên ngân hàng (e.g. Ngân hàng TMCP Ngoại Thương Việt Nam - Vietcombank)
  accountNumber: string;         // Số tài khoản thụ hưởng
  accountHolder: string;         // Tên chủ tài khoản (viết hoa không dấu)
  branch?: string;               // Chi nhánh
  swiftCode?: string;            // Swift code phục vụ chuyển tiền quốc tế
  currency: 'VND' | 'USD';
}

export interface DebitNoteRecord {
  id: string;
  debitNoteNumber: string;       // Mã Debit Note (e.g. DN-2026-LOG-0701-01)
  quotationId: string;           // ID báo giá gốc
  quotationNumber: string;       // Mã báo giá gốc (e.g. LOG-2026-0701)
  version: number;               // Lần phát hành (1, 2, 3...)
  issueDate: string;             // Ngày phát hành (YYYY-MM-DD)
  dueDate: string;               // Hạn thanh toán (YYYY-MM-DD)
  status: DebitNoteStatus;
  
  // Tiền tệ & Tỷ giá
  currency: DebitNoteCurrency;   // Loại tiền thể hiện chính: 'VND' | 'USD' | 'DUAL'
  exchangeRate: number;          // Tỷ giá thanh toán (VND/USD, e.g. 25,450)
  exchangeRateSource?: string;   // Nguồn tỷ giá (e.g. VCB Bán ra ngày 11/10/2026)
  
  // Các bên liên quan
  customer: CustomerInfo;        // Thông tin khách hàng thanh toán
  company: CompanyProfile;       // Thông tin Forwarder phát hành
  
  // Thông tin vận tải
  shipment: DebitNoteShipmentDetails;
  
  // Chi tiết cước & phụ phí
  items: DebitNoteItem[];
  
  // Tổng cộng
  subtotalUsd: number;
  subtotalVnd: number;
  vatTotalUsd: number;
  vatTotalVnd: number;
  grandTotalUsd: number;
  grandTotalVnd: number;
  
  // Số tiền khách cần thanh toán thực tế (Theo loại tiền chốt: VND hoặc USD)
  finalAmountToPay: number;
  finalCurrency: 'VND' | 'USD';
  
  // Đọc số tiền bằng chữ
  amountInWordsVi: string;       // Số tiền bằng chữ (VNĐ)
  amountInWordsEn: string;       // Amount in words (USD/VND)
  
  // Tài khoản thanh toán
  bankAccountVnd: DebitNoteBankAccount;
  bankAccountUsd?: DebitNoteBankAccount;
  
  // Điều khoản & Ghi chú
  paymentTerms: string;          // e.g. "Vui lòng thanh toán trong vòng 03 ngày làm việc kể từ ngày nhận Debit Note hoặc trước khi phát hành D/O."
  specialNotes?: string;         // "Mọi phí chuyển khoản ngân hàng do người chuyển chịu (OUR). Nội dung CK: Thanh toan DN-2026-LOG-0701"
  bankChargeClause: string;      // "All banking charges are for applicant's / payer's account."
  
  // Phê duyệt & Chữ ký
  preparedBy: string;            // Người lập biểu
  approvedBy: string;            // Phụ trách kế toán / Ký duyệt
  customerConfirmation?: string; // Người đại diện khách hàng ký nhận
  
  // Theo dõi gửi khách & Thu tiền
  sentAt?: string;
  sentToEmail?: string;
  sentViaChannel?: 'EMAIL' | 'ZALO' | 'DOWNLOAD_PDF' | 'LINK';
  paidAmountVnd?: number;
  paidAmountUsd?: number;
  paidDate?: string;
  paymentReference?: string;
  
  createdAt: string;
  updatedAt: string;
}
