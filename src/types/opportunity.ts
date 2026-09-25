export type BusinessOpportunityType =
  | 'CUSTOMER_GROWTH'
  | 'CUSTOMER_RETENTION'
  | 'RE_QUOTATION'
  | 'RATE_RENEWAL'
  | 'CROSS_SERVICE'
  | 'LANE_OPPORTUNITY'
  | 'QUOTATION_CONVERSION'
  | 'CONTRACT_RENEWAL'
  | 'SHIPMENT_FOLLOW_UP'
  | 'REACTIVATION';

export type OpportunityStatus =
  | 'NEW'
  | 'REVIEWING'
  | 'ACTION_REQUIRED'
  | 'IN_PROGRESS'
  | 'CONVERTED'
  | 'DISMISSED'
  | 'SNOOZED'
  | 'EXPIRED'
  | 'CLOSED';

export type OpportunityPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type DataSufficiencyLevel = 'SUFFICIENT_DATA' | 'LIMITED_DATA' | 'INSUFFICIENT_DATA';

export type OpportunitySourceEntityType =
  | 'QUOTATION'
  | 'SHIPMENT'
  | 'RATE'
  | 'CONTRACT'
  | 'CUSTOMER'
  | 'RATE_TASK'
  | 'FOLLOW_UP';

export interface BusinessOpportunityActionPayload {
  quoteId?: string;
  quoteNumber?: string;
  contractId?: string;
  contractNumber?: string;
  shipmentId?: string;
  shipmentNumber?: string;
  rateId?: string;
  taskId?: string;
  followUpId?: string;
  lane?: string;
  origin?: string;
  destination?: string;
  serviceMode?: string;
  suggestedIncoterm?: string;
  suggestedSellingPrice?: number;
  currency?: string;
  customerEmail?: string;
  customerPhone?: string;
  carrier?: string;
  expiryDate?: string;
}

export interface BusinessOpportunity {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  title: string;
  opportunityType: BusinessOpportunityType;
  sourceEntityType: OpportunitySourceEntityType;
  sourceEntityId: string;
  sourceEntityNumber?: string;

  detectedAt: string; // ISO
  reason: string; // WHY was this detected?
  supportingData: string; // Real factual proof points (numbers, dates, lanes, validities)
  suggestedAction: string; // Concrete recommended next step

  ownerId: string;
  ownerName: string;
  priority: OpportunityPriority;
  status: OpportunityStatus;

  dueDate?: string; // ISO
  confidenceLevel: DataSufficiencyLevel;
  dataSufficiencyReason?: string;

  lane?: string;
  origin?: string;
  destination?: string;
  serviceMode?: string;
  estimatedValue?: number;
  currency?: string;

  snoozedUntil?: string; // ISO
  dismissReason?: string;
  conversionNotes?: string;
  convertedEntityId?: string; // e.g. newly created quoteId or contractId

  actionPayload?: BusinessOpportunityActionPayload;
  idempotencyKey?: string; // companyId_customerId_oppType_sourceEntityId

  createdAt: string;
  updatedAt: string;
}

export interface OpportunityFilterOptions {
  search?: string;
  status?: OpportunityStatus | 'ALL';
  priority?: OpportunityPriority | 'ALL';
  type?: BusinessOpportunityType | 'ALL';
  timeframe?: 'ALL' | 'TODAY' | 'THIS_WEEK' | 'UPCOMING' | 'OVERDUE';
  customerId?: string;
  ownerId?: string;
  lane?: string;
  serviceMode?: string;
}

export interface OpportunityRadarMetrics {
  totalActive: number;
  newOpportunities: number;
  reviewing: number;
  actionRequired: number;
  inProgress: number;
  converted: number;
  dismissed: number;
  snoozed: number;
  criticalPriority: number;
  highPriority: number;
  normalPriority: number;
  lowPriority: number;
  byType: Record<BusinessOpportunityType, number>;
  bySufficiency: Record<DataSufficiencyLevel, number>;
}

export interface OpportunityAuditLog {
  id: string;
  companyId: string;
  opportunityId: string;
  action:
    | 'OPPORTUNITY_DETECTED'
    | 'STATUS_UPDATED'
    | 'ASSIGNED'
    | 'SNOOZED'
    | 'DISMISSED'
    | 'CONVERTED'
    | 'CLOSED'
    | 'ACTION_TRIGGERED';
  performedBy: string;
  performedByName: string;
  timestamp: string; // ISO
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  notes?: string;
}
