import { LineItem, CustomerInfo, ShipmentDetails } from './logistics';

export type MultiOptionTier = 'ECONOMY' | 'BALANCED' | 'PREMIUM' | 'CUSTOM';

export interface MultiOptionRating {
  costScore: number;        // 1-10 (10 = siêu tiết kiệm)
  speedScore: number;       // 1-10 (10 = cực nhanh)
  reliabilityScore: number; // 1-10 (10 = cam kết chỗ & lịch trình chuẩn 99%)
  serviceScore: number;     // 1-10 (10 = dịch vụ hỗ trợ VIP 24/7)
}

export interface MultiOptionItem {
  id: string;
  tier: MultiOptionTier;
  tierNameVi: string;       // vd: "TIẾT KIỆM (ECONOMY)", "CÂN BẰNG / KHUYÊN DÙNG", "HỎA TỐC / CAO CẤP"
  tierNameEn: string;       // vd: "Economy Budget", "Recommended Standard", "Express Premium"
  tagline: string;          // Mô tả ngắn gọn súc tích
  carrier: string;          // Tên hãng tàu / Hãng hàng không / Đơn vị vận chuyển
  serviceType: string;      // Direct / Transshipment 1 Hub / Priority Express
  vesselFlight?: string;    // Tên tàu / Số hiệu chuyến bay (nếu có)
  routing: string;          // Tuyến vận chuyển POL -> POD
  transitDays: number;      // Số ngày vận chuyển ước tính
  transitTimeText: string;  // Chuỗi hiển thị (vd: "18 - 21 Ngày")
  departureSchedule: string;// Lịch khởi hành (vd: "Thứ 6 hàng tuần (ETD Fri)")
  closingCutoff: string;    // Giờ cắt máng / cut-off SI & CY (vd: "T4 12:00")
  freeTimeDemDet: string;   // Số ngày miễn phí lưu bãi/cont (vd: "14 Ngày kết hợp")
  freeTimeDays: number;     // Số ngày số thực tế
  spaceGuarantee: string;   // Mức độ cam kết slot & thiết bị cont
  items: LineItem[];        // Danh sách chi tiết các khoản mục chi phí cấu thành
  oceanAirFreightUsd: number; // Tiền cước chính USD
  localChargesVnd: number;    // Tiền phí địa phương VND
  totalConvertedUsd: number;  // Tổng cộng quy đổi USD
  totalConvertedVnd: number;  // Tổng cộng quy đổi VND
  estimatedCostUsd: number;   // Giá vốn ước tính
  estimatedProfitUsd: number; // Lợi nhuận dự kiến
  estimatedMarginPercent: number; // Biên lợi nhuận %
  includedServices: string[]; // Danh sách các dịch vụ & giá trị cộng thêm bao gồm
  valueAddHighlights: string[]; // Các ưu điểm cốt lõi nổi bật
  caveats: string[];          // Điểm cần lưu ý (minh bạch với khách hàng)
  bestSuitedFor: string;      // Phương án này tối ưu cho khách hàng nào?
  isRecommended: boolean;     // Phương án đề xuất chính (Sweet Spot)
  rating: MultiOptionRating;  // Điểm số đánh giá tổng hợp
  customNotes?: string;       // Ghi chú đặc biệt
}

export interface MultiOptionPitchDecks {
  phoneScript: string;        // Kịch bản gọi điện thoại tư vấn 3 phương án
  zaloMessage: string;        // Mẫu tin nhắn Zalo gửi sếp/khách hàng xem nhanh
  formalEmail: string;        // Mẫu email gửi phòng thu mua / Giám đốc Logistics
  objectionKiller: string;    // Kịch bản xử lý khi khách hàng so sánh với đối thủ
}

export interface MultiOptionQuotationPackage {
  id: string;
  packageCode: string;        // Mã gói báo giá (vd: "MOQ-2026-0881")
  quoteId: string;            // ID báo giá gốc
  quoteNumber: string;        // Mã báo giá gốc (vd: "LOG-2026-0701")
  createdDate: string;        // Ngày tạo
  validUntil: string;         // Hiệu lực đến ngày
  customer: CustomerInfo;     // Khách hàng
  shipment: ShipmentDetails;  // Chi tiết lô hàng
  cargoSummary: string;       // Tóm tắt loại hàng & thể tích/khối lượng
  exchangeRate: number;       // Tỷ giá áp dụng (VND/USD)
  quoteCurrency: 'USD' | 'VND'; // Loại tiền chính
  options: MultiOptionItem[]; // Danh sách các phương án so sánh (2-4 phương án, mặc định 3)
  selectedOptionId?: string;  // Phương án được chọn (khi khách chốt)
  status: 'DRAFT' | 'READY' | 'SENT' | 'ACCEPTED' | 'REJECTED';
  salesRepName: string;
  salesRepPhone: string;
  salesRepEmail: string;
  clientDecisionReason?: string; // Lý do khách hàng chọn phương án này
  notesAndTerms: string;      // Điều kiện thương mại chung
  pitchDecks: MultiOptionPitchDecks;
  updatedAt: string;
}
