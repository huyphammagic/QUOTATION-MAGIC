/**
 * Phase 45: Customer Relationship, Rate Review & Sales Follow-Up Intelligence Engine Types
 * Real Logistics-specific CRM, Rate Review Workflow, and Sales Follow-up models.
 */

import { ShipmentServiceMode } from './shipment';

// ==========================================
// 1. Customer Health & Priority
// ==========================================
export type CustomerHealthStatus = 
  | 'HEALTHY' 
  | 'NEEDS_ATTENTION' 
  | 'FOLLOW_UP_REQUIRED' 
  | 'RATE_REVIEW_REQUIRED' 
  | 'DORMANT'
  | 'CHURN_RISK'
  | 'LOYAL';

export type CustomerPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'VIP';

export interface HealthScoreIndicator {
  code: string;
  label: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  reason: string;
  scoreDelta: number;
}

export interface CustomerHealthScore {
  score: number; // 0 - 100
  status: CustomerHealthStatus;
  primaryReason: string;
  indicators: HealthScoreIndicator[];
  calculatedAt: string;
  lastContactDate?: string;
  lastQuotationDate?: string;
  lastShipmentDate?: string;
  openQuotationsCount: number;
  expiringQuotationsCount: number;
  activeContractsCount: number;
  overdueFollowUpsCount: number;
}

// ==========================================
// 2. Customer Contact Person
// ==========================================
export interface CustomerContact {
  id: string;
  companyId: string;
  customerId: string;
  name: string;
  title?: string; // e.g. Logistics Manager, Purchasing Lead
  email: string;
  phone?: string;
  isPrimary?: boolean;
  department?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CustomerContactPerson = CustomerContact;

// ==========================================
// 3. Customer Activity & Unified Timeline
// ==========================================
export type CustomerActivityType = 
  | 'CALL'
  | 'EMAIL'
  | 'MEETING'
  | 'CHAT_NOTE'
  | 'QUOTATION_CREATED'
  | 'QUOTATION_SENT'
  | 'QUOTATION_VIEWED'
  | 'QUOTATION_ACCEPTED'
  | 'QUOTATION_REJECTED'
  | 'SHIPMENT_CREATED'
  | 'SHIPMENT_COMPLETED'
  | 'RATE_UPDATED'
  | 'CONTRACT_UPDATED'
  | 'FOLLOW_UP_CREATED'
  | 'FOLLOW_UP_COMPLETED'
  | 'NOTE_ADDED'
  | 'DOCUMENT_SENT'
  | 'RATE_REVIEW_DUE';

export interface CustomerActivity {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  activityType: CustomerActivityType;
  occurredAt: string; // ISO 8601
  createdBy: string;
  createdByName: string;
  relatedEntityType?: 'QUOTATION' | 'SHIPMENT' | 'RATE' | 'CONTRACT' | 'CUSTOMER' | 'OPPORTUNITY';
  relatedEntityId?: string;
  relatedEntityNumber?: string;
  summary: string;
  details?: string;
  nextAction?: string;
  nextActionDue?: string;
  visibility: 'INTERNAL' | 'PUBLIC';
  createdAt: string;
  updatedAt: string;
}

export type CustomerActivityLog = CustomerActivity;

// ==========================================
// 4. Customer Follow-Up Engine
// ==========================================
export type CRMFollowUpStatus = 
  | 'OPEN' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'SNOOZED' 
  | 'CANCELLED' 
  | 'OVERDUE';

export type CRMFollowUpPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type CRMFollowUpType = 
  | 'CALL' 
  | 'EMAIL' 
  | 'MEETING' 
  | 'RATE_CHECK' 
  | 'QUOTATION_FOLLOWUP' 
  | 'SHIPMENT_CARE' 
  | 'CONTRACT_RENEWAL'
  | 'GENERAL';

export interface CustomerFollowUp {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  relatedEntityType?: 'QUOTATION' | 'SHIPMENT' | 'RATE' | 'CONTRACT' | 'CUSTOMER' | 'OPPORTUNITY';
  relatedEntityId?: string;
  relatedEntityNumber?: string;
  ownerId: string;
  ownerName: string;
  team?: string;
  followUpType: CRMFollowUpType;
  priority: CRMFollowUpPriority;
  dueDate: string; // ISO 8601
  status: CRMFollowUpStatus;
  notes: string;
  nextAction?: string;
  completedAt?: string;
  completedBy?: string;
  completionNote?: string;
  snoozedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 5. Rate Review Engine & Calendar
// ==========================================
export type RateReviewFrequency = 
  | 'WEEKLY' 
  | 'BIWEEKLY' 
  | 'MONTHLY' 
  | 'QUARTERLY' 
  | 'CUSTOM';

export interface RateReviewSchedule {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  serviceMode: ShipmentServiceMode;
  origin: string;
  destination: string;
  lane: string;
  incoterm?: string;
  rateType: 'BUY' | 'SELL' | 'CONTRACT' | 'CUSTOMER_SPECIFIC';
  relatedContractId?: string;
  relatedContractNumber?: string;
  relatedRateId?: string;
  frequency: RateReviewFrequency;
  customDays?: number;
  nextReviewDate: string; // ISO 8601
  lastReviewedDate?: string;
  ownerId: string;
  ownerName: string;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type RateReviewWorkflowStatus = 
  | 'REVIEW_REQUIRED'
  | 'UNDER_REVIEW'
  | 'RATE_DATA_COLLECTED'
  | 'PRICING_ANALYSIS'
  | 'PROPOSAL_READY'
  | 'USER_CONFIRMED'
  | 'CUSTOMER_RATE_UPDATED'
  | 'FOLLOW_UP_REQUIRED'
  | 'COMPLETED'
  | 'CANCELLED';

export type RateReviewStatus = RateReviewWorkflowStatus;

export interface RateReviewTask {
  id: string;
  companyId: string;
  scheduleId?: string;
  customerId: string;
  customerName: string;
  serviceMode: ShipmentServiceMode;
  origin: string;
  destination: string;
  lane: string;
  incoterm?: string;
  
