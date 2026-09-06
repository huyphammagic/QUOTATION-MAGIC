import { ContractItem } from '../../types/contract';

export type ExpiryUrgency = 'EXPIRED' | 'EXPIRING_7' | 'EXPIRING_14' | 'EXPIRING_30' | 'ACTIVE_SAFE';

export interface ExpiryAnalysis {
  urgency: ExpiryUrgency;
  daysRemaining: number;
  labelVi: string;
  labelEn: string;
  badgeColor: string;
}

/**
 * Evaluates contract expiry status without persistent background polling
 */
export function analyzeContractExpiry(expiryDateStr: string): ExpiryAnalysis {
  if (!expiryDateStr) {
    return {
      urgency: 'ACTIVE_SAFE',
      daysRemaining: 999,
      labelVi: 'Còn hạn',
      labelEn: 'Active',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(expiryDateStr);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      urgency: 'EXPIRED',
      daysRemaining: diffDays,
      labelVi: `Đã hết hạn (${Math.abs(diffDays)} ngày trước)`,
      labelEn: `Expired (${Math.abs(diffDays)} days ago)`,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }

  if (diffDays <= 7) {
    return {
      urgency: 'EXPIRING_7',
      daysRemaining: diffDays,
      labelVi: `Hết hạn trong ${diffDays} ngày (Khẩn cấp)`,
      labelEn: `Expires in ${diffDays} days (Urgent)`,
      badgeColor: 'bg-red-50 text-red-700 border-red-300 font-bold animate-pulse',
    };
  }

  if (diffDays <= 14) {
    return {
      urgency: 'EXPIRING_14',
      daysRemaining: diffDays,
      labelVi: `Hết hạn trong ${diffDays} ngày`,
      labelEn: `Expires in ${diffDays} days`,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
    };
  }

  if (diffDays <= 30) {
    return {
      urgency: 'EXPIRING_30',
      daysRemaining: diffDays,
      labelVi: `Hết hạn trong ${diffDays} ngày`,
      labelEn: `Expires in ${diffDays} days`,
      badgeColor: 'bg-yellow-50 text-yellow-800 border-yellow-300',
    };
  }

  return {
    urgency: 'ACTIVE_SAFE',
    daysRemaining: diffDays,
    labelVi: `Còn hiệu lực (${diffDays} ngày)`,
    labelEn: `Active (${diffDays} days)`,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
}

/**
 * Filters contracts by expiry urgency
 */
export function filterContractsByUrgency(
  contracts: ContractItem[],
  urgency: 'ALL' | 'EXPIRED' | 'EXPIRING_SOON' | 'ACTIVE'
): ContractItem[] {
  if (urgency === 'ALL') return contracts;

  return contracts.filter(c => {
    const analysis = analyzeContractExpiry(c.expiryDate);
    if (urgency === 'EXPIRED') {
      return analysis.urgency === 'EXPIRED';
    }
    if (urgency === 'EXPIRING_SOON') {
      return analysis.urgency === 'EXPIRING_7' || analysis.urgency === 'EXPIRING_14' || analysis.urgency === 'EXPIRING_30';
    }
    if (urgency === 'ACTIVE') {
      return analysis.urgency === 'ACTIVE_SAFE';
    }
    return true;
  });
}
