import { ContractStatus } from '../../types/contract';

export interface TransitionValidationResult {
  isValid: boolean;
  messageVi: string;
  messageEn: string;
}

/**
 * Validates lifecycle transition for Contracts
 * Permitted transitions:
 * DRAFT -> IN_REVIEW -> APPROVED -> ACTIVE -> EXPIRED
 * ACTIVE -> SUSPENDED -> ACTIVE
 * ACTIVE | IN_REVIEW | DRAFT -> CANCELLED
 * EXPIRED cannot directly transition back to ACTIVE without a new version or explicit renewal
 */
export function validateContractStatusTransition(
  currentStatus: ContractStatus,
  targetStatus: ContractStatus,
  expiryDate?: string
): TransitionValidationResult {
  if (currentStatus === targetStatus) {
    return {
      isValid: true,
      messageVi: 'Trạng thái không thay đổi.',
      messageEn: 'Status has not changed.',
    };
  }

  // Check date expiry constraint
  if (targetStatus === 'ACTIVE' && expiryDate) {
    const today = new Date().toISOString().slice(0, 10);
    if (expiryDate < today) {
      return {
        isValid: false,
        messageVi: `Không thể kích hoạt hợp đồng đã quá ngày hết hạn (${expiryDate}). Vui lòng tạo phiên bản mới hoặc gia hạn ngày hiệu lực.`,
        messageEn: `Cannot activate an expired contract (expired on ${expiryDate}). Please create a new version or extend validity.`,
      };
    }
  }

  switch (currentStatus) {
    case 'DRAFT':
      if (targetStatus === 'IN_REVIEW' || targetStatus === 'CANCELLED') {
        return { isValid: true, messageVi: 'Chuyển trạng thái hợp lệ.', messageEn: 'Valid transition.' };
      }
      break;

    case 'IN_REVIEW':
      if (targetStatus === 'APPROVED' || targetStatus === 'DRAFT' || targetStatus === 'CANCELLED') {
        return { isValid: true, messageVi: 'Chuyển trạng thái hợp lệ.', messageEn: 'Valid transition.' };
      }
      break;

    case 'APPROVED':
      if (targetStatus === 'ACTIVE' || targetStatus === 'CANCELLED' || targetStatus === 'IN_REVIEW') {
        return { isValid: true, messageVi: 'Chuyển trạng thái hợp lệ.', messageEn: 'Valid transition.' };
      }
      break;

    case 'ACTIVE':
      if (targetStatus === 'SUSPENDED' || targetStatus === 'CANCELLED' || targetStatus === 'EXPIRED') {
        return { isValid: true, messageVi: 'Chuyển trạng thái hợp lệ.', messageEn: 'Valid transition.' };
      }
      break;

    case 'SUSPENDED':
      if (targetStatus === 'ACTIVE' || targetStatus === 'CANCELLED' || targetStatus === 'EXPIRED') {
        return { isValid: true, messageVi: 'Chuyển trạng thái hợp lệ.', messageEn: 'Valid transition.' };
      }
      break;

    case 'EXPIRED':
      // Cannot transition directly from EXPIRED to ACTIVE; must create new version
      if (targetStatus === 'CANCELLED') {
        return { isValid: true, messageVi: 'Chuyển trạng thái hợp lệ.', messageEn: 'Valid transition.' };
      }
      return {
        isValid: false,
        messageVi: 'Hợp đồng đã hết hạn (EXPIRED) không thể kích hoạt trực tiếp. Hãy tạo phiên bản mới (New Version).',
        messageEn: 'Expired contract cannot be directly reactivated. Please create a new version.',
      };

    case 'CANCELLED':
      return {
        isValid: false,
        messageVi: 'Hợp đồng đã bị hủy (CANCELLED) không thể thay đổi trạng thái.',
        messageEn: 'Cancelled contract cannot change status.',
      };
  }

  return {
    isValid: false,
    messageVi: `Không cho phép chuyển trạng thái từ [${currentStatus}] sang [${targetStatus}].`,
    messageEn: `Cannot transition status from [${currentStatus}] to [${targetStatus}].`,
  };
}

/**
 * Checks if a contract is expired based on current date
 */
export function isContractExpired(expiryDate: string): boolean {
  if (!expiryDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return expiryDate < today;
}