  // Rate details for comparison
  currentBuyRate?: number;
  currentSellRate?: number;
  previousRate?: number;
  recommendedNewRate?: number;
  proposedBuyRate?: number;
  proposedSellRate?: number;
  proposedMargin?: number;
  difference?: number;
  differencePercent?: number;
  currency: string;
  currentMargin?: number;
  targetMargin?: number;
  
  supplierId?: string;
  supplierName?: string;
  carrierId?: string;
  carrierName?: string;
  carrier?: string;
  
  validFrom?: string;
  validUntil?: string;
  quotationUsageCount?: number;
  
  status: RateReviewWorkflowStatus;
  dueAt: string; // ISO 8601
  ownerId: string;
  ownerName: string;
  
  reason: string;
  evidenceData: string;
  suggestedAction: string;
  notes?: string;
  reviewerNotes?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 6. Customer Opportunity Management
// ==========================================
export type OpportunityStage = 
  | 'NEW'
  | 'QUALIFICATION'
  | 'QUOTATION'
  | 'FOLLOW_UP'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'ON_HOLD'
  | 'CLOSED';

export interface CustomerOpportunity {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  title: string;
  lane: string;
  origin: string;
  destination: string;
  serviceMode: ShipmentServiceMode;
  incoterm?: string;
  
  estimatedFrequency?: string; // e.g. "2 x 40HC/tháng"
  estimatedVolume?: string;    // e.g. "50 CBM"
  expectedStartDate?: string;
  estimatedValue?: number;
  currency?: string;
  
  ownerId: string;
  ownerName: string;
  stage: OpportunityStage;
  probability?: number; // 0 - 100
  
  notes?: string;
  nextAction?: string;
  nextActionDue?: string;
  
  relatedQuotationIds?: string[];
  lostReason?: string;
  wonAt?: string;
  closedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 7. Rule-Based Smart Recommendation
// ==========================================
export type RecommendationTriggerType = 
  | 'QUOTATION_EXPIRING'
  | 'QUOTATION_NO_RESPONSE'
  | 'QUOTATION_REJECTED'
  | 'QUOTATION_ACCEPTED'
  | 'CUSTOMER_DORMANT'
  | 'CUSTOMER_RATE_EXPIRING'
  | 'CONTRACT_EXPIRING'
  | 'SHIPMENT_POST_CARE'
  | 'FOLLOWUP_OVERDUE'
  | 'HIGH_DEMAND_LANE'
  | 'RATE_REVIEW_DUE';

export interface SmartCRMRecommendation {
  id: string;
  type: RecommendationTriggerType;
  title: string;
  reason: string;
  evidenceData: string;
  suggestedAction: string;
  priority: CRMFollowUpPriority;
  urgency?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
  customerId: string;
  customerName: string;
  relatedEntityType: 'QUOTATION' | 'SHIPMENT' | 'RATE' | 'CONTRACT' | 'CUSTOMER' | 'OPPORTUNITY';
  relatedEntityId: string;
  relatedEntityNumber?: string;
  actionPayload?: Record<string, any>;
  detectedAt: string;
}

// ==========================================
// 8. Service & Lane Interest Summary
// ==========================================
export interface CustomerServiceInterest {
  mode: ShipmentServiceMode;
  quoteCount: number;
  shipmentCount: number;
  lastUsedDate?: string;
}

export interface CustomerLaneInterest {
  lane: string;
  origin: string;
  destination: string;
  mode: ShipmentServiceMode;
  count: number;
  lastUsedDate?: string;
}

// ==========================================
// 9. Dashboard / Today Summary Counts
// ==========================================
export interface CRMDashboardSummary {
  totalActiveCustomers: number;
  customersNeedingAttention: number;
  followUpsDueToday: number;
  overdueFollowUps: number;
  quotationsExpiringSoon: number;
  rateReviewsDue: number;
  customerRatesExpiringSoon: number;
  openOpportunities: number;
  reactivationOpportunities: number;
  completedActionsToday: number;
}
