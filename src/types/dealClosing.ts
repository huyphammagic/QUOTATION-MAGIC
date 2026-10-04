/**
 * Logistics Quotation Management Platform - Phase 55 (Gói B)
 * Smart Deal-Closing Accelerator & Objection Handling Suite
 * Bàn Đàm Phán Tức Thời, Bảo Vệ Biên Lợi Nhuận, Vũ Khí Giá Trị Gia Tăng & Kịch Bản Chốt Sale Đỉnh Cao
 */

export type FloorPriceStatus = 'SAFE' | 'WARNING' | 'BREACH';

export interface DealNegotiationSimulation {
  quotationId: string;
  quotationNumber: string;
  customerName: string;
  originalTotal: number;
  originalCost: number;
  originalProfit: number;
  originalMarginPercent: number;
  currency: string;
  
  // Proposed Customer Counter-Offer / Negotiation Input
  proposedCustomerTotal: number;
  proposedDiscountAmount: number;
  proposedDiscountPercent: number;
  
  // Simulated Results
  simulatedNetProfit: number;
  simulatedMarginPercent: number;
  
  // Floor Price Safeguard
  floorPriceThreshold: number; // Minimum revenue to maintain minimum target margin (e.g. 8%)
  floorStatus: FloorPriceStatus;
  requiresManagerApproval: boolean;
  approvalReason?: string;
  
  // Smart Recommendation
  recommendedCounterPrice: number;
  recommendedCounterReason: string;
}

export type ConcessionCategory = 
  | 'DEM_DET' 
  | 'PAYMENT' 
  | 'CUSTOMS' 
  | 'INSURANCE' 
  | 'STORAGE' 
  | 'PRIORITY';

export interface ValueAddConcession {
  id: string;
  code: string;
  nameVi: string;
  nameEn: string;
  category: ConcessionCategory;
  perceivedValue: number; // Giá trị cảm nhận khách thấy (USD / VND)
  companyCost: number;    // Chi phí thực tế công ty bỏ ra
  currency: string;
  descriptionVi: string;
  descriptionEn: string;
  isSelected: boolean;
  logisticsBadgeVi: string;
  logisticsBadgeEn: string;
  termsAndConditions: string;
}

export type FlashDiscountType = 'FIXED_PER_CONTAINER' | 'FIXED_TOTAL' | 'PERCENTAGE';

export interface FlashIncentive {
  id: string;
  code: string;
  titleVi: string;
  titleEn: string;
  discountType: FlashDiscountType;
  discountAmount: number;
  currency: string;
  expiresAt: string; // ISO 8601
  durationHours: number;
  urgentReasonVi: string;
  urgentReasonEn: string;
  isActive: boolean;
  badgeVi: string;
}

export type ObjectionType = 
  | 'PRICE_TOO_HIGH'
  | 'COMPETITOR_LOWER'
  | 'PAYMENT_TERMS'
  | 'AWAITING_BOSS'
  | 'CARGO_NOT_READY'
  | 'PEAK_SEASON_SPACE';

export interface ObjectionBattlecard {
  id: string;
  type: ObjectionType;
  titleVi: string;
  titleEn: string;
  customerVoice: string; // Câu khách hàng hay nói
  rootConcern: string;   // Bản chất lo lắng thực sự
  winningStrategy: string; // Chiến thuật xử lý
  battlePoints: string[];  // Luận điểm thép
  suggestedConcessions: string[]; // Concession IDs nên đem ra trao đổi
  callScriptVi: string;    // Kịch bản lời thoại khi sales gọi điện thoại
  closingQuestion: string; // Câu hỏi chốt hạ
}

export interface QuickClosingMessage {
  channel: 'ZALO' | 'WHATSAPP' | 'EMAIL';
  title: string;
  messageText: string;
  actionLink: string;
}

export interface DealOutcomeRecord {
  id: string;
  quotationId: string;
  quotationNumber: string;
  customerName: string;
  companyId: string;
  outcome: 'WON' | 'LOST' | 'NEGOTIATING';
  closedPrice: number;
  originalPrice: number;
  discountGiven: number;
  currency: string;
  netProfit: number;
  marginPercent: number;
  selectedConcessions: ValueAddConcession[];
  flashIncentive?: FlashIncentive;
  winLossReason: string;
  notes?: string;
  closedBy: string;
  closedAt: string;
  autoCreatedShipmentId?: string;
}
