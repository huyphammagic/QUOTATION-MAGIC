/**
 * Logistics Quotation Management Platform - Phase 54
 * Real-Time Customer Engagement Telemetry & Hot Lead Radar Types
 */

export type EngagementSection = 
  | 'HEADER'
  | 'RATES_TABLE'
  | 'TERMS_PAYMENT'
  | 'SHIPMENT_SPECS'
  | 'SIGNATURE_AREA';

export type EngagementActionType = 
  | 'PAGE_OPEN'
  | 'HEARTBEAT'
  | 'PDF_DOWNLOAD'
  | 'SIGNATURE_PAD_OPEN'
  | 'COUNTER_OFFER_CLICK'
  | 'REJECT_CLICK'
  | 'PAGE_LEAVE';

export type LeadTier = 'HOT' | 'WARM' | 'ENGAGED' | 'COLD';

export interface EngagementActionRecord {
  type: EngagementActionType;
  timestamp: string;
  section?: EngagementSection;
  metadata?: Record<string, any>;
}

export interface QuotationEngagementSession {
  id: string;
  companyId: string;
  quotationId: string;
  quotationNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  linkId: string;
  startedAt: string;
  lastActiveAt: string;
  durationSeconds: number;
  sectionDurations: {
    HEADER: number;
    RATES_TABLE: number;
    TERMS_PAYMENT: number;
    SHIPMENT_SPECS: number;
    SIGNATURE_AREA: number;
  };
  deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET';
  browserInfo?: string;
  isCurrentlyActive: boolean; // Active within last 45 seconds
  hotScore: number; // 0 to 100
  leadTier: LeadTier;
  viewCount: number;
  downloadedPdf: boolean;
  openedSignature: boolean;
  submittedFeedback: boolean;
  routePol?: string;
  routePod?: string;
  totalAmount?: number;
  currency?: string;
  scoreReasons: string[];
  recommendedAction: string;
  callScript: string;
}

export interface LiveEngagementAlert {
  id: string;
  sessionId: string;
  quotationNumber: string;
  customerName: string;
  customerPhone?: string;
  timestamp: string;
  actionType: EngagementActionType;
  hotScore: number;
  leadTier: LeadTier;
  message: string;
  read: boolean;
}
