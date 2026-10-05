/**
 * Logistics Quotation Management Platform - Phase 63 (Chức Năng 1)
 * Enterprise Multi-Lane RFQ & Portfolio Tender Engine Types
 * Cỗ Máy Đấu Thầu Ma Trận Tuyến Nhà Máy Quy Mô Lớn & Tối Ưu Hóa Biên Lợi Nhuận Toàn Danh Mục
 */

export type TenderStatus = 
  | 'DRAFT'           // Đang dựng ma trận thầu
  | 'OPTIMIZING'      // Đang cân đối biên lãi danh mục
  | 'SUBMITTED'       // Đã nộp hồ sơ thầu cho nhà máy
  | 'SHORTLISTED'     // Lọt vào vòng đàm phán chung kết
  | 'WON'             // Đã trúng thầu
  | 'LOST';           // Trượt thầu

export type LaneTenderStrategy = 
  | 'VOLUME_DRIVER'   // Tuyến sản lượng lớn: Lãi mỏng (3 - 6%) để đè bẹp đối thủ giành thầu
  | 'PROFIT_DRIVER'   // Tuyến ngách/phức tạp: Lãi dày (12 - 18%) để tối đa hóa lợi nhuận bù đắp
  | 'BALANCED';       // Tuyến trung hòa (7 - 11%)

export interface TenderLaneItem {
  id: string;
  pol: string;                    // Cảng đi (POL)
  pod: string;                    // Cảng đến (POD)
  factoryPlantOrigin: string;     // Nhà máy / KCN xuất phát (VD: KCN VSIP Bình Dương)
  transportMode: 'SEA_FCL' | 'AIR_FREIGHT' | 'INLAND_TRUCKING';
  containerType: "20'GP" | "40'GP" | "40'HC" | "40'RF";
  annualVolumeTeu: number;        // Sản lượng dự kiến cả năm (TEU)
  carrierSuggested: string;       // Hãng tàu chỉ định / đối tác chính
  transitTimeDays: number;        // Thời gian vận chuyển (ngày)
  freeTimeDays: number;           // Số ngày miễn phí lưu bãi DEM/DET
  baseCostUsd: number;            // Giá vốn cước ($/cont)
  clientTargetPriceUsd: number;   // Giá trần nhà máy yêu cầu ($/cont)
  proposedSellPriceUsd: number;   // Giá chào thầu của công ty ($/cont)
  strategy: LaneTenderStrategy;   // Chiến lược tuyến
  unitProfitUsd: number;          // Lợi nhuận trên từng container ($)
  totalAnnualProfitUsd: number;   // Tổng lợi nhuận cả năm của tuyến ($)
  marginPercent: number;          // Biên lợi nhuận (%)
  winProbabilityPercent: number;  // Xác suất thắng thầu trên tuyến (0 - 100%)
  notesVi?: string;
}

export interface EnterpriseTenderProject {
  id: string;
  tenderCode: string;             // Mã gói thầu (VD: TND-2026-PHONGPHU)
  titleVi: string;                // Tên gói thầu
  customerName: string;           // Tên nhà máy / tập đoàn
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  industrySector:                 // Ngành hàng sản xuất
    | 'Dệt May & Thời Trang'
    | 'Điện Tử & Bán Dẫn'
    | 'Đồ Gỗ & Nội Thất'
    | 'Cơ Khí Chính Xác'
    | 'Thủy Sản & Nông Sản Chế Biến';
  contractPeriodMonths: number;   // Thời hạn hợp đồng thầu (thường 6, 12, 24 tháng)
  submissionDeadline: string;     // Hạn chót nộp thầu (YYYY-MM-DD)
  status: TenderStatus;
  totalLanesCount: number;        // Tổng số tuyến trong ma trận
  totalAnnualVolumeTeu: number;   // Tổng sản lượng cả gói thầu (TEU/năm)
  totalTenderRevenueUsd: number;  // Tổng doanh thu dự kiến ($/năm)
  totalTenderCostUsd: number;     // Tổng chi phí vốn ($/năm)
  totalAnnualGrossProfitUsd: number; // Tổng lợi nhuận gộp cả năm ($/năm)
  blendedMarginPercent: number;   // Biên lợi nhuận gộp toàn danh mục (%)
  estimatedWinProbabilityPercent: number; // Xác suất trúng thầu tổng thể (%)
  lanes: TenderLaneItem[];
  executiveSummaryVi: string;     // Tóm tắt chiến lược cho Ban Giám Đốc nhà máy
  slaCommitmentsVi: string[];     // Các cam kết SLA then chốt (OTP, Booking lead-time)
  createdDate: string;
  updatedDate: string;
}

export interface PortfolioOptimizationParams {
  targetBlendedMarginPercent: number; // Biên lợi nhuận mục tiêu (ví dụ 8.5% - 10%)
  volumeDriverMarginMax: number;      // Trần biên lãi cho tuyến Volume Driver (ví dụ 5%)
  profitDriverMarginMin: number;      // Sàn biên lãi cho tuyến Profit Driver (ví dụ 14%)
}
