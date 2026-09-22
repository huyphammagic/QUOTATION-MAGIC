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
  | 'RATE_REVIEW'
  | 'OPPORTUNITY'
  | 'CUSTOM';

export type DeadlineType = 
  // Quotation
  | 'QUOTATION_VALID_UNTIL'
  | 'QUOTATION_EXPIRY'
  | 'QUOTATION_FOLLOWUP_DUE'
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
  | 'UPCOMING'     // In future (> 24h)
  | 'DUE_SOON'     // Within next 24 hours
  | 'DUE_TODAY'    // Same calendar day
  | 'OVERDUE'      // Past due date without completion
  | 'COMPLETED'    // Action executed or actual event occurred
  | 'CANCELLED'    // Voided / irrelevant
  | 'SNOOZED';     // Temporarily snoozed until a later timestamp

export type DeadlinePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DeadlineSource = 
  | 'AUTO_QUOTATION' 
  | 'AUTO_SHIPMENT' 
  | 'AUTO_TASK' 
  | 'AUTO_MILESTONE' 
  | 'AUTO_CRM'
  | 'AUTO_RATE_REVIEW'
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
  
  relatedData?: Record<string, any>;
}

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
