/**
 * Logistics Quotation Management Platform - Phase 58 (Lựa Chọn 2)
 * Automated Customer Re-engagement & Lane Replenishment Radar
 * Cỗ Máy Đánh Thức Khách Hàng Cũ & Khai Thác Đơn Hàng Chu Kỳ Xuất Khẩu
 */

import { TransportMode, ContainerType, Currency } from './logistics';

export type ShipperCadenceType = 
  | 'WEEKLY'        // Xuất hàng hàng tuần (ví dụ: nông sản tươi, thực phẩm)
  | 'BIWEEKLY'      // 2 tuần/lần (hàng dệt may, gia công)
  | 'MONTHLY'       // 1 tháng/lần (nguyên vật liệu sản xuất)
  | 'QUARTERLY'     // Hàng quý (máy móc, thiết bị dự án)
  | 'SEASONAL'      // Theo mùa (mùa cà phê, hạt điều, đồ gỗ Q3-Q4)
  | 'IRREGULAR';    // Xuất không đều đặn

export type ShipperHealthStatus = 
  | 'ACTIVE_NORMAL'       // Khách vẫn đang giao dịch đều đặn đúng chu kỳ
  | 'APPROACHING_CYCLE'   // Sắp đến chu kỳ đóng hàng kế tiếp (còn 3-5 ngày) -> Cần liên hệ ngay
  | 'DORMANT_30D'         // Đã trễ chu kỳ 30 ngày -> Nguy cơ bị đối thủ khác tiếp cận
  | 'DORMANT_60D_PLUS'    // Trễ chu kỳ trên 60 ngày -> Tài khoản ngủ đông
  | 'CHURN_CRITICAL';     // Báo động đỏ: Có dấu hiệu chuyển hẳn sang nhà vận chuyển khác

export interface ShipperLaneHistory {
  pol: string;
  pod: string;
  mode: TransportMode;
  containerType: ContainerType;
  commodity: string;
  typicalVolumePerShipment: number;
  totalHistoricalVolume: number;
  historicalQuotesCount: number;
  lastShipmentDate: string;
  preferredCarrier?: string;
  lastQuotedPriceUsd?: number;
}

export interface ReactivationOffer {
  code: string;
  title: string;
  discountUsd: number;
  freeDemDetDaysBonus: number;
  benefitDescriptionVi: string;
  expiryDays: number;
}

export interface DormantCustomerAlert {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  companyName: string;
  phone: string;
  email: string;
  contactPerson: string;
  
  healthStatus: ShipperHealthStatus;
  cadence: ShipperCadenceType;
  averageDaysBetweenShipments: number;
  daysSinceLastQuote: number;
  daysSinceLastShipment: number;
  predictedNextBookingDate: string;
  
  primaryLanes: ShipperLaneHistory[];
  suggestedOffer: ReactivationOffer;
  
  totalLifetimeRevenueUsd: number;
  riskScore: number; // 0 - 100 (100 là cực kỳ nguy cơ mất khách)
  
  lastOutreachDate?: string;
  outreachChannel?: 'ZALO' | 'EMAIL' | 'PHONE' | 'WHATSAPP';
  outreachStatus?: 'PENDING' | 'SENT' | 'REPLIED' | 'RE_QUOTED' | 'DISMISSED';
}

export interface ReEngagementPitch {
  channel: 'ZALO' | 'EMAIL' | 'WHATSAPP';
  customerName: string;
  companyName: string;
  lane: string;
  messageContent: string;
  incentiveCode: string;
}
