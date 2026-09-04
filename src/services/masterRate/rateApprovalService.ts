import { RateMasterItem, RateApprovalRequest, RateHistoryItem } from '../../types/masterRate';
import { 
  saveRateMasterToFirestore, 
  saveRateApprovalToFirestore, 
  getRateApprovalsFromFirestore 
} from '../firebase/firestoreService';

const LOCAL_APPROVALS_KEY = 'LOGIQUOTE_RATE_APPROVALS_V1';

export function getLocalApprovals(): RateApprovalRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_APPROVALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Error reading local approvals:', err);
    return [];
  }
}

export function saveLocalApprovals(items: RateApprovalRequest[]): void {
  try {
    localStorage.setItem(LOCAL_APPROVALS_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('Error saving local approvals:', err);
  }
}

/**
 * Load all approval requests
 */
export async function loadApprovalRequests(): Promise<RateApprovalRequest[]> {
  try {
    const remote = await getRateApprovalsFromFirestore();
    if (remote && remote.length > 0) {
      saveLocalApprovals(remote);
      return remote;
    }
  } catch (err) {
    console.warn('Fallback to local approvals:', err);
  }
  return getLocalApprovals();
}

/**
 * Submits a Rate Master item for Approval (Transitions DRAFT -> PENDING_APPROVAL)
 */
export async function submitRateForApproval(
  rate: RateMasterItem,
  actor: string = 'pricing_specialist',
  remarks?: string
): Promise<{ updatedRate: RateMasterItem; approvalRequest: RateApprovalRequest }> {
  const approvalId = `appr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  const approvalRequest: RateApprovalRequest = {
    id: approvalId,
    companyId: rate.companyId,
    rateId: rate.id,
    rateCode: rate.rateCode,
    rateName: rate.rateName,
    version: rate.version,
    rateType: rate.rateType,
    carrier: rate.carrier,
    origin: rate.origin,
    destination: rate.destination,
    costAmount: rate.costAmount,
    costCurrency: rate.costCurrency,
    sellingAmount: rate.sellingAmount,
    sellingCurrency: rate.sellingCurrency,
    effectiveFrom: rate.effectiveFrom,
    effectiveTo: rate.effectiveTo,
    status: 'PENDING',
    submittedBy: actor,
    submittedAt: new Date().toISOString(),
    remarks,
  };

  const updatedRate: RateMasterItem = {
    ...rate,
    status: 'PENDING_APPROVAL',
    approvalId,
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
  };

  // Save approval locally & remote
  const approvals = getLocalApprovals();
  saveLocalApprovals([approvalRequest, ...approvals.filter(a => a.id !== approvalId)]);
  await saveRateApprovalToFirestore(approvalRequest);

  // Update rate in Firestore & local
  await saveRateMasterToFirestore(updatedRate, actor);

  return { updatedRate, approvalRequest };
}

/**
 * Approves a Rate Master item (Transitions PENDING_APPROVAL -> APPROVED / ACTIVE)
 */
export async function approveRate(
  rate: RateMasterItem,
  approvalId: string,
  actor: string = 'pricing_manager',
  remarks?: string
): Promise<{ updatedRate: RateMasterItem; updatedApproval: RateApprovalRequest }> {
  const today = new Date().toISOString().slice(0, 10);
  const isCurrentlyEffective = rate.effectiveFrom <= today && rate.effectiveTo >= today;
  const newStatus = isCurrentlyEffective ? 'ACTIVE' : 'APPROVED';

  const updatedRate: RateMasterItem = {
    ...rate,
    status: newStatus,
    approvedBy: actor,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
    rejectionReason: undefined,
  };

  const approvals = getLocalApprovals();
  const existingAppr = approvals.find(a => a.id === approvalId);
  const updatedApproval: RateApprovalRequest = existingAppr 
    ? {
        ...existingAppr,
        status: 'APPROVED',
        reviewedBy: actor,
        reviewedAt: new Date().toISOString(),
        remarks: remarks || existingAppr.remarks,
      }
    : {
        id: approvalId,
        rateId: rate.id,
        rateCode: rate.rateCode,
        rateName: rate.rateName,
        version: rate.version,
        rateType: rate.rateType,
        carrier: rate.carrier,
        origin: rate.origin,
        destination: rate.destination,
        costAmount: rate.costAmount,
        costCurrency: rate.costCurrency,
        sellingAmount: rate.sellingAmount,
        sellingCurrency: rate.sellingCurrency,
        effectiveFrom: rate.effectiveFrom,
        effectiveTo: rate.effectiveTo,
        status: 'APPROVED',
        submittedBy: rate.createdBy || 'unknown',
        submittedAt: rate.createdAt,
        reviewedBy: actor,
        reviewedAt: new Date().toISOString(),
        remarks,
      };

  saveLocalApprovals(approvals.map(a => a.id === approvalId ? updatedApproval : a));
  await saveRateApprovalToFirestore(updatedApproval);
  await saveRateMasterToFirestore(updatedRate, actor);

  return { updatedRate, updatedApproval };
}

/**
 * Rejects a Rate Master item with mandatory reason (Transitions PENDING_APPROVAL -> DRAFT)
 */
export async function rejectRate(
  rate: RateMasterItem,
  approvalId: string,
  reason: string,
  actor: string = 'pricing_manager'
): Promise<{ updatedRate: RateMasterItem; updatedApproval: RateApprovalRequest }> {
  if (!reason || reason.trim() === '') {
    throw new Error('Lý do từ chối (Rejection Reason) là bắt buộc.');
  }

  const updatedRate: RateMasterItem = {
    ...rate,
    status: 'DRAFT',
    rejectionReason: reason.trim(),
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
  };

  const approvals = getLocalApprovals();
  const existingAppr = approvals.find(a => a.id === approvalId);
  const updatedApproval: RateApprovalRequest = existingAppr
    ? {
        ...existingAppr,
        status: 'REJECTED',
        reviewedBy: actor,
        reviewedAt: new Date().toISOString(),
        rejectionReason: reason.trim(),
      }
    : {
        id: approvalId,
        rateId: rate.id,
        rateCode: rate.rateCode,
        rateName: rate.rateName,
        version: rate.version,
        rateType: rate.rateType,
        carrier: rate.carrier,
        origin: rate.origin,
        destination: rate.destination,
        costAmount: rate.costAmount,
        costCurrency: rate.costCurrency,
        sellingAmount: rate.sellingAmount,
        sellingCurrency: rate.sellingCurrency,
        effectiveFrom: rate.effectiveFrom,
        effectiveTo: rate.effectiveTo,
        status: 'REJECTED',
        submittedBy: rate.createdBy || 'unknown',
        submittedAt: rate.createdAt,
        reviewedBy: actor,
        reviewedAt: new Date().toISOString(),
        rejectionReason: reason.trim(),
      };

  saveLocalApprovals(approvals.map(a => a.id === approvalId ? updatedApproval : a));
  await saveRateApprovalToFirestore(updatedApproval);
  await saveRateMasterToFirestore(updatedRate, actor);

  return { updatedRate, updatedApproval };
}

// Convenient export aliases
export const loadRateApprovals = loadApprovalRequests;
export const submitForApproval = async (rate: RateMasterItem, actor?: string, remarks?: string) => {
  const result = await submitRateForApproval(rate, actor, remarks);
  return result.approvalRequest;
};
export const approveRateRequest = async (rate: RateMasterItem, approvalId: string, actor?: string, remarks?: string) => {
  const result = await approveRate(rate, approvalId, actor, remarks);
  return result.updatedRate;
};
export const rejectRateRequest = async (rate: RateMasterItem, approvalId: string, reason: string, actor?: string) => {
  const result = await rejectRate(rate, approvalId, reason, actor);
  return result.updatedRate;
};
