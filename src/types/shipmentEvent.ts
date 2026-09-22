/**
 * Phase 43: Logistics Event & Milestone Intelligence Engine
 * Type definitions for Events, Milestone Intelligence, Audit and External Integrations
 * Strictly Event-Driven, Append-Only, Idempotent, Multi-Company Scoped
 */

export type ShipmentEventSource = 
  | 'USER' 
  | 'SYSTEM' 
  | 'CARRIER' 
  | 'AIRLINE' 
  | 'TRUCKER' 
  | 'CUSTOMS' 
  | 'CUSTOMER' 
  | 'SUPPLIER' 
  | 'INTEGRATION';

export type ShipmentEventStatus = 
  | 'ACTIVE' 
  | 'CORRECTED' 
  | 'SUPERSEDED' 
  | 'CANCELLED';

export type EventReferenceType = 
  | 'BL' 
  | 'AWB' 
  | 'BOOKING' 
  | 'CONTAINER' 
  | 'CUSTOMS_DECLARATION' 
  | 'TRUCK_PLATE' 
  | 'VESSEL' 
  | 'INVOICE' 
  | 'OTHER';

export type EtaConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCONFIRMED';

export type OperationalFreshness = 'FRESH' | 'STALE' | 'UNKNOWN';

export type LogisticsEventType =
  // Booking & Preparation
  | 'BOOKING_REQUESTED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_AMENDED'
  | 'SI_SUBMITTED'
  | 'VGM_SUBMITTED'
  // Cargo & Packaging
  | 'CARGO_READY'
  | 'CARGO_RECEIVED_TERMINAL'
  | 'CONTAINER_RELEASED_EMPTY'
  | 'CONTAINER_STUFFED'
  | 'CONTAINER_GATE_IN_POL'
  | 'CONTAINER_SEALED'
  // Customs
  | 'CUSTOMS_DOCS_RECEIVED'
  | 'CUSTOMS_DECLARATION_SUBMITTED'
  | 'CUSTOMS_CHANNEL_ASSIGNED'
  | 'CUSTOMS_INSPECTED'
  | 'CUSTOMS_DUTY_PAID'
  | 'CUSTOMS_CLEARED'
  | 'CUSTOMS_RELEASED'
  // Ocean / Air Transport
  | 'LOADED_ON_BOARD'
  | 'VESSEL_DEPARTED'
  | 'FLIGHT_DEPARTED'
  | 'TRANSSHIPMENT_ARRIVED'
  | 'TRANSSHIPMENT_DEPARTED'
  | 'VESSEL_ARRIVED'
  | 'FLIGHT_ARRIVED'
  | 'CONTAINER_DISCHARGED'
  // Trucking & Inland Delivery
  | 'TRUCKING_DISPATCHED'
  | 'TRUCK_ARRIVED_PICKUP'
  | 'TRUCK_LOADED'
  | 'TRUCK_IN_TRANSIT'
  | 'TRUCK_ARRIVED_DESTINATION'
  | 'CARGO_UNLOADED'
  | 'DELIVERED_CONSIGNEE'
  | 'POD_SIGNED'
  | 'CONTAINER_EMPTY_RETURNED'
  // Operational Exceptions & General
  | 'SHIPMENT_DELAY_REPORTED'
  | 'EXCEPTION_RAISED'
  | 'EXCEPTION_RESOLVED'
  | 'OPERATIONAL_NOTE_ADDED'
  | 'DOCUMENT_UPLOADED'
  | 'MANUAL_STATUS_CORRECTION'
  | 'CUSTOM_EVENT';

export interface ShipmentEventRecord {
  id: string;
  companyId: string;
  shipmentId: string;
  shipmentNumber: string;
  eventType: LogisticsEventType;
  eventSource: ShipmentEventSource;
  eventTime: string; // ISO 8601 when event physically occurred
  recordedAt: string; // ISO 8601 when recorded in database
  location: string;
  referenceType?: EventReferenceType;
  referenceId?: string;
  titleVi: string;
  titleEn: string;
  description?: string;
  notes?: string;
  attachments?: Array<{
    name: string;
    url: string;
    size?: number;
    mimeType?: string;
  }>;
  createdBy: string;
  userId?: string;
  status: ShipmentEventStatus;
  
  // Correction / Cancellation audit
  correctionReason?: string;
  correctedBy?: string;
  correctedAt?: string;
  supersededByEventId?: string;
  cancelledReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  
  // Milestone & Container triggers
  affectsMilestoneCode?: string;
  affectsContainerId?: string;
  
  // Idempotency & Versioning
  idempotencyKey: string;
  version: number;
  metadata?: Record<string, any>;
}

export interface CreateShipmentEventPayload {
  companyId: string;
  shipmentId: string;
  shipmentNumber: string;
  eventType: LogisticsEventType;
  eventSource: ShipmentEventSource;
  eventTime: string;
  location: string;
  referenceType?: EventReferenceType;
  referenceId?: string;
  titleVi?: string;
  titleEn?: string;
  description?: string;
  notes?: string;
  attachments?: Array<{
    name: string;
    url: string;
    size?: number;
    mimeType?: string;
  }>;
  affectsMilestoneCode?: string;
  affectsContainerId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface CorrectShipmentEventPayload {
  reason: string;
  eventTime?: string;
  location?: string;
  referenceType?: EventReferenceType;
  referenceId?: string;
  description?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CancelShipmentEventPayload {
  reason: string;
}

export interface MilestoneTimelineItem {
  id: string;
  milestoneCode: string;
  titleVi: string;
  titleEn: string;
  sequence: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'DELAYED';
  plannedDate?: string;
  estimatedDate?: string;
  actualDate?: string;
  location?: string;
  isOverdue: boolean;
  hasConfirmedActual: boolean;
  matchedEvent?: ShipmentEventRecord;
  notes?: string;
}

export interface EventTypeDefinition {
  type: LogisticsEventType;
  category: 'PREPARATION' | 'CARGO' | 'CUSTOMS' | 'MAIN_CARRIAGE' | 'DELIVERY' | 'OPERATIONAL';
  titleVi: string;
  titleEn: string;
  defaultMilestoneCode?: string;
  color: string;
  iconName: string;
}
