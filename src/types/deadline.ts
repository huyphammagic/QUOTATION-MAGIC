/**
 * Smart Logistics Deadline & Action Intelligence Engine - Phase 44 Types
 * Centralized tracking for Cutoffs, Cargo Ready, Quotation Validity, ETD/ETA, Tasks, and Custom Deadlines.
 */

import { ShipmentServiceMode } from './shipment';

export type DeadlineEntityType = 
  | 'QUOTATION' 
  | 'SHIPMENT' 
  | 'TASK' 
  | 'DOCUMENT' 
  | 'MILESTONE' 
  | 'CUSTOMER'
  | 'RATE'
  | 'RATE_REVIEW'
  | 'OPPORTUNITY'
  | 'CONTRACT'
  | 'RFQ'
  | 'DECISION'
  | 'SCENARIO'
  | 'CUSTOM';

export type DeadlineType = 
  // Quotation
  | 'QUOTATION_VALID_UNTIL'
  | 'QUOTATION_EXPIRY'
  | 'QUOTATION_FOLLOWUP_DUE'
  // Phase 48: Business Actions
  | 'QUOTATION_FOLLOW_UP'
  | 'QUOTATION_REVIEW'
  | 'QUOTATION_EXPIRY_REVIEW'
  | 'PRICING_REVIEW'
  | 'MARGIN_REVIEW'
  | 'RATE_REVIEW'
  | 'RATE_EXPIRY_REVIEW'
  | 'RFQ_FOLLOW_UP'
  | 'CUSTOMER_FOLLOW_UP'
  | 'CUSTOMER_REACTIVATION'
  | 'OPPORTUNITY_FOLLOW_UP'
  | 'CONTRACT_REVIEW'
  | 'SHIPMENT_ACTION'
  | 'DOCUMENT_ACTION'
  | 'CUSTOMER_RESPONSE_REQUIRED'
  | 'SUPPLIER_RESPONSE_REQUIRED'
  | 'INTERNAL_APPROVAL'
  | 'DECISION_ACTION'
  | 'SCENARIO_EXECUTION'
  | 'CUSTOM_ACTION'
  // Shipment Ocean / General
  | 'CARGO_READY'
  | 'SI_CUTOFF'
  | 'CY_CUTOFF'
  | 'DOC_CUTOFF'
  | 'VGM_CUTOFF'
  | 'BOOKING_CUTOFF'
  | 'ETD'
  | 'ETA'
  // Air Freight
  | 'AWB_CUTOFF'
  | 'AIR_CARGO_CUTOFF'
  | 'FLIGHT_ETD'
  | 'FLIGHT_ETA'
  // Trucking / Customs / Delivery
  | 'TRUCKING_PICKUP'
  | 'TRUCKING_DELIVERY'
  | 'CUSTOMS_DECLARATION'
  | 'CUSTOMS_CLEARANCE'
  | 'POD_SUBMISSION'
  // CRM & Rate Review (Phase 45)
  | 'RATE_REVIEW_DUE'
  | 'CUSTOMER_FOLLOWUP_DUE'
  | 'CUSTOMER_RATE_EXPIRY'
  | 'CONTRACT_REVIEW_DUE'
  | 'CUSTOMER_REACTIVATION'
  // Tasks & Documents
  | 'TASK_DUE'
  | 'DOCUMENT_DUE'
  // Custom
  | 'CUSTOM_DEADLINE';

export type DeadlineStatus = 
  | 'OPEN'         // Newly created action waiting for dispatch
  | 'IN_PROGRESS'  // Actively being executed
  | 'WAITING'      // Waiting on customer, supplier, rate, internal approval
  | 'BLOCKED'      // Blocked by external impediment
  | 'UPCOMING'     // In future (> 24h)
  | 'DUE_SOON'     // Within next 24 hours
  | 'DUE_TODAY'    // Same calendar day
  | 'OVERDUE'      // Past due date without completion
  | 'COMPLETED'    // Action executed or actual event occurred
  | 'CANCELLED'    // Voided / irrelevant
  | 'SNOOZED';     // Temporarily snoozed until a later timestamp

export type ActionWaitingReason = 
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'INTERNAL_APPROVAL'
  | 'RATE'
  | 'DOCUMENTS'
  | 'FOLLOW_UP'
  | 'DECISION'
  | 'SCHEDULE'
  | 'OTHER'
  | 'NONE';

export interface ActionSubtask {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
}

