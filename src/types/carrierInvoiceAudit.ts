/**
 * Phase 65: Carrier Invoice Audit & Profit Leakage Guard Types
 * Cỗ Máy Tự Động Đối Soát Chi Phí Hãng Tàu & Chặn Rò Rỉ Lợi Nhuận Logistics
 */

// 1. Loại sai lệch / Bẫy rò rỉ lợi nhuận trên hóa đơn hãng tàu
export type CarrierDiscrepancyType =
  | 'UNEXPECTED_SURCHARGE'     // Xuất hiện phụ phí lạ không có trong hợp đồng/booking (vd: PSS, CIC, Emergency Congestion)
  | 'BASE_RATE_OVERCHARGE'      // Cước biển Ocean Freight thực tính cao hơn đơn giá thỏa thuận
  | 'DEM_DET_OVERBILLING'       // Hãng tàu không áp dụng đúng số ngày Free-time cam kết (tính phạt oan)
  | 'DUPLICATE_LINE_ITEM'       // Trùng lặp phí (vd: thu 2 lần phí D/O hoặc phát hành Bill)
  | 'EXCHANGE_RATE_MANIPULATION' // Áp tỷ giá ngoại tệ quy đổi cao hơn bất thường so với tỷ giá quy chuẩn VCB
  | 'QUANTITY_VOLUME_MISMATCH'  // Tính sai số lượng container (vd: thực xuất 2 cont nhưng tính phí 3 cont)
  | 'LOCAL_CHARGE_INFLATION';   // Tự ý tăng đơn giá THC, D/O, vệ sinh cont so với biểu phí niêm yết

export type AuditDiscrepancySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DisputeResolutionStatus =
  | 'PENDING_AUDIT'       // Mới nhập hóa đơn, chờ đối soát
  | 'MATCHED_CLEAN'       // Khớp 100% không phát hiện sai lệch (Được duyệt thanh toán)
  | 'DISCREPANCY_DETECTED' // Phát hiện sai lệch, đang cảnh báo
  | 'DISPUTE_FILED'       // Đã gửi công văn khiếu nại tới Hãng tàu
  | 'CREDIT_NOTE_ISSUED'  // Hãng tàu thừa nhận sai, đã hoàn tiền / phát hành Credit Note
  | 'RESOLVED_REJECTED';  // Khiếu nại bất thành (buộc phải trích chi phí dự phòng)

// 2. Chi tiết từng dòng phụ phí đối soát 3 chiều (3-Way Matching Line Item)
export interface InvoiceAuditLineItem {
  id: string;
  chargeCode: string;          // e.g. OFR, THC, D/O, PSS, DEM, SEAL
  chargeNameVi: string;        // Tên phí: Cước biển, Phí xếp dỡ cảng, Phí lệnh giao hàng...
  agreedBuyRateUsd: number;    // Giá mua cam kết với hãng tàu ban đầu
  actualInvoicedBuyUsd: number;// Số tiền hãng tàu thực tế xuất hóa đơn đòi thu
  customerSellRateUsd: number; // Giá bán đã báo cho khách hàng
  discrepancyUsd: number;      // Số tiền chênh lệch (actualInvoicedBuyUsd - agreedBuyRateUsd)
  discrepancyType?: CarrierDiscrepancyType;
  isFlagged: boolean;          // Có vi phạm / bị bẫy phụ phí không
  violationReason?: string;    // Lý do vi phạm cụ thể
}

// 3. Hồ sơ đối soát trọn gói 1 Hóa Đơn Hãng Tàu (Carrier Invoice Audit Record)
export interface CarrierInvoiceAuditRecord {
  id: string;
  companyId: string;
  shipmentId: string;
  bookingNumber: string;       // Số Booking / Bill of Lading (B/L)
  quoteNumber: string;         // Mã báo giá liên quan
  customerName: string;
  carrierName: string;         // e.g. Maersk, ONE, CMA CGM, MSC, Evergreen, Cosco
  carrierInvoiceNumber: string;// Số hóa đơn hãng tàu gửi
  invoiceDate: string;
  pol: string;
  pod: string;
  containerInfo: string;       // e.g. 2 x 40'HC, 1 x 20'GP
  
  // Tổng quan tài chính 3 chiều
  expectedTotalBuyUsd: number;
  actualInvoicedTotalBuyUsd: number;
  customerTotalSellUsd: number;
  
  // Tác động lợi nhuận
  expectedGrossProfitUsd: number;     // customerTotalSellUsd - expectedTotalBuyUsd
  actualGrossProfitIfPaidUsd: number; // customerTotalSellUsd - actualInvoicedTotalBuyUsd
  totalProfitLeakageUsd: number;      // Số tiền rò rỉ nếu thanh toán mù quáng
  profitMarginDropPercent: number;    // % sụt giảm biên lợi nhuận
  
  status: DisputeResolutionStatus;
  severity: AuditDiscrepancySeverity;
  lineItems: InvoiceAuditLineItem[];
  
  // Khiếu nại & Hành động
  carrierContactEmail?: string;
  carrierPICName?: string;
  disputeFiledDate?: string;
  resolvedDate?: string;
  recoveredAmountUsd?: number;        // Số tiền đã đòi lại thành công từ hãng tàu
  disputeNotes?: string;
  
  createdAt: string;
  updatedAt: string;
}

// 4. Thống kê & Bảng điểm uy tín thanh toán Hãng Tàu (Carrier Billing Integrity Scorecard)
export interface CarrierBillingScorecard {
  carrierName: string;
  totalInvoicesAudited: number;
  flawlessInvoicesCount: number;      // Số hóa đơn tính đúng 100%
  erroneousInvoicesCount: number;     // Số hóa đơn bị bắt lỗi
  errorRatePercent: number;           // Tỷ lệ hóa đơn sai lệch
  totalOverbilledAmountUsd: number;   // Tổng số tiền hãng tàu từng tính lố
  totalRecoveredAmountUsd: number;    // Số tiền công ty đã đòi lại thành công
  avgResolutionDays: number;          // Thời gian trung bình giải quyết khiếu nại (ngày)
  commonOverchargeTypes: CarrierDiscrepancyType[];
  reliabilityGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'; // Xếp hạng uy tín thanh toán
}

// 5. Tổng hợp dữ liệu điều hành rò rỉ lợi nhuận (Profit Leakage Metrics)
export interface ProfitLeakageGuardMetrics {
  totalInvoicesAudited: number;
  totalPreventedLeakageUsd: number;    // Tổng số tiền rò rỉ được ngăn chặn
  totalPreventedLeakageVnd: string;
  activeDisputesCount: number;         // Số hóa đơn đang tranh chấp
  activeDisputedAmountUsd: number;
  successfulRecoveryRatePercent: number; // Tỷ lệ đòi tiền thành công
  highRiskCarriersCount: number;
}
