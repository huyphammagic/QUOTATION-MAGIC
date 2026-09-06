import { Currency, TransportMode } from './logistics';

export type MarginStatus = 
  | 'ABOVE_TARGET'    // Biên lãi >= Target Margin
  | 'AT_TARGET'       // Biên lãi = Target Margin (+- 0.5%)
  | 'BELOW_TARGET'    // Minimum Margin <= Biên lãi < Target Margin (Cần chú ý)
  | 'BELOW_MINIMUM'   // Biên lãi < Minimum Margin (Yêu cầu cấp quản lý duyệt hoặc giải trình)
  | 'BLOCKED'         // Biên lãi < Critical Threshold (Không được bán)
  | 'NO_COST'         // Chưa có giá vốn (Cost = 0)
  | 'NO_SELL';        // Chưa có giá bán (Sell = 0)

export type PricingPolicyScope = 
  | 'GLOBAL'             // Áp dụng toàn công ty
  | 'CUSTOMER'           // Khách hàng cụ thể
  | 'CUSTOMER_SEGMENT'   // Phân khúc khách hàng (VIP, STRATEGIC, STANDARD)
  | 'SERVICE_MODE'       // Phương thức vận chuyển (SEA_FCL, AIR, TRUCKING...)
  | 'TRADE_LANE';        // Tuyến cụ thể (POL - POD)

export type PriceFloorType = 
  | 'MIN_MARGIN'        // Dựa trên Minimum Margin %
  | 'MIN_PROFIT'        // Dựa trên Lợi nhuận gộp tối thiểu (số tiền)
  | 'HIGHER_OF_BOTH';   // Lấy giá trị cao hơn giữa Margin và Profit

export type ApprovalLevel = 
  | 'AUTO_ELIGIBLE'      // Tự động đủ điều kiện duyệt / xuất báo giá
  | 'SALES_MANAGER'      // Cần Trưởng phòng kinh doanh duyệt
  | 'MANAGEMENT'         // Cần Ban Giám Đốc / Pricing Manager duyệt
  | 'BLOCKED';           // Bị chặn phát hành

export interface PolicyApprovalThresholds {
  autoEligibleMargin: number;         // e.g. >= 20%
  salesManagerApprovalMargin: number; // e.g. 15% - 19.99%
  managementApprovalMargin: number;   // e.g. 10% - 14.99%
  blockMargin: number;                // e.g. < 10%
}

export interface PricingPolicyItem {
  id: string;
  companyId?: string;
  policyCode: string;                 // E.g. POL-DEF-001, POL-AIR-001, POL-CUST-VINATEX
  policyName: string;
  scope: PricingPolicyScope;
  targetId?: string;                  // customerId, customerCode, segment name, or transportMode
  targetName?: string;
  
  // Targets & Minimums
  targetMarginPercent: number;        // e.g. 20 (20%)
  minimumMarginPercent: number;       // e.g. 15 (15%)
  targetProfitAmount?: number;        // e.g. 300 (USD)
  minimumProfitAmount?: number;       // e.g. 100 (USD)
  maximumDiscountPercent?: number;    // e.g. 25 (25%)
  priceFloorType: PriceFloorType;
  currency: Currency;

  // Multi-tier Approval Thresholds
  approvalThresholds: PolicyApprovalThresholds;

  // Validity & Status
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  effectiveDate: string;              // YYYY-MM-DD
  expiryDate: string;                 // YYYY-MM-DD
  version: number;
  priority: number;                   // 100: Customer, 80: Segment, 60: Mode, 40: Global
  notes?: string;

  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface LineProfitabilityDetail {
  itemId: string;
  code: string;
  description: string;
  category: string;
  location?: string;
  currency: Currency;
  quantity: number;
  unit: string;
  costUnitPrice: number;
  sellUnitPrice: number;
  totalCostUsd: number;
  totalCostVnd: number;
  totalSellUsd: number;
  totalSellVnd: number;
  profitUsd: number;
  profitVnd: number;
  marginPercent: number;
  markupPercent: number;
  priceSource?: string;
  priceTraceability?: string;
}

export interface ProfitMarginSummary {
  // Baseline Totals (Dual Currency)
  totalBuyCostUsd: number;
  totalBuyCostVnd: number;
  totalSellUsd: number;
  totalSellVnd: number;
  
