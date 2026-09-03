import { QuoteCurrency } from './logistics';

export type CommunicationType = 
  | 'EMAIL_QUOTATION'
  | 'SECURE_LINK'
  | 'FOLLOW_UP_REMINDER'
  | 'REVISION_NOTICE'
  | 'STATUS_NOTIFICATION';

export type EmailCommunicationStatus = 
  | 'DRAFT'
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'BOUNCED'
  | 'FAILED'
  | 'CANCELLED';

export type SecureLinkStatus = 
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REVOKED'
  | 'MAX_VIEWS_REACHED'
  | 'ARCHIVED';

export type CustomerResponseType = 
  | 'NO_RESPONSE'
  | 'VIEWED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'REVISION_REQUESTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type FollowUpStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type FollowUpPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type EmailTemplateType = 
  | 'QUOTATION_SEND'
  | 'QUOTATION_FOLLOW_UP'
  | 'QUOTATION_ACCEPTED'
  | 'QUOTATION_REJECTED'
  | 'QUOTATION_EXPIRED'
  | 'QUOTATION_REMINDER';

export type CommunicationLanguage = 'vi' | 'en';

export interface EmailAttachmentSnapshot {
  documentId: string;
  fileName: string;
  storagePath: string;
  downloadUrl?: string;
  revision: number;
  documentType: 'CUSTOMER_QUOTATION' | 'INTERNAL_QUOTATION' | 'CONFIRMATION_NOTICE';
  language: string;
  fileSizeBytes?: number;
}

export interface QuotationCommunication {
  id: string;
  companyId: string;
  quotationId: string;
  quotationNumber: string;
  documentId: string;
  revision: number;
  communicationType: CommunicationType;
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodySnapshot: string;
  attachmentIds: string[];
  attachmentSnapshot: EmailAttachmentSnapshot[];
  secureLinkId?: string;
  secureLinkUrl?: string;
  language: CommunicationLanguage;
  status: EmailCommunicationStatus;
  sentBy: string;
  sentByName?: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  failedAt?: string;
  failureReason?: string;
  templateId?: string;
  templateVersion?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationSecureLink {
  id: string;
  companyId: string;
  quotationId: string;
  quotationNumber: string;
  revision: number;
  documentId: string;
  tokenHash: string;
  tokenPrefix: string;
  token?: string; // Only available immediately upon creation, never stored plain
  expiresAt: string;
  status: SecureLinkStatus;
  maxViews?: number;
  viewCount: number;
  firstViewedAt?: string;
  lastViewedAt?: string;
  customerName: string;
  customerEmail: string;
  language: CommunicationLanguage;
  createdBy: string;
  createdAt: string;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
}

export interface QuotationCustomerResponse {
  id: string;
  companyId: string;
  quotationId: string;
  quotationNumber: string;
  documentId: string;
  revision: number;
  linkId: string;
  responseType: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED';
  customerName: string;
  customerEmail: string;
  respondedAt: string;
  rejectionReason?: string;
  revisionMessage?: string;
  notes?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface QuotationFollowUp {
  id: string;
  companyId: string;
  quotationId: string;
  quotationNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  followUpDate: string; // YYYY-MM-DD or ISO
  priority: FollowUpPriority;
  note: string;
  assignedTo: string;
  assignedToName: string;
  status: FollowUpStatus;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  companyId: string;
  name: string;
  code: string;
  type: EmailTemplateType;
  language: CommunicationLanguage;
  subject: string;
  body: string;
  variables: string[];
  active: boolean;
  version: number;
  isDefault?: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationJob {
  id: string;
  companyId: string;
  quotationId: string;
  communicationId: string;
  type: 'SEND_EMAIL' | 'SEND_WEBHOOK';
  payload: Record<string, any>;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  retryCount: number;
  maxRetries: number;
  error?: string;
  createdAt: string;
  processedAt?: string;
}

export type CommunicationAuditAction = 
  | 'QUOTATION_SEND_STARTED'
  | 'QUOTATION_SENT'
  | 'QUOTATION_SEND_FAILED'
  | 'QUOTATION_EMAIL_DELIVERED'
  | 'QUOTATION_EMAIL_OPENED'
  | 'QUOTATION_LINK_CREATED'
  | 'QUOTATION_LINK_VIEWED'
  | 'QUOTATION_LINK_REVOKED'
  | 'QUOTATION_ACCEPTED'
  | 'QUOTATION_REJECTED'
  | 'QUOTATION_REVISION_REQUESTED'
  | 'FOLLOW_UP_CREATED'
  | 'FOLLOW_UP_COMPLETED';

export interface QuotationTimelineEvent {
  id: string;
  type: 
    | 'CREATED' 
    | 'APPROVED' 
    | 'PDF_GENERATED' 
    | 'ISSUED' 
    | 'SENT' 
    | 'DELIVERED' 
    | 'OPENED' 
    | 'LINK_CLICKED' 
    | 'ACCEPTED' 
    | 'REJECTED' 
    | 'REVISION_REQUESTED' 
    | 'FOLLOW_UP';
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  badgeColor: string;
  details?: Record<string, any>;
}
