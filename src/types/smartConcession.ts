/**
 * Logistics Quotation Management Platform - Phase 62 (Gợi Ý 5)
 * Smart Concession & Margin Floor Guard Types
 * Trợ Lý Đổi Trác Điều Khoản Thông Minh & Bảo Vệ Biên Lợi Nhuận Sàn
 */

export type ConcessionStrategyType =
  | 'VOLUME_TRADEOFF'        // Đổi lấy sản lượng (Cam kết số lượng cont/tháng hoặc hợp đồng 6-12 tháng)
  | 'CASHFLOW_ACCELERATION'  // Đổi lấy dòng tiền (Thanh toán trước / ngay khi có B/L thay vì công nợ dài)
  | 'NON_CASH_PERKS'         // Bù đắp phi tiền mặt (Tặng miễn phí khai VGM/SI, Free bảo hiểm nội địa, hỗ trợ kiểm dịch)
  | 'EXCLUSIVE_FREE_TIME'    // Tặng thêm ngày Free DEM/DET thay vì bớt tiền mặt
  | 'SPLIT_DIFFERENCE_5050'; // Đàm phán cưa đôi khoảng chênh lệch (Counter-offer 50/50)

export type FeasibilityRating = 'HIGH_RECOMMENDED' | 'FEASIBLE' | 'REQUIRES_MANAGER_APPROVAL';

export interface SmartConcessionOption {
  strategyType: ConcessionStrategyType;
  titleVi: string;
  badgeVi: string;
  tradeOffConditionVi: string; // Điều kiện khách phải đáp ứng để được nhận
  concessionOfferedVi: string; // Quyền lợi công ty trao cho khách
  newFreightSellUsd: number;
  newMarginPercent: number;
  customerPerceivedValueUsd: number; // Giá trị khách cảm nhận được
  companyActualCostUsd: number;      // Chi phí thực tế công ty phải bỏ ra (rất thấp)
  marginImpactPercent: number;       // Biên lợi nhuận giảm bao nhiêu %
  feasibility: FeasibilityRating;
  salesPitchScriptVi: string;        // Lời thoại phản hồi trực tiếp cho Sales
  contractClauseSnippetVi: string;   // Điều khoản ghi vào hợp đồng/báo giá
}

export interface ConcessionSimulationInput {
  quotationId?: string;
  quoteNumber?: string;
  customerName: string;
  carrier: string;
  route: string;
  currentFreightSellUsd: number;
  currentFreightCostUsd: number;
  minMarginFloorPercent: number; // Biên an toàn tối thiểu (thường 6% - 8%)
  requestedDiscountUsd: number;  // Số tiền khách muốn giảm ($/cont hoặc tổng lô)
  containerQuantity: number;
}

export interface ConcessionSimulationResult {
  currentProfitUsd: number;
  currentMarginPercent: number;
  requestedDiscountUsd: number;
  projectedProfitIfDirectDiscountUsd: number;
  projectedMarginIfDirectDiscountPercent: number;
  isBreachingFloor: boolean;
  floorWarningVi?: string;
  allowedMaxDirectDiscountUsd: number; // Số tiền tối đa có thể giảm mà không vi phạm sàn
  options: SmartConcessionOption[];
  strategicAdviceVi: string;
}