export type DeadlinePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DeadlineSource = 
  | 'AUTO_QUOTATION' 
  | 'AUTO_SHIPMENT' 
  | 'AUTO_TASK' 
  | 'AUTO_MILESTONE' 
  | 'AUTO_CRM'
  | 'AUTO_RATE_REVIEW'
  | 'DECISION_WORKSPACE'
  | 'SCENARIO_ENGINE'
  | 'ACTION_CENTER'
  | 'MANUAL_USER';

export interface DeadlineEntity {
  id: string;
  companyId: string;
  entityType: DeadlineEntityType;
  entityId: string;
  entityNumber?: string;       // e.g. SHP-2026-0001, Q-2026-0001, TSK-001
  customerName?: string;
  serviceMode?: ShipmentServiceMode;
  
  deadlineType: DeadlineType;
  title: string;
  description?: string;
  actionRequired?: string;     // e.g. "Gửi SI cho Hãng tàu trước 17:00", "Follow up chốt báo giá với khách"
  
  dueAt: string;               // ISO 8601 UTC timestamp
  timezone: string;            // e.g. 'Asia/Ho_Chi_Minh'
  
  status: DeadlineStatus;
  priority: DeadlinePriority;
  
  assignedTo?: string;         // User UID
  assignedToName?: string;     // User Display Name
  department?: string;         // e.g. 'OPERATIONS', 'SALES', 'DOCUMENTATION', 'CUSTOMS'
  
  source: DeadlineSource;
  idempotencyKey: string;      // Deterministic key to prevent duplicate creation
  
  snoozedUntil?: string;       // ISO timestamp when snoozed
  snoozeCount?: number;
  
  completedAt?: string;
  completedBy?: string;
  completionEvidence?: string; // Reference to event ID, document, or manual note
  
  escalatedTo?: string;
  escalatedAt?: string;
  
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  
  // Phase 48: Smart Business Action Extensions
  actionType?: DeadlineType;
  sourceEntityType?: DeadlineEntityType;
  sourceEntityId?: string;
  sourceEntityVersion?: number;
  urgency?: 'LOW' | 'NORMAL' | 'HIGH' | 'IMMEDIATE';
  teamId?: string;
  waitingReason?: ActionWaitingReason;
  waitingReasonNote?: string;
  subtasks?: ActionSubtask[];
  
  // Relational Entities Cross-Links
  relatedCustomerId?: string;
  relatedQuotationId?: string;
  relatedShipmentId?: string;
  relatedRateId?: string;
  relatedContractId?: string;
  relatedOpportunityId?: string;
  relatedRFQId?: string;
  relatedDecisionId?: string;
  relatedScenarioId?: string;
  relatedTaskId?: string;

  relatedData?: Record<string, any>;
}

export type BusinessActionEntity = DeadlineEntity;
export type BusinessActionType = DeadlineType;
export type BusinessActionStatus = DeadlineStatus;
export type BusinessActionPriority = DeadlinePriority;

export type DeadlineAuditAction = 
  | 'CREATED'
  | 'UPDATED'
  | 'COMPLETED'
  | 'SNOOZED'
  | 'REOPENED'
  | 'ASSIGNED'
  | 'REASSIGNED'
  | 'ESCALATED'
  | 'CANCELLED';

export interface DeadlineAuditLog {
  id: string;
  deadlineId: string;
  companyId: string;
  action: DeadlineAuditAction;
  performedBy: string;
  performedByName?: string;
  timestamp: string;
  previousValue?: any;
  newValue?: any;
  note?: string;
}

export interface DeadlineFilterOptions {
  status?: DeadlineStatus | 'ALL' | 'ACTIVE'; // ACTIVE = UPCOMING, DUE_SOON, DUE_TODAY, OVERDUE, SNOOZED
  priority?: DeadlinePriority | 'ALL';
  entityType?: DeadlineEntityType | 'ALL';
  assignedTo?: string;
  onlyMine?: boolean;
  dateRange?: {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
  };
  searchQuery?: string;
  pageLimit?: number;
}

export interface DeadlineMetrics {
  total: number;
  active: number;
  overdue: number;
  dueToday: number;
  dueSoon: number;
  critical: number;
  upcoming: number;
  completed: number;
  unassigned: number;
  myItems: number;
}

export interface TimeRemainingInfo {
  isOverdue: boolean;
  isToday: boolean;
  days: number;
  hours: number;
  minutes: number;
  formattedTextVi: string;
  formattedTextEn: string;
  badgeColorClass: string;
}