  // Profit & Margins
  grossProfitUsd: number;
  grossProfitVnd: number;
  grossMarginPercent: number;         // (Gross Profit / Total Sell) * 100
  markupPercent: number;              // (Gross Profit / Total Buy Cost) * 100
  
  // Policy References & Thresholds
  targetMarginPercent: number;        // e.g. 20%
  minimumMarginPercent: number;       // e.g. 15%
  targetProfitUsd: number;
  minimumProfitUsd: number;
  
  // Calculated Price Recommendations & Floor
  recommendedSellPriceUsd: number;    // Total Cost / (1 - Target Margin)
  recommendedSellPriceVnd: number;
  minimumSellPriceUsd: number;        // Price Floor (Total Cost / (1 - Min Margin))
  minimumSellPriceVnd: number;
  maximumDiscountUsd: number;         // Current Sell - Minimum Sell (>= 0)
  maximumDiscountPercent: number;     // (Max Discount / Current Sell) * 100
  
  // Health & Approval Assessment
  marginStatus: MarginStatus;
  approvalLevel: ApprovalLevel;
  isBelowTarget: boolean;
  isBelowMinimum: boolean;
  isBlocked: boolean;
  
  // Natural Language Traceability & Explanations
  statusExplanationVi: string;
  statusExplanationEn: string;
  policySnapshot: {
    policyId: string;
    policyCode: string;
    policyName: string;
    scope: PricingPolicyScope;
    version: number;
  };

  // Line-by-line profit details
  lineDetails: LineProfitabilityDetail[];
}

export type WhatIfAdjustmentMode = 
  | 'TARGET_MARGIN'        // Điều chỉnh theo % Biên lợi nhuận (Target Margin %)
  | 'DIRECT_SELL'          // Điều chỉnh trực tiếp Tổng giá bán (Target Sell Amount)
  | 'DISCOUNT_PERCENT'     // Điều chỉnh theo % Giảm giá / Chiết khấu (Discount %)
  | 'TARGET_PROFIT';       // Điều chỉnh theo Lợi nhuận gộp mong muốn (Target Profit Amount)

export interface WhatIfScenarioRequest {
  mode: WhatIfAdjustmentMode;
  targetMarginPercent?: number;
  targetSellPrice?: number;
  discountPercent?: number;
  targetProfitAmount?: number;
  currency?: Currency;
}

export interface WhatIfScenarioResult {
  request: WhatIfScenarioRequest;
  originalSummary: ProfitMarginSummary;
  simulatedSummary: ProfitMarginSummary;
  diffSellUsd: number;
  diffSellVnd: number;
  diffProfitUsd: number;
  diffProfitVnd: number;
  diffMarginPercent: number;
  isFeasible: boolean;
  requiresManagerApproval: boolean;
  requiresDirectorApproval: boolean;
  isPriceFloorViolated: boolean;
  warningMessageVi?: string;
  warningMessageEn?: string;
}

export interface PricingAuditRecord {
  id: string;
  quotationId: string;
  quotationNumber: string;
  action: 
    | 'PRICE_OVERRIDE' 
    | 'MARGIN_OVERRIDE' 
    | 'DISCOUNT_APPLIED' 
    | 'WHAT_IF_APPLIED' 
    | 'POLICY_APPLIED' 
    | 'PRICE_LOCKED';
  userId: string;
  userName: string;
  timestamp: string;
  oldValue: any;
  newValue: any;
  reason?: string;
  notes?: string;
}

export interface UserProfitPermissions {
  canViewCost: boolean;           // Xem giá vốn mua (BUY COST)
  canViewProfit: boolean;         // Xem lợi nhuận gộp & Gross Margin %
  canEditPricing: boolean;        // Chỉnh sửa giá bán
  canApplyWhatIf: boolean;        // Áp dụng mô phỏng What-If vào báo giá
  canOverrideMargin: boolean;     // Cho phép bán dưới biên lãi tối thiểu (với lý do)
  canApproveLowMargin: boolean;   // Phê duyệt báo giá dưới ngưỡng biên lãi
}
