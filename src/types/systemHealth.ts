/**
 * Phase 27: System Health + Data Integrity + Sync Recovery Engine Types
 * Single Source of Truth: Firebase Firestore & Storage
 */

export interface ListenerHealthRecord {
  id: string;
  name: string;
  collectionName: string;
  status: 'CONNECTED' | 'CONNECTING' | 'ERROR' | 'DISCONNECTED';
  lastEventAt: Date | null;
  reconnectAttempts: number;
  lastErrorMessage?: string;
  itemCount?: number;
}

export type TechnicalSystemStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'SYNC_PENDING'
  | 'SYNC_FAILED'
  | 'STORAGE_PENDING'
  | 'STORAGE_FAILED'
  | 'CONFLICT'
  | 'DATA_INTEGRITY_WARNING'
  | 'DATA_INTEGRITY_ERROR'
  | 'AUTH_ERROR'
  | 'PERMISSION_ERROR'
  | 'NETWORK_ERROR';

export type BusinessSaveState =
  | 'UNSAVED'
  | 'SAVING'
  | 'SAVED'
  | 'SAVE_FAILED'
  | 'CONFLICT'
  | 'RETRYING';

export type IssueStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'IGNORED';

export type IssueSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type IntegrityModuleType =
  | 'QUOTATION'
  | 'CUSTOMER'
  | 'MASTER_DATA'
  | 'RATE'
  | 'CONTRACT'
  | 'STORAGE'
  | 'PRICING'
  | 'AUTH'
  | 'SYSTEM';

export type IntegrityIssueType =
  | 'MISSING_REFERENCE'
  | 'INVALID_REFERENCE'
  | 'INACTIVE_MASTER_USED'
  | 'DUPLICATE_RECORD'
  | 'INVALID_STATUS'
  | 'INVALID_DATE'
  | 'INVALID_CURRENCY'
  | 'INVALID_RATE'
  | 'DELETED_DATA_REF'
  | 'ORPHAN_DATA'
  | 'COMPANY_ISOLATION_MISMATCH'
  | 'VERSION_CONFLICT'
  | 'STORAGE_MISSING'
  | 'STORAGE_ORPHAN'
  | 'STORAGE_INVALID'
  | 'CONCURRENCY_CONFLICT'
  | 'PRICE_CALCULATION_DRIFT';

export interface IntegrityIssueRecord {
  id: string;
  issueId: string;
  companyId: string;
  module: IntegrityModuleType;
  entityType: string;
  entityId: string;
  issueType: IntegrityIssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  recommendation: string;
  detectedAt: string;
  lastChecked: string;
  status: IssueStatus;
  retryCount: number;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface StorageHealthItem {
  fileId: string;
  companyId: string;
  entityType: 'QUOTATION_PDF' | 'CONTRACT_DOCUMENT' | 'COMPANY_LOGO' | 'ATTACHMENT';
  entityId: string;
  fileName: string;
  storagePath: string;
  downloadUrl: string;
  status: 'HEALTHY' | 'ORPHAN' | 'SUSPICIOUS' | 'MISSING' | 'INVALID';
  fileSizeBytes?: number;
  lastVerifiedAt: string;
  errorMessage?: string;
}

export interface PendingSyncOperation {
  opId: string;
  companyId: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPLOAD' | 'APPROVE' | 'DISPATCH';
  timestamp: number;
  attemptCount: number;
  maxRetries: number;
  status: 'PENDING' | 'RETRYING' | 'FAILED' | 'SUCCEEDED';
  lastError?: string;
  version?: number;
  payload?: any;
}

export interface SystemHealthAuditEntry {
  id?: string;
  userId: string;
  userName?: string;
  companyId: string;
  entityType: string;
  entityId: string;
  action: 
    | 'SAVE_FAILED' 
    | 'SAFE_RETRY' 
    | 'CONFLICT_DETECTED' 
    | 'CONFLICT_RESOLVED' 
    | 'INTEGRITY_ISSUE_DETECTED' 
    | 'INTEGRITY_ISSUE_RESOLVED' 
    | 'STORAGE_FAILURE' 
    | 'STORAGE_RECOVERY' 
    | 'SNAPSHOT_PRESERVED';
  timestamp: string;
  result: 'SUCCESS' | 'FAILURE' | 'WARNING';
  correlationId?: string;
  details?: string;
  metadata?: Record<string, any>;
}

export interface SystemHealthOverview {
  technicalStatus: TechnicalSystemStatus;
  saveState: BusinessSaveState;
  isOnline: boolean;
  firestoreConnected: boolean;
  storageConnected: boolean;
  authValid: boolean;
  lastSuccessfulSync: string | null;
  lastFailedSync: string | null;
  activeListenersCount: number;
  pendingOperationsCount: number;
  failedOperationsCount: number;
  activeConflictsCount: number;
  openIssuesCount: number;
  criticalIssuesCount: number;
}
