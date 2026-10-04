/**
 * Logistics Quotation Management Platform - Phase 56 (Ý Tưởng 1)
 * AI Smart RFQ Inbox & 5-Second Quote Generator Types
 * Hộp Thư Yêu Cầu Chào Giá RFQ Thông Minh & Tự Động Tạo Báo Giá Trong 5 Giây
 */

import { TransportMode, ContainerType, IncotermCode, QuoteData, LineItem } from './logistics';

export type RfqStatus = 'NEW' | 'MATCHED' | 'QUOTED' | 'DISMISSED';

export type RfqSource = 'ZALO' | 'EMAIL' | 'SKYPE' | 'EXCEL' | 'WEB_FORM' | 'PHONE_NOTE';

export type RfqUrgency = 'URGENT' | 'HIGH' | 'NORMAL';

export interface RfqCustomerData {
  customerName: string;
  companyName: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  taxId?: string;
}

export interface RfqShipmentSpecs {
  mode: TransportMode;
  pol: string; // Port of Loading
  pod: string; // Port of Discharge
  commodity: string;
  containerType: ContainerType;
  quantity: number;
  grossWeightKg?: number;
  volumeCbm?: number;
  cargoReadyDate?: string;
  targetPrice?: number;
  targetCurrency?: 'USD' | 'VND';
  incoterm?: IncotermCode;
  freeTimeRequired?: string;
  specialNotes?: string[];
}

export interface RfqRateMatchOption {
  rateId: string;
  carrierName: string;
  carrierCode?: string;
  serviceType: string;
  transitTimeDays?: number;
  baseCost: number;
  baseSell: number;
  marginPercent: number;
  estimatedProfit: number;
  currency: 'USD' | 'VND';
  freeTimeDemDet: string;
  validityDate: string;
  suggestedLocalCharges: Array<{
    code: string;
    name: string;
    unitPrice: number;
    currency: 'USD' | 'VND';
    unit: string;
    type: string;
  }>;
}

export interface SmartRfqItem {
  id: string;
  companyId: string;
  rfqNumber: string;
  source: RfqSource;
  rawText: string;
  status: RfqStatus;
  urgency: RfqUrgency;
  customer: RfqCustomerData;
  shipment: RfqShipmentSpecs;
  
  // AI Extraction Meta
  confidenceScore: number; // 0 - 100
  extractedAt: string;
  missingFields: string[];
  suggestedFollowUpQuestions: string[];
  
  // Master Rate Matching
  matchedRates?: RfqRateMatchOption[];
  selectedMatchIndex?: number;
  
  // Quote Conversion Link
  convertedQuotationId?: string;
  convertedQuotationNumber?: string;
  convertedAt?: string;
  convertedBy?: string;
  
  createdAt: string;
  updatedAt: string;
}
