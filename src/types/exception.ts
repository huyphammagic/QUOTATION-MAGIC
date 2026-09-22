/**
 * Logistics Exception Management Engine - Phase 42 Types
 * Centralized exception lifecycle, severities, sources, audit timeline, and idempotency
 */

export type ExceptionStatus = 
  | 'OPEN' 
  | 'ACKNOWLEDGED' 
  | 'IN_PROGRESS' 
  | 'RESOLVED' 
  | 'DISMISSED' 
  | 'CANCELLED';

export type ExceptionSeverity = 
  | 'LOW' 
  | 'MEDIUM' 
  | 'HIGH' 
  | 'CRITICAL';

export type ExceptionSourceType = 
  | 'MILESTONE' 
  | 'TASK' 
  | 'DOCUMENT' 
  | 'SHIPMENT' 
  | 'CUSTOMS' 
  | 'BOOKING' 
  | 'CONTAINER' 
  | 'CUSTOMER' 
  | 'SUPPLIER' 
  | 'CARRIER' 
  | 'OPERATIONAL' 
  | 'SYSTEM';

export type ExceptionType =
  | 'OVERDUE_MILESTONE'
  | 'OVERDUE_TASK'
  | 'MISSING_REQUIRED_DOCUMENT'
  | 'SI_CUTOFF_APPROACHING'
  | 'CY_CUTOFF_MISSED'
  | 'CUSTOMS_HOLD'
  | 'CARRIER_DELAY'
  | 'DEMURRAGE_DETENTION_RISK'
  | 'UNASSIGNED_OPERATOR'
  | 'BOOKING_REJECTED'
  | 'CARGO_DISCREPANCY'
  | 'CUSTOMER_ESCALATION'
  | 'SUPPLIER_DELAY'
  | 'DATA_INTEGRITY_ISSUE'
  | 'OTHER_OPERATIONAL_ISSUE';

export type ExceptionTimelineAction =
  | 'CREATED'
  | 'ASSIGNED'
  | 'ACKNOWLEDGED'
  | 'STATUS_CHANGED'
  | 'SEVERITY_CHANGED'
  | 'NOTE_ADDED'
  | 'RESOLVED'
  | 'REOPENED'
  | 'DISMISSED'
  | 'DUE_DATE_CHANGED';

export interface ExceptionTimelineEvent {
  id: string;
  exceptionId: string;
  action: ExceptionTimelineAction;
  timestamp: string;
  performedBy: string;
  performedByName?: string;
  previousValue?: any;
  newValue?: any;
  note?: string;
}

export interface ShipmentException {
  id: string;
  companyId: string;
  shipmentId: string;
  shipmentNumber: string;
  quotationId?: string;
  quotationNumber?: string;
  customerId?: string;
  customerName?: string;
  sourceType: ExceptionSourceType;
  sourceId?: string;
  exceptionType: ExceptionType;
  idempotencyKey?: string; // e.g. `${shipmentId}_${exceptionType}_${sourceId || 'root'}`
  title: string;
  description: string;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  assignedTo?: string;
  assignedToName?: string;
  dueAt?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  version: number;
  timeline: ExceptionTimelineEvent[];
  relatedData?: Record<string, any>;
}

export interface ExceptionFilterOptions {
  status?: ExceptionStatus | 'ALL' | 'ACTIVE'; // ACTIVE = OPEN | ACKNOWLEDGED | IN_PROGRESS
  severity?: ExceptionSeverity | 'ALL';
  sourceType?: ExceptionSourceType | 'ALL';
  assignedTo?: string;
  shipmentId?: string;
  searchQuery?: string;
  pageLimit?: number;
}

/**
 * Transition validation rules for Exception lifecycle
 */
export function isValidExceptionTransition(current: ExceptionStatus, next: ExceptionStatus): boolean {
  if (current === next) return true;

  switch (current) {
    case 'OPEN':
      return next === 'ACKNOWLEDGED' || next === 'IN_PROGRESS' || next === 'DISMISSED' || next === 'CANCELLED';
    case 'ACKNOWLEDGED':
      return next === 'IN_PROGRESS' || next === 'RESOLVED' || next === 'DISMISSED' || next === 'CANCELLED';
    case 'IN_PROGRESS':
      return next === 'RESOLVED' || next === 'ACKNOWLEDGED' || next === 'DISMISSED' || next === 'CANCELLED';
    case 'RESOLVED':
    case 'DISMISSED':
    case 'CANCELLED':
      // Can only be reopened back to OPEN with explicit action and audit log
      return next === 'OPEN';
    default:
      return false;
  }
}
