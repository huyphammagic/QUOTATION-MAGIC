/**
 * Logistics Quotation Management Platform - Phase 61 (Gợi Ý 4)
 * "Golden Hour" Smart Follow-Up & Intent Trigger Engine
 * Hệ Thống Bắt Nhịp "Giờ Vàng" Chốt Đơn & Đọc Vị Ý Định Khách Hàng
 */

export type BuyerIntentLevel = 
  | 'READY_TO_BUY'       // Cực nóng (90 - 100%): Mở lại >= 3 lần, xem mục ký duyệt / cước biển
  | 'PRICE_EVALUATION'   // Đang cân nhắc giá (70 - 89%): Dừng lại ở bảng cước > 60s
  | 'COMPARING_OPTIONS'  // So sánh đối thủ (50 - 69%): Xem nhiều lần nhưng chưa hành động
  | 'CASUAL_BROWSING';   // Xem lướt (< 50%): Mở xem sơ bộ dưới 20s

export type IntentTriggerType =
  | 'MULTIPLE_REVISITS_SAME_DAY'   // Xem lại >= 3 lần trong ngày
  | 'DEEP_DWELL_ON_PRICING'        // Dừng lại lâu ở bảng chi phí cước (> 60s)
  | 'SIGNATURE_SECTION_INSPECTED'  // Lăn chuột tới khu vực chữ ký / phê duyệt
  | 'PDF_DOWNLOAD_AND_RETURN'      // Đã tải file PDF và sau đó mở lại link trực tuyến
  | 'PEAK_COMMERCIAL_HOURS'        // Khách đang xem trong khung giờ ra quyết định (09h30 - 11h30, 14h00 - 16h00)
  | 'EXPIRING_SOON_VIEW';          // Xem lại đúng lúc báo giá sắp hết hạn (còn < 48h)

export interface CallScriptTemplate {
  hookVi: string;          // Câu mở đầu phá vỡ sự ngại ngùng (Ice-breaker)
  pitchVi: string;         // Lời chào giải tỏa mối bận tâm chính
  closingQuestionVi: string;// Câu hỏi chốt chặn dứt điểm
  zaloQuickNoteVi: string; // Tin nhắn Zalo gửi ngay nếu khách không bắt máy
}

export interface GoldenHourLeadEvent {
  id: string;
  quotationId: string;
  quotationNumber: string;
  customerName: string;
  contactPerson: string;
  customerPhone: string;
  customerEmail: string;
  carrier: string;
  pol: string;
  pod: string;
  grandTotalUsd: number;
  intentLevel: BuyerIntentLevel;
  intentScore: number; // 0 - 100
  triggerType: IntentTriggerType;
  triggerTitleVi: string;
  triggerDescriptionVi: string;
  detectedAt: string; // ISO format
  goldenWindowRemainingMinutes: number; // Đếm ngược thời gian vàng (thường 45 phút kể từ lúc khách vừa xem)
  isCurrentlyOnline: boolean;
  viewCountTotal: number;
  timeSpentSeconds: number;
  callScript: CallScriptTemplate;
  isFollowedUp: boolean;
  followedUpAt?: string;
  followUpOutcome?: 'WON_BOOKING' | 'REQUESTED_DISCOUNT' | 'SEND_UPDATED_SCHEDULE' | 'BUSY_CALL_LATER' | 'LOST_TO_COMPETITOR';
  followUpNotes?: string;
}

export interface FollowUpOutcomePayload {
  leadId: string;
  outcome: 'WON_BOOKING' | 'REQUESTED_DISCOUNT' | 'SEND_UPDATED_SCHEDULE' | 'BUSY_CALL_LATER' | 'LOST_TO_COMPETITOR';
  notes: string;
  nextFollowUpDate?: string;
}
